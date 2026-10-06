/*
 * hid.c -- Routines for interacting with HID devices.
 */

#include "hid.h"

#include "utils.h"

#include <stdlib.h>
#include <string.h>
#include <tchar.h>
#include <initguid.h>
#include <windows.h>
#include <hidsdi.h>
#include <hidpi.h>
#include <setupapi.h>
#include <devpkey.h>
#include <cfgmgr32.h>

#pragma comment(lib, "kernel32.lib")
#pragma comment(lib, "hid.lib")
#pragma comment(lib, "setupapi.lib")
#pragma comment(lib, "cfgmgr32.lib")

static BOOL got_hid_class = FALSE;
static GUID hid_class;

GUID hid_get_class(void)
{
    if (!got_hid_class)
    {
        HidD_GetHidGuid(&hid_class);
        got_hid_class = TRUE;
    }
    return hid_class;
}

struct hid_device_info *hid_enumerate(const LPTSTR *path_filters)
{
    struct hid_device_info *root_dev = NULL;
    struct hid_device_info *cur_dev = NULL;

    GUID class_guid = hid_get_class();
    SP_DEVINFO_DATA devinfo_data;
    SP_DEVICE_INTERFACE_DATA device_interface_data;
    SP_DEVICE_INTERFACE_DETAIL_DATA *device_interface_detail_data = NULL;
    HDEVINFO device_info_set = INVALID_HANDLE_VALUE;
    DWORD required_size = 0;
    DEVPROPTYPE prop_type;
    LPTSTR desc_buffer = NULL;
    LPWSTR desc_buffer_w = NULL;

    memset(&devinfo_data, 0x0, sizeof(devinfo_data));
    devinfo_data.cbSize = sizeof(SP_DEVINFO_DATA);
    device_interface_data.cbSize = sizeof(SP_DEVICE_INTERFACE_DATA);

    device_info_set = SetupDiGetClassDevs(&class_guid, NULL, NULL, DIGCF_PRESENT | DIGCF_DEVICEINTERFACE);
    if (device_info_set == INVALID_HANDLE_VALUE)
    {
        return NULL;
    }

