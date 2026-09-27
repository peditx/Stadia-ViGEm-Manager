/*
 * engine.c -- Stadia -> XInput engine.
 *
 * Threading model (deadlock avoidance):
 *  - refresh unlinks a victim under the devices exclusive lock, releases the
 *    lock, THEN destroys it (destroy joins the input thread). Never join
 *    while holding a devices lock.
 *  - stadia_destroy_callback only sets dead=TRUE under the exclusive lock.
 *  - the input thread stays valid while its callback runs: destroy waits for
 *    that thread, and free happens only after destroy returns.
 *  - rumble holds the devices shared lock while calling set_vibration
 *    (set_vibration only touches controller fields, no callbacks).
 *  - no C lock is ever held while entering a Rust mutex: on_state/on_add/
 *    on_remove are invoked after the C locks are released (on_state runs on
 *    the input thread and takes only the devices lock briefly for the store).
 */

#include "engine.h"

#include "hid.h"
#include "stadia.h"
#include "utils.h"

#include <shellapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <tchar.h>

#pragma comment(lib, "user32.lib")
#pragma comment(lib, "shell32.lib")

struct engine_device
{
    unsigned long long id;
    struct hid_device *src;
    struct stadia_controller *controller;
    BOOL is_bluetooth;
    volatile BOOL dead;
    DWORD prev_buttons;
    struct x360_report report;
};

struct macro_job
{
    struct engine_macro_step *steps;
    INT count;
};

static struct engine_host g_host;
static volatile LONG g_running = 0;

static struct engine_device *g_devices[ENGINE_MAX_DEVICES];
static INT g_device_count = 0;
static unsigned long long g_next_id = 1;
static SRWLOCK g_devices_lock = SRWLOCK_INIT;

static struct engine_bind g_binds[ENGINE_MAX_BINDS];
static INT g_bind_count = 0;
static BYTE g_dz_left = 10;
static BYTE g_dz_right = 10;
static BYTE g_dz_trigger = 5;
static BYTE g_vib_strength = 100;
static SRWLOCK g_config_lock = SRWLOCK_INIT;

static SRWLOCK g_inject_lock = SRWLOCK_INIT;
static USHORT g_inject_buttons = 0;
static BYTE g_inject_lt = 0;
static BYTE g_inject_rt = 0;

static SRWLOCK g_macro_lock = SRWLOCK_INIT;
static HANDLE g_macro_thread = NULL;
static volatile LONG g_macro_stop = 0;

/* ------------------------------------------------------------------ */
/* Shortcuts / app launch                                              */
/* ------------------------------------------------------------------ */

static void _send_key_combo(UINT modifiers, UINT vk)
{
    INPUT inputs[10];
    WORD mods[4];
    INT mod_count = 0;
    INT i, n = 0;

    if (modifiers & ENGINE_MOD_WIN) mods[mod_count++] = VK_LWIN;
    if (modifiers & ENGINE_MOD_CONTROL) mods[mod_count++] = VK_LCONTROL;
    if (modifiers & ENGINE_MOD_ALT) mods[mod_count++] = VK_LMENU;
    if (modifiers & ENGINE_MOD_SHIFT) mods[mod_count++] = VK_LSHIFT;

    memset(inputs, 0, sizeof(inputs));

    for (i = 0; i < mod_count; i++)
    {
        inputs[n].type = INPUT_KEYBOARD;
        inputs[n].ki.wVk = mods[i];
        n++;
    }
    inputs[n].type = INPUT_KEYBOARD;
    inputs[n].ki.wVk = (WORD)vk;
    n++;
    inputs[n].type = INPUT_KEYBOARD;
    inputs[n].ki.wVk = (WORD)vk;
    inputs[n].ki.dwFlags = KEYEVENTF_KEYUP;
    n++;
    for (i = mod_count - 1; i >= 0; i--)
    {
        inputs[n].type = INPUT_KEYBOARD;
        inputs[n].ki.wVk = mods[i];
        inputs[n].ki.dwFlags = KEYEVENTF_KEYUP;
        n++;
    }

    /* Injection is all-or-nothing; a partial batch leaves modifiers stuck. */
    if (SendInput((UINT)n, inputs, sizeof(INPUT)) != n)
    {
        fprintf(stderr, "[stadia] SendInput injected %u of %u events\n", (unsigned)SendInput(0, NULL, 0), (unsigned)n);
    }
}

