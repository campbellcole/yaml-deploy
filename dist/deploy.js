"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yaml_1 = require("yaml");
const TEMPLATE_FILENAME = 'static/meshtastic-TEMPLATE.yml';
const _template = fs_1.default.readFileSync(path_1.default.join(__dirname, TEMPLATE_FILENAME));
const template = (0, yaml_1.parse)(_template.toString());
function traverseTemplate(template, root = undefined) {
}
console.log('template:', template);
