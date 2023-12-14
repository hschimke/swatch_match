import {parse} from './parser.js'
import {readFile} from 'fs/promises';

async function main() {
    console.log("ASE File Parser");

    const fn = "../DIGITAL COLOR SWATCHES for Adobe/MONTANA_BLACK_400ml.ase";

    let file = await readFile(fn);

    console.log(parse(file));
}



main();