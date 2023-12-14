export const prerender = true;

import { error, json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { parse } from 'ase_parser';

const dir_path = 'static/DIGITAL COLOR SWATCHES for Adobe';

export async function GET() {
    const dir = await readdir(dir_path);
    // console.log('in')
    const parsed_ase = [];
    for (const file of dir) {
        // console.log(file)
        const res = await readFile(`${dir_path}/${file}`);
        // console.log(res)
        parsed_ase.push({
            file: file,
            colors: parse(res)
        }
        );
    }

    // console.log('done')
    return json(parsed_ase);
}