import type { Color } from "$lib";

export function calculateCIEDE2000(color1: Color, color2: Color) {
    const Lab1 = rgbToLab(color1);
    const Lab2 = rgbToLab(color2);

    const kL = 1;
    const kC = 1;
    const kH = 1;

    const deltaL = Lab2.L - Lab1.L;
    const Lbar = (Lab1.L + Lab2.L) / 2;

    const C1 = Math.sqrt(Lab1.a ** 2 + Lab1.b ** 2);
    const C2 = Math.sqrt(Lab2.a ** 2 + Lab2.b ** 2);
    const Cbar = (C1 + C2) / 2;

    const a1Prime =
        Lab1.a +
        (Lab1.a / 2) * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
    const a2Prime =
        Lab2.a +
        (Lab2.a / 2) * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));

    const C1Prime = Math.sqrt(a1Prime ** 2 + Lab1.b ** 2);
    const C2Prime = Math.sqrt(a2Prime ** 2 + Lab2.b ** 2);
    const CbarPrime = (C1Prime + C2Prime) / 2;

    const deltaCPrime = C2Prime - C1Prime;

    const h1Prime =
        Math.atan2(Lab1.b, a1Prime) + (Lab1.b < 0 ? 2 * Math.PI : 0);
    const h2Prime =
        Math.atan2(Lab2.b, a2Prime) + (Lab2.b < 0 ? 2 * Math.PI : 0);
    const deltahPrime = Math.abs(h1Prime - h2Prime);

    const deltaHPrime =
        deltahPrime > Math.PI ? 2 * Math.PI - deltahPrime : deltahPrime;

    const deltaE2000 = Math.sqrt(
        (deltaL / (kL * 1)) ** 2 +
        (deltaCPrime / (kC * 1)) ** 2 +
        (deltaHPrime / (kH * 1)) ** 2,
    );

    return deltaE2000;
}

function rgbToLab(rgb: Color) {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    r *= 100;
    g *= 100;
    b *= 100;

    const X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const Y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
    const Z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

    const epsilon = 0.008856;
    const kappa = 903.3;

    const Xr = 95.047;
    const Yr = 100.0;
    const Zr = 108.883;

    const xr = X / Xr;
    const yr = Y / Yr;
    const zr = Z / Zr;

    const fx = xr > epsilon ? Math.pow(xr, 1 / 3) : (kappa * xr + 16) / 116;
    const fy = yr > epsilon ? Math.pow(yr, 1 / 3) : (kappa * yr + 16) / 116;
    const fz = zr > epsilon ? Math.pow(zr, 1 / 3) : (kappa * zr + 16) / 116;

    const L = Math.max(0, 116 * fy - 16);
    const a = (fx - fy) * 500;
    b = (fy - fz) * 200;

    return { L, a, b };
}