static void _fire_bind(const struct engine_bind *bind)
{
    if (bind->mode == ENGINE_BIND_SHORTCUT)
    {
        if (bind->vk == 0)
        {
            fprintf(stderr, "[stadia] shortcut bind has no key (value did not parse)\n");
            return;
        }
        _send_key_combo(bind->modifiers, bind->vk);
    }
    else if (bind->mode == ENGINE_BIND_APP && bind->app[0] != L'\0')
    {
        HINSTANCE r = ShellExecuteW(NULL, L"open", bind->app, NULL, NULL, SW_SHOWNORMAL);
        if ((INT_PTR)r <= 32)
        {
            fprintf(stderr, "[stadia] ShellExecuteW failed (%d) for app bind\n", (int)(INT_PTR)r);
        }
    }
}

/* ------------------------------------------------------------------ */
/* Dead zones                                                          */
/* ------------------------------------------------------------------ */

static SHORT _stick_value(BYTE raw, BYTE dz_pct, BOOL invert)
{
    /* raw 0..255, 128 = center. dz_pct 0..90 */
    INT center = 128;
    INT v = (INT)raw - center;
    INT sign = v < 0 ? -1 : 1;
    INT mag = v < 0 ? -v : v;
    INT threshold = (center * (INT)dz_pct) / 100;

    if (mag <= threshold) return 0;

    /* rescale [threshold .. center] -> [1 .. center] */
    mag = ((mag - threshold) * center) / (center - threshold);
    if (mag > center) mag = center;
    if (invert) sign = -sign;

    return (SHORT)(sign * mag * 127 / center);
}

static BYTE _trigger_value(BYTE raw, BYTE dz_pct)
{
    INT threshold = (255 * (INT)dz_pct) / 100;
    if ((INT)raw <= threshold) return 0;
    return (BYTE)(((INT)raw - threshold) * 255 / (255 - threshold));
}

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

static void _with_inject(struct x360_report *r)
{
    AcquireSRWLockShared(&g_inject_lock);
    r->buttons |= g_inject_buttons;
    if (g_inject_lt > r->lt) r->lt = g_inject_lt;
    if (g_inject_rt > r->rt) r->rt = g_inject_rt;
    ReleaseSRWLockShared(&g_inject_lock);
}

static void _map_state(struct engine_device *dev, const struct stadia_state *state, struct x360_report *out)
{
    struct x360_report r;
    /* Edge-triggered binds are staged here and fired after the lock is
       released: ShellExecuteW can take hundreds of ms, and holding
       g_config_lock across it would stall every engine_set_* caller. */
    struct engine_bind pending[ENGINE_MAX_BINDS];
    INT pending_count = 0;
    DWORD pressed = state->buttons & ~dev->prev_buttons;
    BYTE lt_a, rt_a;
    INT i;

    memset(&r, 0, sizeof(r));

    AcquireSRWLockShared(&g_config_lock);
    for (i = 0; i < g_bind_count; i++)
    {
        const struct engine_bind *b = &g_binds[i];
        if (b->mode == ENGINE_BIND_XINPUT)
        {
            if ((state->buttons & b->stadia_mask) != 0)
            {
                r.buttons |= b->xusb;
                if (b->trigger == 1 && r.lt < 255) r.lt = 255;
                else if (b->trigger == 2 && r.rt < 255) r.rt = 255;
            }
        }
        else if ((pressed & b->stadia_mask) != 0)
        {
            /* Copy under the lock so set_binds cannot tear the struct. */
            if (pending_count < ENGINE_MAX_BINDS) pending[pending_count++] = *b;
        }
    }

    lt_a = _trigger_value(state->left_trigger, g_dz_trigger);
    rt_a = _trigger_value(state->right_trigger, g_dz_trigger);
    if (lt_a > r.lt) r.lt = lt_a;
    if (rt_a > r.rt) r.rt = rt_a;

    r.lx = _stick_value(state->left_stick_x, g_dz_left, FALSE);
    r.ly = _stick_value(state->left_stick_y, g_dz_left, TRUE);
    r.rx = _stick_value(state->right_stick_x, g_dz_right, FALSE);
    r.ry = _stick_value(state->right_stick_y, g_dz_right, TRUE);
    ReleaseSRWLockShared(&g_config_lock);

    for (i = 0; i < pending_count; i++) _fire_bind(&pending[i]);

    AcquireSRWLockExclusive(&g_devices_lock);
    dev->report = r;
    dev->prev_buttons = state->buttons;
    ReleaseSRWLockExclusive(&g_devices_lock);

    *out = r;
}