    DWORD device_index = 0;
    while (SetupDiEnumDeviceInfo(device_info_set, device_index, &devinfo_data))
    {
        DWORD device_interface_index = 0;
        while (SetupDiEnumDeviceInterfaces(device_info_set, &devinfo_data, &class_guid, device_interface_index, &device_interface_data))
        {
            SetupDiGetDeviceInterfaceDetail(device_info_set, &device_interface_data, NULL, 0, &required_size, NULL);
            device_interface_detail_data = (SP_DEVICE_INTERFACE_DETAIL_DATA *)malloc(required_size);
            if (device_interface_detail_data == NULL)
            {
                device_interface_index++;
                continue;
            }
            device_interface_detail_data->cbSize = sizeof(SP_DEVICE_INTERFACE_DETAIL_DATA);

            if (SetupDiGetDeviceInterfaceDetail(device_info_set, &device_interface_data, device_interface_detail_data, required_size, NULL, NULL))
            {
                BOOL matched = TRUE;
                if (path_filters != NULL)
                {
                    matched = FALSE;
                    for (const LPTSTR *pfilter = path_filters; *pfilter != NULL; pfilter++)
                    {
                        if (_tcsistr(device_interface_detail_data->DevicePath, *pfilter) != NULL)
                        {
                            matched = TRUE;
                            break;
                        }
                    }
                }

                if (matched)
                {
                    desc_buffer = NULL;
                    desc_buffer_w = NULL;

                    if (SetupDiGetDevicePropertyW(device_info_set, &devinfo_data, &DEVPKEY_Device_BusReportedDeviceDesc,
                                                  &prop_type, NULL, 0, &required_size, 0))
                    {
                        desc_buffer_w = (LPWSTR)malloc(required_size);
                        if (desc_buffer_w != NULL)
                        {
                            memset(desc_buffer_w, 0, required_size);
                            SetupDiGetDevicePropertyW(device_info_set, &devinfo_data, &DEVPKEY_Device_BusReportedDeviceDesc,
                                                      &prop_type, (PBYTE)desc_buffer_w, required_size, NULL, 0);
#ifdef UNICODE
                            desc_buffer = (LPTSTR)desc_buffer_w;
                            desc_buffer_w = NULL;
#else
                            int desc_buffer_size = WideCharToMultiByte(CP_ACP, 0, desc_buffer_w, -1, NULL, 0, NULL, NULL);
                            desc_buffer = (LPTSTR)malloc(desc_buffer_size);
                            if (desc_buffer != NULL)
                            {
                                WideCharToMultiByte(CP_ACP, 0, desc_buffer_w, -1, desc_buffer, desc_buffer_size, NULL, NULL);
                            }
                            free(desc_buffer_w);
                            desc_buffer_w = NULL;
#endif
                        }
                    }

                    if (desc_buffer == NULL || _tcslen(desc_buffer) == 0)
                    {
                        if (desc_buffer != NULL)
                        {
                            free(desc_buffer);
                            desc_buffer = NULL;
                        }
                        if (SetupDiGetDeviceRegistryProperty(device_info_set, &devinfo_data, SPDRP_DEVICEDESC,
                                                             NULL, NULL, 0, &required_size) ||
                            GetLastError() == ERROR_INSUFFICIENT_BUFFER)
                        {
                            desc_buffer = (LPTSTR)malloc(required_size);
                            if (desc_buffer != NULL)
                            {
                                memset(desc_buffer, 0, required_size);
                                SetupDiGetDeviceRegistryProperty(device_info_set, &devinfo_data, SPDRP_DEVICEDESC,
                                                                 NULL, (PBYTE)desc_buffer, required_size, NULL);
                            }
                        }
                    }

                    struct hid_device_info *dev = (struct hid_device_info *)malloc(sizeof(struct hid_device_info));
                    if (dev != NULL)
                    {
                        size_t path_len = _tcslen(device_interface_detail_data->DevicePath);
                        dev->path = (LPTSTR)malloc((path_len + 1) * sizeof(TCHAR));
                        if (dev->path != NULL)
                        {
                            _tcscpy(dev->path, device_interface_detail_data->DevicePath);
                        }
                        dev->description = desc_buffer;
                        dev->next = NULL;

                        if (root_dev == NULL)
                        {
                            root_dev = dev;
                        }
                        else
                        {
                            cur_dev->next = dev;
                        }
                        cur_dev = dev;
                    }
                    else
                    {
                        free(desc_buffer);
                    }
                }
            }

            free(device_interface_detail_data);
            device_interface_index++;
        }

        device_index++;
    }

    SetupDiDestroyDeviceInfoList(device_info_set);

    return root_dev;
}

