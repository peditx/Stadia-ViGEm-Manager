/*
 * stadia.c -- Routines for interacting with a Stadia controller.
 */

#include "stadia.h"

#include "hid.h"
#include "utils.h"

#include <stdio.h>
#include <stdlib.h>
#include <synchapi.h>
#include <tchar.h>
#include <windows.h>

#pragma comment(lib, "kernel32.lib")

#define STADIA_READ_TIMEOUT 10

#define STADIA_VIBRATION_IDENTIFIER 0x05

/* How often to re-read the charge level (only if the descriptor has one). */
#define STADIA_BATTERY_INTERVAL 5000

/* Global callback function pointers */
stadia_update_cb_t stadia_update_callback = NULL;
stadia_destroy_cb_t stadia_destroy_callback = NULL;

/* Path filters for enumeration */
LPTSTR stadia_path_filters[3] = {
    STADIA_USB_HW_FILTER,
    STADIA_BLT_HW_FILTER,
    NULL
};

static const DWORD dpad_map[8] =
    {
        STADIA_BUTTON_UP,
        STADIA_BUTTON_UP | STADIA_BUTTON_RIGHT,
        STADIA_BUTTON_RIGHT,
        STADIA_BUTTON_RIGHT | STADIA_BUTTON_DOWN,
        STADIA_BUTTON_DOWN,
        STADIA_BUTTON_DOWN | STADIA_BUTTON_LEFT,
        STADIA_BUTTON_LEFT,
        STADIA_BUTTON_LEFT | STADIA_BUTTON_UP};

static int last_error = 0;

/*
 * Detect Bluetooth connection from device path.
 * Bluetooth HID paths contain "vid&02" (Bluetooth filter format).
 * Used only to report the connection type -- rumble over Bluetooth is not
 * supported by Windows (HidBth.sys sends output reports write-without-response,
 * which fails), so vibration is never attempted on BT devices.
 */
static BOOL _is_bluetooth_path(LPTSTR path)
{
    if (path == NULL) return FALSE;
    return (_tcsistr(path, TEXT("vid&02")) != NULL);
}

/* Send vibration via USB output report (report id 0x05). */
static void _send_vibration(struct stadia_controller *controller, BYTE big_motor, BYTE small_motor)
{
    BYTE vibration[5] = {STADIA_VIBRATION_IDENTIFIER, 0x00, big_motor, 0x00, small_motor};
    hid_send_output_report(controller->device, vibration, sizeof(vibration), STADIA_READ_TIMEOUT);
}

static DWORD WINAPI _stadia_input_thread(LPVOID lparam)
{
    struct stadia_controller *controller = (struct stadia_controller *)lparam;
    INT bytes_read = 0;
    DWORD last_battery_poll = GetTickCount() - STADIA_BATTERY_INTERVAL;

    while (controller->active)
    {
        while ((bytes_read = hid_get_input_report(controller->device, STADIA_READ_TIMEOUT)) == 0)
            ;

        if (bytes_read < 0)
        {
            break;
        }

        /* Refresh charge level off the input cadence; a pad that reports no
           battery costs one branch here and nothing on the wire. */
        if (GetTickCount() - last_battery_poll >= STADIA_BATTERY_INTERVAL)
        {
            last_battery_poll = GetTickCount();
            InterlockedExchange(&controller->battery, hid_get_battery(controller->device));
        }

        /* check packet header */
        if (controller->device->input_buffer[0] != 0x03)
        {
            continue;
        }

        AcquireSRWLockExclusive(&controller->state_lock);

        controller->state.buttons = STADIA_BUTTON_NONE;

        controller->state.buttons |= controller->device->input_buffer[1] < 8 ? dpad_map[controller->device->input_buffer[1]] : 0;

        controller->state.buttons |= (controller->device->input_buffer[2] & (1 << 7)) != 0 ? STADIA_BUTTON_RS : 0;
        controller->state.buttons |= (controller->device->input_buffer[2] & (1 << 6)) != 0 ? STADIA_BUTTON_OPTIONS : 0;
        controller->state.buttons |= (controller->device->input_buffer[2] & (1 << 5)) != 0 ? STADIA_BUTTON_MENU : 0;
        controller->state.buttons |= (controller->device->input_buffer[2] & (1 << 4)) != 0 ? STADIA_BUTTON_STADIA_BTN : 0;
        controller->state.buttons |= (controller->device->input_buffer[2] & (1 << 1)) != 0 ? STADIA_BUTTON_ASSISTANT : 0;
        controller->state.buttons |= (controller->device->input_buffer[2] & (1 << 0)) != 0 ? STADIA_BUTTON_CAPTURE : 0;

        controller->state.buttons |= (controller->device->input_buffer[3] & (1 << 6)) != 0 ? STADIA_BUTTON_A : 0;
        controller->state.buttons |= (controller->device->input_buffer[3] & (1 << 5)) != 0 ? STADIA_BUTTON_B : 0;
        controller->state.buttons |= (controller->device->input_buffer[3] & (1 << 4)) != 0 ? STADIA_BUTTON_X : 0;
        controller->state.buttons |= (controller->device->input_buffer[3] & (1 << 3)) != 0 ? STADIA_BUTTON_Y : 0;
        controller->state.buttons |= (controller->device->input_buffer[3] & (1 << 2)) != 0 ? STADIA_BUTTON_LB : 0;
        controller->state.buttons |= (controller->device->input_buffer[3] & (1 << 1)) != 0 ? STADIA_BUTTON_RB : 0;
        controller->state.buttons |= (controller->device->input_buffer[3] & (1 << 0)) != 0 ? STADIA_BUTTON_LS : 0;

        controller->state.left_stick_x = controller->device->input_buffer[4];
        controller->state.left_stick_y = controller->device->input_buffer[5];
        controller->state.right_stick_x = controller->device->input_buffer[6];
        controller->state.right_stick_y = controller->device->input_buffer[7];
        controller->state.left_trigger = controller->device->input_buffer[8];
        controller->state.right_trigger = controller->device->input_buffer[9];

        ReleaseSRWLockExclusive(&controller->state_lock);

        if (stadia_update_callback != NULL)
        {
            stadia_update_callback(controller, &controller->state);
        }
    }

    /* Notify the application that this controller stopped */
    if (stadia_destroy_callback != NULL)
    {
        stadia_destroy_callback(controller);
    }

    return 0;
}

