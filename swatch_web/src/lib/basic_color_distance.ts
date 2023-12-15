import type { Color } from "$lib";

export function calculate_color_distance(color1: Color, color2: Color): number {
    // Extract RGB values from each color
    const { r: r1, g: g1, b: b1 } = color1;
    const { r: r2, g: g2, b: b2 } = color2;

    // Calculate the Euclidean distance
    const distance = Math.sqrt(
        Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2),
    );

    return distance;
}