BOOL hid_reenable_device(LPTSTR path)
{
    GUID class_guid = hid_get_class();
    SP_DEVINFO_DATA devinfo_data;
    HDEVINFO device_info_set = INVALID_HANDLE_VALUE;
    DWORD required_size = 0;
    LPWSTR path_w = NULL;
    LPTSTR inst_id = NULL;
    BOOL result = FALSE;

    memset(&devinfo_data, 0x0, sizeof(devinfo_data));
    devinfo_data.cbSize = sizeof(SP_DEVINFO_DATA);

#ifdef UNICODE
    path_w = path;
#else
    int path_length = (int)strlen(path);
    path_w = (LPWSTR)malloc((path_length + 1) * sizeof(WCHAR));
    MultiByteToWideChar(CP_ACP, 0, path, -1, path_w, path_length + 1);
#endif

    DEVPROPTYPE prop_type;
    CM_Get_Device_Interface_PropertyW(path_w, &DEVPKEY_Device_InstanceId, &prop_type, NULL, &required_size, 0);
    LPWSTR inst_id_w = (LPWSTR)malloc(required_size);
    if (inst_id_w == NULL)
    {
#ifdef UNICODE
#else
        free(path_w);
#endif
        return FALSE;
    }

    if (CM_Get_Device_Interface_PropertyW(path_w, &DEVPKEY_Device_InstanceId, &prop_type, (PBYTE)inst_id_w, &required_size, 0) != CR_SUCCESS)
    {
        free(inst_id_w);
#ifdef UNICODE
#else
        free(path_w);
#endif
        return FALSE;
    }

#ifdef UNICODE
    inst_id = inst_id_w;
#else
    free(path_w);
    path_w = NULL;
    {
        int inst_id_size = WideCharToMultiByte(CP_ACP, 0, inst_id_w, -1, NULL, 0, NULL, NULL);
        inst_id = (LPTSTR)malloc(inst_id_size);
        WideCharToMultiByte(CP_ACP, 0, inst_id_w, -1, inst_id, inst_id_size, NULL, NULL);
    }
    free(inst_id_w);
#endif

    device_info_set = SetupDiGetClassDevs(&class_guid, inst_id, NULL, DIGCF_PRESENT | DIGCF_DEVICEINTERFACE);
    if (device_info_set == INVALID_HANDLE_VALUE)
    {
#ifdef UNICODE
        free(inst_id);
#else
        free(inst_id);
#endif
        return FALSE;
    }

    if (!SetupDiEnumDeviceInfo(device_info_set, 0, &devinfo_data) || SetupDiEnumDeviceInfo(device_info_set, 1, &devinfo_data))
    {
        free(inst_id);
        SetupDiDestroyDeviceInfoList(device_info_set);
        return FALSE;
    }

    SP_PROPCHANGE_PARAMS pc_params = {0};
    pc_params.ClassInstallHeader.cbSize = sizeof(SP_CLASSINSTALL_HEADER);
    pc_params.ClassInstallHeader.InstallFunction = DIF_PROPERTYCHANGE;
    pc_params.StateChange = DICS_DISABLE;
    pc_params.Scope = DICS_FLAG_GLOBAL;
    pc_params.HwProfile = 0;

    result = SetupDiSetClassInstallParams(device_info_set, &devinfo_data, (PSP_CLASSINSTALL_HEADER)&pc_params, sizeof(SP_PROPCHANGE_PARAMS));
    result = result && SetupDiCallClassInstaller(DIF_PROPERTYCHANGE, device_info_set, &devinfo_data);

    pc_params.StateChange = DICS_ENABLE;
    result = result && SetupDiSetClassInstallParams(device_info_set, &devinfo_data, (PSP_CLASSINSTALL_HEADER)&pc_params, sizeof(SP_PROPCHANGE_PARAMS));
    result = result && SetupDiCallClassInstaller(DIF_PROPERTYCHANGE, device_info_set, &devinfo_data);

    free(inst_id);
    SetupDiDestroyDeviceInfoList(device_info_set);
    return result;
}

BOOL check_vendor_and_product(LPTSTR path, USHORT vendor_id, USHORT product_id)
{
    HANDLE dev_handle = CreateFile(path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, 0);
    if (dev_handle != INVALID_HANDLE_VALUE)
    {
        BOOL matched = FALSE;
        HIDD_ATTRIBUTES attributes;
        attributes.Size = sizeof(HIDD_ATTRIBUTES);
        if (HidD_GetAttributes(dev_handle, &attributes))
        {
            matched = (vendor_id == 0x0 || attributes.VendorID == vendor_id) &&
                      (product_id == 0x0 || attributes.ProductID == product_id);
        }
        CloseHandle(dev_handle);
        return matched;
    }
    return FALSE;
}

void hid_free_device_info(struct hid_device_info *device_info)
{
    if (device_info == NULL) return;
    if (device_info->description != NULL) free(device_info->description);
    if (device_info->path != NULL) free(device_info->path);
    free(device_info);
}

/* HID battery usages worth honouring: Power Device / Battery Strength and
   Battery System / Remaining Capacity. Everything else is not a charge level. */
#define HID_PAGE_POWER_DEVICE 0x06
#define HID_USAGE_BATTERY_STRENGTH 0x20
#define HID_PAGE_BATTERY_SYSTEM 0x85     /* hidusage.h numbering */
#define HID_PAGE_BATTERY_SYSTEM_USB 0x07 /* USB HID Usage Tables numbering */
#define HID_USAGE_REMAINING_CAPACITY 0x66