static void _push_all(void)
{
    struct
    {
        unsigned long long id;
        struct x360_report report;
    } snapshot[ENGINE_MAX_DEVICES];
    INT count = 0;
    INT i;

    AcquireSRWLockShared(&g_devices_lock);
    for (i = 0; i < g_device_count; i++)
    {
        if (g_devices[i]->dead) continue;
        snapshot[count].id = g_devices[i]->id;
        snapshot[count].report = g_devices[i]->report;
        count++;
    }
    ReleaseSRWLockShared(&g_devices_lock);

    for (i = 0; i < count; i++)
    {
        struct x360_report r = snapshot[i].report;
        _with_inject(&r);
        if (g_host.on_state != NULL) g_host.on_state(snapshot[i].id, &r);
    }
}

static void _stadia_update_cb(struct stadia_controller *controller, struct stadia_state *state)
{
    struct engine_device *dev = NULL;
    unsigned long long id = 0;
    struct x360_report report;
    INT i;

    AcquireSRWLockShared(&g_devices_lock);
    for (i = 0; i < g_device_count; i++)
    {
        if (g_devices[i]->controller == controller)
        {
            dev = g_devices[i];
            id = dev->id;
            break;
        }
    }
    ReleaseSRWLockShared(&g_devices_lock);

    if (dev == NULL || dev->dead) return;

    /* dev stays valid: destroy joins this very thread before free(). */
    _map_state(dev, state, &report);
    _with_inject(&report);
    if (g_host.on_state != NULL) g_host.on_state(id, &report);
}

static void _stadia_destroy_cb(struct stadia_controller *controller)
{
    INT i;
    AcquireSRWLockExclusive(&g_devices_lock);
    for (i = 0; i < g_device_count; i++)
    {
        if (g_devices[i]->controller == controller)
        {
            g_devices[i]->dead = TRUE;
            break;
        }
    }
    ReleaseSRWLockExclusive(&g_devices_lock);
}

/* ------------------------------------------------------------------ */
/* Device lifecycle                                                    */
/* ------------------------------------------------------------------ */

static struct hid_device *_open_with_fallbacks(LPTSTR path)
{
    struct hid_device *src = hid_open_device(path, TRUE, FALSE);
    if (src != NULL) return src;

    if (hid_reenable_device(path))
    {
        src = hid_open_device(path, TRUE, FALSE);
        if (src != NULL) return src;
    }
    return hid_open_device(path, TRUE, TRUE);
}

static BOOL _add_device(LPTSTR path)
{
    struct hid_device *src;
    struct stadia_controller *controller;
    struct engine_device *dev;

    if (g_device_count >= ENGINE_MAX_DEVICES) return FALSE;

    src = _open_with_fallbacks(path);
    if (src == NULL) return FALSE;

    controller = stadia_controller_create(src);
    if (controller == NULL)
    {
        hid_close_device(src);
        hid_free_device(src);
        return FALSE;
    }

    dev = (struct engine_device *)malloc(sizeof(*dev));
    if (dev == NULL)
    {
        stadia_controller_destroy(controller);
        hid_close_device(src);
        hid_free_device(src);
        return FALSE;
    }
    memset(dev, 0, sizeof(*dev));
    dev->src = src;
    dev->controller = controller;
    dev->is_bluetooth = controller->is_bluetooth;

    AcquireSRWLockExclusive(&g_devices_lock);
    if (g_device_count >= ENGINE_MAX_DEVICES)
    {
        ReleaseSRWLockExclusive(&g_devices_lock);
        free(dev);
        stadia_controller_destroy(controller);
        hid_close_device(src);
        hid_free_device(src);
        return FALSE;
    }
    dev->id = g_next_id++;
    g_devices[g_device_count++] = dev;
    ReleaseSRWLockExclusive(&g_devices_lock);

    if (g_host.on_add != NULL) g_host.on_add(dev->id, dev->is_bluetooth ? 1 : 0);
    return TRUE;
}

static void _free_victim(struct engine_device *victim)
{
    stadia_controller_destroy(victim->controller);
    hid_close_device(victim->src);
    hid_free_device(victim->src);
    if (g_host.on_remove != NULL) g_host.on_remove(victim->id);
    free(victim);
}