static DWORD WINAPI _stadia_output_thread(LPVOID lparam)
{
    struct stadia_controller *controller = (struct stadia_controller *)lparam;

    HANDLE wait_events[2] = {controller->output_event, controller->stopping_event};

    while (controller->active)
    {
        WaitForMultipleObjects(2, wait_events, FALSE, INFINITE);

        if (!controller->active)
        {
            break;
        }

        AcquireSRWLockShared(&controller->vibration_lock);
        BYTE big_motor = controller->big_motor;
        BYTE small_motor = controller->small_motor;
        ReleaseSRWLockShared(&controller->vibration_lock);

        _send_vibration(controller, big_motor, small_motor);
    }

    /* Stop vibration on exit */
    _send_vibration(controller, 0x0, 0x0);

    return 0;
}

struct stadia_controller *stadia_controller_create(struct hid_device *device)
{
    if (device == NULL)
    {
        return NULL;
    }

    SECURITY_ATTRIBUTES security = {0};
    security.nLength = sizeof(SECURITY_ATTRIBUTES);
    security.lpSecurityDescriptor = NULL;
    security.bInheritHandle = TRUE;

    struct stadia_controller *controller = (struct stadia_controller *)malloc(sizeof(struct stadia_controller));
    if (controller == NULL)
    {
        return NULL;
    }

    memset(controller, 0, sizeof(struct stadia_controller));
    controller->device = device;
    controller->active = TRUE;
    controller->is_bluetooth = _is_bluetooth_path(device->path);
    controller->battery = -1;

    InitializeSRWLock(&controller->state_lock);
    InitializeSRWLock(&controller->vibration_lock);

    controller->stopping_event = CreateEvent(&security, TRUE, FALSE, NULL);
    /* auto-reset: set_vibration pokes it once per state change */
    controller->output_event = CreateEvent(&security, FALSE, FALSE, NULL);

    if (controller->stopping_event == NULL || controller->output_event == NULL)
    {
        free(controller);
        return NULL;
    }

    controller->input_thread = CreateThread(&security, 0, _stadia_input_thread, controller, CREATE_SUSPENDED, NULL);
    controller->output_thread = CreateThread(&security, 0, _stadia_output_thread, controller, CREATE_SUSPENDED, NULL);

    if (controller->input_thread == NULL || controller->output_thread == NULL)
    {
        stadia_controller_destroy(controller);
        last_error = STADIA_ERROR_THREAD_CREATE_FAILURE;
        return NULL;
    }

    ResumeThread(controller->input_thread);
    ResumeThread(controller->output_thread);

    return controller;
}

void stadia_controller_set_vibration(struct stadia_controller *controller, BYTE small_motor, BYTE big_motor)
{
    if (controller == NULL) return;

    AcquireSRWLockExclusive(&controller->vibration_lock);
    controller->small_motor = small_motor;
    controller->big_motor = big_motor;
    ReleaseSRWLockExclusive(&controller->vibration_lock);

    SetEvent(controller->output_event);
}

void stadia_controller_destroy(struct stadia_controller *controller)
{
    if (controller == NULL) return;

    if (controller->device != NULL)
    {
        CancelIoEx(controller->device->handle, &controller->device->input_ol);
    }

    controller->active = FALSE;
    if (controller->stopping_event != NULL)
    {
        SetEvent(controller->stopping_event);
    }

    /* Threads may still be suspended (partial create failure) -- resume so
       the joins below cannot hang on a thread that will never run. */
    if (controller->input_thread != NULL) ResumeThread(controller->input_thread);
    if (controller->output_thread != NULL) ResumeThread(controller->output_thread);

    if (controller->input_thread != NULL)
    {
        WaitForSingleObject(controller->input_thread, 5000);
        CloseHandle(controller->input_thread);
    }
    if (controller->output_thread != NULL)
    {
        WaitForSingleObject(controller->output_thread, 5000);
        CloseHandle(controller->output_thread);
    }
    if (controller->stopping_event != NULL) CloseHandle(controller->stopping_event);
    if (controller->output_event != NULL) CloseHandle(controller->output_event);

    free(controller);
}
