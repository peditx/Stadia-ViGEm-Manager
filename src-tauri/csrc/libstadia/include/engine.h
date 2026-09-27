/*
 * engine.h -- Device lifecycle, Stadia-to-XInput mapping, dead zones,
 * edge-triggered shortcuts/app launches, macro playback and vibration policy.
 *
 * ViGEm lives on the Rust side: this file produces XInput-compatible reports
 * through the engine_host callbacks and consumes rumble via engine_notify_rumble.
 */

#ifndef ENGINE_H
#define ENGINE_H

#include <windows.h>

#define ENGINE_MAX_DEVICES 4
#define ENGINE_MAX_BINDS 32

/* XInput button flags -- mirrors vigem_client::XButtons */
#define XINPUT_UP 0x0001
#define XINPUT_DOWN 0x0002
#define XINPUT_LEFT 0x0004
#define XINPUT_RIGHT 0x0008
#define XINPUT_START 0x0010
#define XINPUT_BACK 0x0020
#define XINPUT_LTHUMB 0x0040
#define XINPUT_RTHUMB 0x0080
#define XINPUT_LB 0x0100
#define XINPUT_RB 0x0200
#define XINPUT_GUIDE 0x0400
#define XINPUT_A 0x1000
#define XINPUT_B 0x2000
#define XINPUT_X 0x4000
#define XINPUT_Y 0x8000

/* Bind modes */
#define ENGINE_BIND_XINPUT 0   /* hold maps buttons to the virtual pad */
#define ENGINE_BIND_SHORTCUT 1 /* press fires a keyboard shortcut */
#define ENGINE_BIND_APP 2      /* press launches an application */

/* Shortcut modifiers */
#define ENGINE_MOD_ALT 0x1
#define ENGINE_MOD_CONTROL 0x2
#define ENGINE_MOD_SHIFT 0x4
#define ENGINE_MOD_WIN 0x8

/* Trigger digital overrides: 0 none, 1 LT, 2 RT */
/* Macro step kinds */
#define ENGINE_STEP_PRESS 0
#define ENGINE_STEP_WAIT 1

struct x360_report
{
    USHORT buttons;
    BYTE lt;
    BYTE rt;
    SHORT lx;
    SHORT ly;
    SHORT rx;
    SHORT ry;
};

struct engine_bind
{
    DWORD stadia_mask;
    INT mode;
    USHORT xusb;
    BYTE trigger;
    UINT modifiers;
    UINT vk;
    WCHAR app[MAX_PATH];
};

struct engine_host
{
    void (*on_state)(unsigned long long id, const struct x360_report *report);
    void (*on_add)(unsigned long long id, int is_bluetooth);
    void (*on_remove)(unsigned long long id);
};

struct engine_device_info
{
    unsigned long long id;
    INT is_bluetooth;
    /* Charge 0-100, or -1 when the controller does not report one. */
    INT battery;
};

struct engine_macro_step
{
    DWORD kind;
    USHORT xusb;
    BYTE trigger;
    DWORD ms;
};

BOOL engine_init(const struct engine_host *host);
void engine_shutdown(void);

/* Enumerate HID, drop vanished controllers, add new ones. Returns device count. */
INT engine_refresh(void);
INT engine_copy_devices(struct engine_device_info *out, INT max);

void engine_set_binds(const struct engine_bind *binds, INT count);
void engine_set_deadzones(BYTE left_pct, BYTE right_pct, BYTE trigger_pct);
void engine_set_vibration_strength(BYTE strength_pct);

/* Called from the ViGEm rumble notification thread. large/small: 0-255. */
void engine_notify_rumble(unsigned long long id, BYTE large_motor, BYTE small_motor);
/* 500ms rumble test on the first USB-connected pad. */
BOOL engine_test_rumble(BYTE strength_pct);

BOOL engine_run_macro(const struct engine_macro_step *steps, INT count);
void engine_stop_macro(void);

#endif /* ENGINE_H */