static void _remove_expired(const struct hid_device_info *list)
{
    for (;;)
    {
        struct engine_device *victim = NULL;
        INT i, j;

        AcquireSRWLockExclusive(&g_devices_lock);
        for (i = 0; i < g_device_count; i++)
        {
            struct engine_device *d = g_devices[i];
            const struct hid_device_info *cur = list;
            BOOL missing = d->dead;

            if (!missing && (d->src->path == NULL)) missing = TRUE;
            if (!missing)
            {
                missing = TRUE;
                for (; cur != NULL; cur = cur->next)
                {
                    if (cur->path != NULL && _tcscmp(d->src->path, cur->path) == 0)
                    {
                        missing = FALSE;
                        break;
                    }
                }
            }

            if (missing)
            {
                for (j = i; j < g_device_count - 1; j++) g_devices[j] = g_devices[j + 1];
                g_device_count--;
                victim = d;
                break;
            }
        }
        ReleaseSRWLockExclusive(&g_devices_lock);

        if (victim == NULL) break;
        _free_victim(victim);
    }
}

INT engine_refresh(void)
{
    struct hid_device_info *list;
    struct hid_device_info *cur;
    INT count = 0;

    if (InterlockedCompareExchange(&g_running, 1, 1) == 0) return 0;

    list = hid_enumerate(stadia_path_filters);
    _remove_expired(list);

    for (cur = list; cur != NULL; cur = cur->next)
    {
        BOOL found = FALSE;
        INT i;

        if (cur->path == NULL) continue;

        AcquireSRWLockShared(&g_devices_lock);
        for (i = 0; i < g_device_count; i++)
        {
            if (g_devices[i]->src->path != NULL && _tcscmp(g_devices[i]->src->path, cur->path) == 0)
            {
                found = TRUE;
                break;
            }
        }
        ReleaseSRWLockShared(&g_devices_lock);

        if (!found) _add_device(cur->path);
    }

    while (list != NULL)
    {
        struct hid_device_info *next = list->next;
        hid_free_device_info(list);
        list = next;
    }

    AcquireSRWLockShared(&g_devices_lock);
    count = g_device_count;
    ReleaseSRWLockShared(&g_devices_lock);
    return count;
}

INT engine_copy_devices(struct engine_device_info *out, INT max)
{
    INT n = 0, i;
    if (out == NULL || max <= 0) return 0;

    AcquireSRWLockShared(&g_devices_lock);
    for (i = 0; i < g_device_count && n < max; i++)
    {
        out[n].id = g_devices[i]->id;
        out[n].is_bluetooth = g_devices[i]->is_bluetooth ? 1 : 0;
        out[n].battery = (INT)g_devices[i]->controller->battery;
        n++;
    }
    ReleaseSRWLockShared(&g_devices_lock);
    return n;
}

/* ------------------------------------------------------------------ */
/* Config setters                                                      */
/* ------------------------------------------------------------------ */

void engine_set_binds(const struct engine_bind *binds, INT count)
{
    INT n;
    if (binds == NULL) count = 0;
    if (count < 0) count = 0;
    if (count > ENGINE_MAX_BINDS) count = ENGINE_MAX_BINDS;

    AcquireSRWLockExclusive(&g_config_lock);
    for (n = 0; n < count; n++) g_binds[n] = binds[n];
    g_bind_count = count;
    ReleaseSRWLockExclusive(&g_config_lock);
}

void engine_set_deadzones(BYTE left_pct, BYTE right_pct, BYTE trigger_pct)
{
    if (left_pct > 90) left_pct = 90;
    if (right_pct > 90) right_pct = 90;
    if (trigger_pct > 90) trigger_pct = 90;

    AcquireSRWLockExclusive(&g_config_lock);
    g_dz_left = left_pct;
    g_dz_right = right_pct;
    g_dz_trigger = trigger_pct;
    ReleaseSRWLockExclusive(&g_config_lock);
}

void engine_set_vibration_strength(BYTE strength_pct)
{
    if (strength_pct > 100) strength_pct = 100;
    AcquireSRWLockExclusive(&g_config_lock);
    g_vib_strength = strength_pct;
    ReleaseSRWLockExclusive(&g_config_lock);
}

/* ------------------------------------------------------------------ */
/* Rumble                                                              */
/* ------------------------------------------------------------------ */

void engine_notify_rumble(unsigned long long id, BYTE large_motor, BYTE small_motor)
{
    INT scale, i;

    AcquireSRWLockShared(&g_config_lock);
    scale = g_vib_strength;
    ReleaseSRWLockShared(&g_config_lock);

    large_motor = (BYTE)((INT)large_motor * scale / 100);
    small_motor = (BYTE)((INT)small_motor * scale / 100);

    /* set_vibration only touches controller fields + SetEvent: safe under shared. */
    AcquireSRWLockShared(&g_devices_lock);
    for (i = 0; i < g_device_count; i++)
    {
        if (g_devices[i]->id == id && !g_devices[i]->dead)
        {
            stadia_controller_set_vibration(g_devices[i]->controller, small_motor, large_motor);
            break;
        }
    }
    ReleaseSRWLockShared(&g_devices_lock);
}

