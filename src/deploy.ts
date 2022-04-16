import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml';

const TEMPLATE_FILENAME = 'static/meshtastic-TEMPLATE.yml';

const _template = fs.readFileSync(path.join(__dirname, TEMPLATE_FILENAME));
const template = parse(_template.toString());

function traverseTemplate(template: any, root = undefined) {
  
}

console.log('template:', template);
