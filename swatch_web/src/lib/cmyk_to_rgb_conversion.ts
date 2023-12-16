import type { Color } from "$lib";

export function convert_cmyk_rgb(
    c: number = 0,
    m: number = 0,
    y: number = 0,
    k: number = 0,
): Color {
    // Ensure values are in the range [0, 1]
    c = c / 100;
    m = m / 100;
    y = y / 100;
    k = k / 100;

    // Convert CMYK to RGB
    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));

    // console.log(`${c},${m},${y},${k} -> ${r},${g},${b}`)
    return { r, g, b };
}