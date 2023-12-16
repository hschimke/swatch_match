import type { Color } from '$lib';
import { diff, rgb_to_lab, type RGBColor } from 'color-diff';

export function external_color_diff(c1: Color, c2: Color) {

    return diff(rgb_to_lab(convert_colors(c1)), rgb_to_lab(convert_colors(c2)))
}

function convert_colors(c: Color): RGBColor {
    return {
        R: c.r,
        G: c.g,
        B: c.b
    }
}