// RUN WITH ts-node

import shell from 'shelljs';
import fs from 'fs';
import JSON5 from 'json5';

const _tsConfig = fs.readFileSync('tsconfig.json'); // this file should only be run by the package.json prestart script
const tsConfig = JSON5.parse(_tsConfig.toString());

const {outDir} = tsConfig.compilerOptions;

const folders = ['./src/static'];

console.log(`Copying static files to '${outDir}'...`);

folders.forEach(folder => {
  console.log(`  Copying ${folder}...`);
  shell.cp('-R', folder, outDir);
})