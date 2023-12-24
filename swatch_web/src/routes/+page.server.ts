export const prerender = true;

import { readdir, readFile } from 'fs/promises';
import { parse } from 'adobe_swatch_exchange_parser';
import type { AseParsedFilePayload } from '$lib';


const dir_path = 'static/DIGITAL COLOR SWATCHES for Adobe';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
    const dir = await readdir(dir_path);
    // console.log('in')
    const parsed_ase = [];
    for (const file of dir) {
        // console.log(file)
        const res = await readFile(`${dir_path}/${file}`);
        // console.log(res)
        parsed_ase.push({
            file: file.slice(0, file.lastIndexOf('.')),
            colors: parse(res)
        }
        );
    }
    return { ase_array: parsed_ase } as AseParsedFilePayload
}