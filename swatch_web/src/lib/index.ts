import type { AseColorEntry } from "adobe_swatch_exchange_parser";

// place files you want to import through the `$lib` alias in this folder.
export type Color = {
    r: number;
    g: number;
    b: number;
};

export type LABColor = {
    L: number;
    a: number;
    b: number;
};

export type ColorDistance = number;

export type ColorDistranceArrayElement = {
    name: string;
    color: Color;
    distance: number;
};

export type ColorDistranceArray = Array<ColorDistranceArrayElement>;

export type AseParsedFilePayload = {
    ase_array: Array<{
        file: string;
        colors: Array<AseColorEntry>
    }>
};