/* The class driver can read the charge for us, but the import libs we link
   don't ship HidD_GetBatteryInformation on every SDK, so resolve it from
   hid.dll at first use. A missing export simply falls back to the
   descriptor walk below -- nothing here may break an open. */
typedef BOOLEAN (WINAPI *PFN_HIDDGETBATTERYINFO)(HANDLE, ULONG, PVOID);
static PFN_HIDDGETBATTERYINFO pfn_get_battery_info = NULL;
static BOOL battery_api_probed = FALSE;

static void _resolve_battery_api(void)
{
    HMODULE hid;
    if (battery_api_probed) return;
    battery_api_probed = TRUE;
    hid = GetModuleHandleW(L"hid.dll");
    if (hid == NULL) hid = LoadLibraryW(L"hid.dll");
    if (hid != NULL)
        pfn_get_battery_info = (PFN_HIDDGETBATTERYINFO)(void *)GetProcAddress(hid, "HidD_GetBatteryInformation");
}

/* Charge straight from the OS, in %, or -1 when it won't answer. Tried before
   the descriptor path because plenty of pads expose no battery usage at all
   while still answering this call. The buffer is deliberately larger than the
   documented two ULONGs so an SDK with a bigger struct can't overrun it. */
static INT _os_battery(struct hid_device *dev)
{
    static const ULONG types[2] = {0 /* HidP_Input */, 2 /* HidP_Feature */};
    ULONG buf[16];
    int i;

    _resolve_battery_api();
    if (pfn_get_battery_info == NULL) return -1;
    for (i = 0; i < 2; i++)
    {
        memset(buf, 0, sizeof(buf));
        if (!pfn_get_battery_info(dev->handle, types[i], buf)) continue;
        if (buf[1] > 100) continue;                         /* not a percentage */
        if (buf[0] == 0 && buf[1] == 0) continue;           /* "unreported", not empty */
        return (INT)buf[1];
    }
    return -1;
}

/*
 * Look for a battery usage while the preparsed data is still live. Returns
 * TRUE when one was found, in which case the caller must keep `pp_data`
 * around for HidP_GetUsageValue. A pad with no battery usage is the common
 * case -- nothing changes for it beyond these few comparisons.
 */
static BOOL _probe_battery(struct hid_device *dev, PHIDP_PREPARSED_DATA pp_data)
{
    HIDP_VALUE_CAPS caps[16];
    const HIDP_REPORT_TYPE types[2] = {HidP_Feature, HidP_Input};
    int t;

    for (t = 0; t < 2; t++)
    {
        USHORT len = (USHORT)(sizeof(caps) / sizeof(caps[0]));
        USHORT i;
        if (HidP_GetValueCaps(types[t], caps, &len, pp_data) != HIDP_STATUS_SUCCESS)
            continue;
        for (i = 0; i < len; i++)
        {
            USAGE page = caps[i].UsagePage;
            USAGE usage = caps[i].IsRange ? caps[i].Range.UsageMin : caps[i].NotRange.Usage;
            BOOL hit = (page == HID_PAGE_POWER_DEVICE && usage == HID_USAGE_BATTERY_STRENGTH) ||
                       (page == HID_PAGE_BATTERY_SYSTEM && usage == HID_USAGE_REMAINING_CAPACITY) ||
                       (page == HID_PAGE_BATTERY_SYSTEM_USB && usage == HID_USAGE_REMAINING_CAPACITY);
            if (!hit) continue;

            dev->has_battery = TRUE;
            dev->pp_data = pp_data;
            dev->battery_page = page;
            dev->battery_link = caps[i].LinkCollection;
            dev->battery_usage = usage;
            dev->battery_report_id = caps[i].ReportID;
            dev->battery_is_feature = (types[t] == HidP_Feature);
            dev->battery_logical_max = caps[i].LogicalMax;
            return TRUE;
        }
    }
    return FALSE;
}

/* Scale a raw HID value onto 0-100 using the descriptor's logical range. */
static INT _battery_percent(LONG value, LONG logical_max)
{
    LONG pct;
    if (logical_max > 0 && logical_max != 100)
    {
        pct = (LONG)(((long long)value * 100) / logical_max);
    }
    else
    {
        pct = value;
    }
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return (INT)pct;
}

