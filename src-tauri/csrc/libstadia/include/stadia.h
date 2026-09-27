/*
 * stadia.h -- Routines for interacting with a Stadia controller.
 */

#ifndef STADIA_H
#define STADIA_H

#include <wtypes.h>
#include "hid.h"

#define STADIA_ERROR_VIBRATION_INIT_FAILURE 0x1
#define STADIA_ERROR_THREAD_CREATE_FAILURE 0x2

#define STADIA_USB_HW_VENDOR_ID 0x18D1
#define STADIA_USB_HW_PRODUCT_ID 0x9400
#define STADIA_USB_HW_FILTER TEXT("VID_18D1&PID_9400")

#define STADIA_BLT_HW_VENDOR_ID 0x18D1
#define STADIA_BLT_HW_PRODUCT_ID 0x9400
#define STADIA_BLT_HW_FILTER TEXT("vid&0218d1_pid&9400")

#define STADIA_BUTTON_NONE 0x00000000
#define STADIA_BUTTON_A 0x00000001
#define STADIA_BUTTON_B 0x00000002
#define STADIA_BUTTON_X 0x00000004
#define STADIA_BUTTON_Y 0x00000008
#define STADIA_BUTTON_LB 0x00000010
#define STADIA_BUTTON_RB 0x00000020
#define STADIA_BUTTON_LS 0x00000040
#define STADIA_BUTTON_RS 0x00000080
#define STADIA_BUTTON_UP 0x00000100
#define STADIA_BUTTON_DOWN 0x00000200
#define STADIA_BUTTON_LEFT 0x00000400
#define STADIA_BUTTON_RIGHT 0x00000800
#define STADIA_BUTTON_OPTIONS 0x00001000
#define STADIA_BUTTON_MENU 0x00002000
#define STADIA_BUTTON_STADIA_BTN 0x00004000
#define STADIA_BUTTON_CAPTURE 0x00008000
#define STADIA_BUTTON_ASSISTANT 0x00010000

struct stadia_state
{
    DWORD buttons;

    BYTE left_stick_x;
    BYTE left_stick_y;

    BYTE right_stick_x;
    BYTE right_stick_y;

    BYTE left_trigger;
    BYTE right_trigger;
};

struct stadia_controller
{
    struct hid_device *device;

    SRWLOCK state_lock;
    struct stadia_state state;

    BOOL active;
    BOOL is_bluetooth;
    /* Charge level refreshed by the input thread; -1 = not reported. */
    volatile LONG battery;
    HANDLE stopping_event;
    HANDLE output_event;

    SRWLOCK vibration_lock;
    BYTE small_motor;
    BYTE big_motor;

    HANDLE input_thread;
    HANDLE output_thread;
};

/*
 * Callback function types.
 * These are assigned by the application before creating any controllers.
 */
typedef void (*stadia_update_cb_t)(struct stadia_controller *, struct stadia_state *);
typedef void (*stadia_destroy_cb_t)(struct stadia_controller *);

/*
 * Callback pointers -- assign these from your app.
 */
extern stadia_update_cb_t stadia_update_callback;
extern stadia_destroy_cb_t stadia_destroy_callback;

struct stadia_controller *stadia_controller_create(struct hid_device *device);
void stadia_controller_set_vibration(struct stadia_controller *controller, BYTE small_motor, BYTE big_motor);
void stadia_controller_destroy(struct stadia_controller *controller);

/* Filter arrays for enumeration */
extern LPTSTR stadia_path_filters[3];

#endif // STADIA_H