static DWORD WINAPI _test_rumble_off(LPVOID param)
{
    unsigned long long id = (unsigned long long)(ULONG_PTR)param;
    INT i;

    Sleep(500);

    AcquireSRWLockShared(&g_devices_lock);
    for (i = 0; i < g_device_count; i++)
    {
        if (g_devices[i]->id == id && !g_devices[i]->dead)
        {
            /* Re-find by id: the original pointer may be stale after a hot-unplug. */
            stadia_controller_set_vibration(g_devices[i]->controller, 0, 0);
            break;
        }
    }
    ReleaseSRWLockShared(&g_devices_lock);
    return 0;
}

BOOL engine_test_rumble(BYTE strength_pct)
{
    unsigned long long id = 0;
    BOOL found = FALSE;
    INT i;
    BYTE level;
    HANDLE thread;

    if (strength_pct > 100) strength_pct = 100;
    level = (BYTE)(255 * (INT)strength_pct / 100);

    AcquireSRWLockShared(&g_devices_lock);
    for (i = 0; i < g_device_count; i++)
    {
        if (!g_devices[i]->dead && !g_devices[i]->is_bluetooth)
        {
            id = g_devices[i]->id;
            stadia_controller_set_vibration(g_devices[i]->controller, level, level);
            found = TRUE;
            break;
        }
    }
    ReleaseSRWLockShared(&g_devices_lock);

    if (!found) return FALSE;

    thread = CreateThread(NULL, 0, _test_rumble_off, (LPVOID)(ULONG_PTR)id, 0, NULL);
    if (thread != NULL) CloseHandle(thread);
    return TRUE;
}

/* ------------------------------------------------------------------ */
/* Macros                                                              */
/* ------------------------------------------------------------------ */

static DWORD WINAPI _macro_thread(LPVOID param)
{
    struct macro_job *job = (struct macro_job *)param;
    INT i;

    for (i = 0; i < job->count; i++)
    {
        const struct engine_macro_step *step = &job->steps[i];

        if (InterlockedCompareExchange(&g_macro_stop, 0, 0) != 0) break;

        if (step->kind == ENGINE_STEP_PRESS)
        {
            DWORD hold = step->ms != 0 ? step->ms : 50;

            AcquireSRWLockExclusive(&g_inject_lock);
            g_inject_buttons |= step->xusb;
            if (step->trigger == 1) g_inject_lt = 255;
            else if (step->trigger == 2) g_inject_rt = 255;
            ReleaseSRWLockExclusive(&g_inject_lock);
            _push_all();

            Sleep(hold);

            AcquireSRWLockExclusive(&g_inject_lock);
            g_inject_buttons &= (USHORT)~step->xusb;
            if (step->trigger == 1) g_inject_lt = 0;
            else if (step->trigger == 2) g_inject_rt = 0;
            ReleaseSRWLockExclusive(&g_inject_lock);
            _push_all();
        }
        else
        {
            Sleep(step->ms != 0 ? step->ms : 10);
        }
    }

    AcquireSRWLockExclusive(&g_inject_lock);
    g_inject_buttons = 0;
    g_inject_lt = 0;
    g_inject_rt = 0;
    ReleaseSRWLockExclusive(&g_inject_lock);
    _push_all();

    free(job->steps);
    free(job);
    return 0;
}

void engine_stop_macro(void)
{
    AcquireSRWLockExclusive(&g_macro_lock);
    if (g_macro_thread != NULL)
    {
        InterlockedExchange(&g_macro_stop, 1);
        WaitForSingleObject(g_macro_thread, 5000);
        CloseHandle(g_macro_thread);
        g_macro_thread = NULL;
    }
    ReleaseSRWLockExclusive(&g_macro_lock);
}