struct hid_device *hid_open_device(LPTSTR path, BOOL access_rw, BOOL shared)
{
    DWORD desired_access = access_rw ? (GENERIC_WRITE | GENERIC_READ) : 0;
    DWORD share_mode = shared ? (FILE_SHARE_READ | FILE_SHARE_WRITE) : 0;
    SECURITY_ATTRIBUTES security;
    security.nLength = sizeof(SECURITY_ATTRIBUTES);
    security.lpSecurityDescriptor = NULL;
    security.bInheritHandle = TRUE;

    HANDLE handle = CreateFile(path, desired_access, share_mode, &security, OPEN_EXISTING, FILE_FLAG_OVERLAPPED, 0);
    if (handle == INVALID_HANDLE_VALUE)
    {
        return NULL;
    }

    PHIDP_PREPARSED_DATA pp_data = NULL;
    if (!HidD_GetPreparsedData(handle, &pp_data))
    {
        CloseHandle(handle);
        return NULL;
    }

    HIDP_CAPS caps;
    if (HidP_GetCaps(pp_data, &caps) != HIDP_STATUS_SUCCESS)
    {
        HidD_FreePreparsedData(pp_data);
        CloseHandle(handle);
        return NULL;
    }

    struct hid_device *dev = (struct hid_device *)malloc(sizeof(struct hid_device));
    if (dev == NULL)
    {
        HidD_FreePreparsedData(pp_data);
        CloseHandle(handle);
        return NULL;
    }

    size_t path_len = _tcslen(path);
    dev->path = (LPTSTR)malloc((path_len + 1) * sizeof(TCHAR));
    if (dev->path == NULL)
    {
        free(dev);
        HidD_FreePreparsedData(pp_data);
        CloseHandle(handle);
        return NULL;
    }
    _tcscpy(dev->path, path);

    dev->handle = handle;
    dev->read_pending = FALSE;
    dev->write_pending = FALSE;
    dev->input_report_size = caps.InputReportByteLength;
    dev->output_report_size = caps.OutputReportByteLength;
    dev->feature_report_size = caps.FeatureReportByteLength;
    dev->input_buffer = (BYTE *)malloc(caps.InputReportByteLength);
    dev->output_buffer = (BYTE *)malloc(caps.OutputReportByteLength);
    dev->feature_buffer = (BYTE *)malloc(caps.FeatureReportByteLength);

    dev->has_battery = FALSE;
    dev->pp_data = NULL;
    dev->battery_page = 0;
    dev->battery_link = 0;
    dev->battery_usage = 0;
    dev->battery_report_id = 0;
    dev->battery_is_feature = FALSE;
    dev->battery_logical_max = 0;
    dev->battery = -1;
    dev->battery_fails = 0;
    /* Kept alive only when a battery usage was found; see hid_free_device. */
    if (!_probe_battery(dev, pp_data))
    {
        HidD_FreePreparsedData(pp_data);
    }

    memset(&dev->input_ol, 0, sizeof(OVERLAPPED));
    dev->input_ol.hEvent = CreateEvent(&security, FALSE, FALSE, NULL);

    memset(&dev->output_ol, 0, sizeof(OVERLAPPED));
    dev->output_ol.hEvent = CreateEvent(&security, FALSE, FALSE, NULL);

    return dev;
}

INT hid_get_input_report(struct hid_device *device, DWORD timeout)
{
    DWORD bytes_read = 0;
    HANDLE ev = device->input_ol.hEvent;

    if (!device->read_pending)
    {
        device->read_pending = TRUE;
        memset(device->input_buffer, 0, device->input_report_size);
        ResetEvent(ev);
        if (!ReadFile(device->handle, device->input_buffer, device->input_report_size, &bytes_read, &device->input_ol))
        {
            if (GetLastError() != ERROR_IO_PENDING)
            {
                CancelIo(device->handle);
                device->read_pending = FALSE;
                return -1;
            }
        }
    }

    if (timeout > 0)
    {
        if (WaitForSingleObject(ev, timeout) != WAIT_OBJECT_0)
        {
            return 0;
        }
    }

    if (GetOverlappedResult(device->handle, &device->input_ol, &bytes_read, TRUE))
    {
        device->read_pending = FALSE;
        return (INT)bytes_read;
    }

    device->read_pending = FALSE;
    return -1;
}

