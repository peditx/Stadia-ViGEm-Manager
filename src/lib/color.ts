/** Readable text color for a hex accent (Material "on-primary" role). */
export function onColor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? "#0A0A0A" : "#FFFFFF";
}

/** Linear blend of two #rrggbb colors; t = 0 keeps `a`, t = 1 keeps `b`. */
export function mix(a: string, b: string, t: number): string {
  const at = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return (
    "#" +
    c(at(a, 1), at(b, 1)) +
    c(at(a, 3), at(b, 3)) +
    c(at(a, 5), at(b, 5))
  );
}

export interface ThemeRoles {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
}

/**
 * Material 3 accent roles derived from one source hex, so every theme
 * (green/blue/cyan/…) drives the same set of CSS variables.
 */
export function themeRoles(hex: string, surface = "#111514"): ThemeRoles {
  return {
    primary: hex,
    onPrimary: onColor(hex),
    primaryContainer: mix(hex, surface, 0.82),
    onPrimaryContainer: mix(hex, "#FFFFFF", 0.65),
  };
}