BOOL engine_run_macro(const struct engine_macro_step *steps, INT count)
{
    struct macro_job *job;
    HANDLE thread;
    BOOL ok = FALSE;

    if (InterlockedCompareExchange(&g_running, 1, 1) == 0) return FALSE;
    if (steps == NULL || count <= 0 || count > 128) return FALSE;

    AcquireSRWLockExclusive(&g_macro_lock);

    if (g_macro_thread != NULL)
    {
        InterlockedExchange(&g_macro_stop, 1);
        WaitForSingleObject(g_macro_thread, 5000);
        CloseHandle(g_macro_thread);
        g_macro_thread = NULL;
    }

    job = (struct macro_job *)malloc(sizeof(*job));
    if (job != NULL)
    {
        job->steps = (struct engine_macro_step *)malloc((size_t)count * sizeof(struct engine_macro_step));
        if (job->steps != NULL)
        {
            memcpy(job->steps, steps, (size_t)count * sizeof(struct engine_macro_step));
            job->count = count;

            g_macro_stop = 0;
            thread = CreateThread(NULL, 0, _macro_thread, job, 0, NULL);
            if (thread != NULL)
            {
                g_macro_thread = thread;
                ok = TRUE;
            }
            else
            {
                free(job->steps);
            }
        }
        if (!ok) free(job);
    }

    ReleaseSRWLockExclusive(&g_macro_lock);
    return ok;
}

/* ------------------------------------------------------------------ */
/* Init / shutdown                                                     */
/* ------------------------------------------------------------------ */

static void _load_default_binds(void)
{
    static const struct
    {
        DWORD mask;
        USHORT xusb;
    } map[] = {
        {STADIA_BUTTON_A, XINPUT_A},
        {STADIA_BUTTON_B, XINPUT_B},
        {STADIA_BUTTON_X, XINPUT_X},
        {STADIA_BUTTON_Y, XINPUT_Y},
        {STADIA_BUTTON_LB, XINPUT_LB},
        {STADIA_BUTTON_RB, XINPUT_RB},
        {STADIA_BUTTON_LS, XINPUT_LTHUMB},
        {STADIA_BUTTON_RS, XINPUT_RTHUMB},
        {STADIA_BUTTON_UP, XINPUT_UP},
        {STADIA_BUTTON_DOWN, XINPUT_DOWN},
        {STADIA_BUTTON_LEFT, XINPUT_LEFT},
        {STADIA_BUTTON_RIGHT, XINPUT_RIGHT},
        {STADIA_BUTTON_OPTIONS, XINPUT_BACK},
        {STADIA_BUTTON_CAPTURE, XINPUT_START},
        {STADIA_BUTTON_STADIA_BTN, XINPUT_GUIDE},
    };
    const size_t map_len = sizeof(map) / sizeof(map[0]);
    size_t i;

    AcquireSRWLockExclusive(&g_config_lock);
    if (g_bind_count == 0)
    {
        g_bind_count = 0;
        for (i = 0; i < map_len; i++)
        {
            memset(&g_binds[g_bind_count], 0, sizeof(struct engine_bind));
            g_binds[g_bind_count].stadia_mask = map[i].mask;
            g_binds[g_bind_count].mode = ENGINE_BIND_XINPUT;
            g_binds[g_bind_count].xusb = map[i].xusb;
            g_bind_count++;
        }
        /* Assistant key -> Win+S until the user saves a config */
        memset(&g_binds[g_bind_count], 0, sizeof(struct engine_bind));
        g_binds[g_bind_count].stadia_mask = STADIA_BUTTON_ASSISTANT;
        g_binds[g_bind_count].mode = ENGINE_BIND_SHORTCUT;
        g_binds[g_bind_count].modifiers = ENGINE_MOD_WIN;
        g_binds[g_bind_count].vk = 'S';
        g_bind_count++;
    }
    ReleaseSRWLockExclusive(&g_config_lock);
}

BOOL engine_init(const struct engine_host *host)
{
    BOOL was_running;

    if (host == NULL) return FALSE;

    was_running = InterlockedExchange(&g_running, 1) != 0;
    g_host = *host;
    stadia_update_callback = _stadia_update_cb;
    stadia_destroy_callback = _stadia_destroy_cb;

    if (!was_running)
    {
        _load_default_binds();
        engine_refresh();
    }
    return TRUE;
}

void engine_shutdown(void)
{
    engine_stop_macro();
    InterlockedExchange(&g_running, 0);

    for (;;)
    {
        struct engine_device *victim = NULL;

        AcquireSRWLockExclusive(&g_devices_lock);
        if (g_device_count > 0)
        {
            victim = g_devices[0];
            memmove(&g_devices[0], &g_devices[1], (size_t)(g_device_count - 1) * sizeof(g_devices[0]));
            g_device_count--;
        }
        ReleaseSRWLockExclusive(&g_devices_lock);

        if (victim == NULL) break;
        _free_victim(victim);
    }
}