INT hid_send_output_report(struct hid_device *device, const void *data, size_t length, DWORD timeout)
{
    DWORD bytes_written = 0;
    HANDLE ev = device->output_ol.hEvent;

    if (!device->write_pending)
    {
        device->write_pending = TRUE;

        memset(device->output_buffer, 0x0, device->output_report_size);
        size_t copy_len = length > device->output_report_size ? device->output_report_size : length;
        memmove(device->output_buffer, data, copy_len);

        ResetEvent(ev);
        if (!WriteFile(device->handle, device->output_buffer, device->output_report_size, &bytes_written, &device->output_ol))
        {
            if (GetLastError() != ERROR_IO_PENDING)
            {
                CancelIo(device->handle);
                device->write_pending = FALSE;
                return -1;
            }
        }
    }

    if (timeout > 0)
    {
        if (WaitForSingleObject(ev, timeout) != WAIT_OBJECT_0)
        {
            return 0;
        }
    }

    if (GetOverlappedResult(device->handle, &device->output_ol, &bytes_written, TRUE))
    {
        device->write_pending = FALSE;
        return (INT)bytes_written;
    }

    device->write_pending = FALSE;
    return -1;
}

INT hid_get_battery(struct hid_device *device)
{
    HIDP_REPORT_TYPE type;
    PCHAR report;
    ULONG length;
    ULONG value = 0;
    NTSTATUS status;
    BYTE *scratch;
    INT os;

    if (device == NULL) return -1;

    os = _os_battery(device);
    if (os >= 0)
    {
        device->battery = os;
        return os;
    }

    if (!device->has_battery || device->pp_data == NULL)
    {
        return -1;
    }

    type = device->battery_is_feature ? HidP_Feature : HidP_Input;

    if (type == HidP_Feature)
    {
        length = device->feature_report_size;
        if (length == 0 || length > 256) return -1;
        scratch = device->feature_buffer;
        memset(scratch, 0, length);
        scratch[0] = device->battery_report_id;
        if (!HidD_GetFeature(device->handle, scratch, length))
        {
            /* A single failed read (busy device, mid-reconnect) must not kill
               the probe for the rest of the session -- only give up once the
               pad has refused five polls running. */
            if (++device->battery_fails >= 5) device->has_battery = FALSE;
            return device->battery;
        }
        device->battery_fails = 0;
    }
    else
    {
        length = device->input_report_size;
        if (length == 0 || length > 256) return -1;
        if (device->battery_report_id != 0 &&
            device->input_buffer[0] != device->battery_report_id)
        {
            return device->battery;
        }
        scratch = device->input_buffer;
    }

    report = (PCHAR)scratch;
    status = HidP_GetUsageValue(type, device->battery_page, device->battery_link,
                                device->battery_usage, &value, (PHIDP_PREPARSED_DATA)device->pp_data,
                                report, length);
    if (status != HIDP_STATUS_SUCCESS)
    {
        return device->battery;
    }

    device->battery = _battery_percent((LONG)value, device->battery_logical_max);
    return device->battery;
}

void hid_close_device(struct hid_device *device)
{
    if (device == NULL) return;
    CancelIoEx(device->handle, NULL);
    if (device->input_ol.hEvent) CloseHandle(device->input_ol.hEvent);
    if (device->output_ol.hEvent) CloseHandle(device->output_ol.hEvent);
    if (device->handle && device->handle != INVALID_HANDLE_VALUE) CloseHandle(device->handle);
}

void hid_free_device(struct hid_device *device)
{
    if (device == NULL) return;
    if (device->pp_data) HidD_FreePreparsedData((PHIDP_PREPARSED_DATA)device->pp_data);
    if (device->path) free(device->path);
    if (device->input_buffer) free(device->input_buffer);
    if (device->output_buffer) free(device->output_buffer);
    if (device->feature_buffer) free(device->feature_buffer);
    free(device);
}
