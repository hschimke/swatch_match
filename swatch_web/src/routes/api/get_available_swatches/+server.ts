export const prerender = true;

import { error, json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { parse } from 'adobe_swatch_exchange_parser';
import type { AseColorEntry } from 'adobe_swatch_exchange_parser';


const dir_path = 'static/DIGITAL COLOR SWATCHES for Adobe';

export type AseParsedFilePayload = Array<{
    file: string;
    colors: Array<AseColorEntry>
}>;

export async function GET() {
    const dir = await readdir(dir_path);
    // console.log('in')
    const parsed_ase = [];
    for (const file of dir) {
        // console.log(file)
        const res = await readFile(`${dir_path}/${file}`);
        // console.log(res)
        parsed_ase.push({
            file: file.slice(0,file.lastIndexOf('.')),
            colors: parse(res)
        }
        );
    }

    // console.log('done')
    return json(parsed_ase);
}