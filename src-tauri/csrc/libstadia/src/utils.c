/*
 * utils.c -- Misc utility routines.
 */

#include "utils.h"

/* Case-fold only ASCII: passing UTF-16 code units > 255 to tolower() is UB. */
static TCHAR _fold(TCHAR c)
{
    if (c >= (TCHAR)'A' && c <= (TCHAR)'Z') return (TCHAR)(c - (TCHAR)'A' + (TCHAR)'a');
    return c;
}

PTCHAR _tcsistr(PTCHAR haystack, const TCHAR *needle)
{
    if (haystack == NULL || needle == NULL) return NULL;
    if (*needle == (TCHAR)'\0') return haystack;

    do
    {
        PTCHAR h = haystack;
        const TCHAR *n = needle;
        while (*n != (TCHAR)'\0' && _fold(*h) == _fold(*n))
        {
            h++;
            n++;
        }
        if (*n == (TCHAR)'\0') return haystack;
    } while (*haystack++);
    return NULL;
}
