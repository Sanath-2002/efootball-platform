import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { componentsDir, templatesDir, themesDir } from './paths';

let initialized = false;

const registerPartials = () => {
  const dir = componentsDir();
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.html')) {
      const name = path.basename(file, '.html');
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      Handlebars.registerPartial(name, content);
    }
  }
};

export const initTemplates = (): void => {
  if (initialized) return;
  registerPartials();

  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('inc', (n) => Number(n) + 1);
  Handlebars.registerHelper('toLowerCase', (s) => String(s).toLowerCase());
  Handlebars.registerHelper('posClass', (pos) => {
    const p = Number(pos);
    if (p === 1) return 'pos-1';
    if (p === 2) return 'pos-2';
    if (p === 3) return 'pos-3';
    return '';
  });

  initialized = true;
};

export const loadTemplate = (name: string): HandlebarsTemplateDelegate => {
  initTemplates();
  const filePath = path.join(templatesDir(), `${name}.html`);
  const source = fs.readFileSync(filePath, 'utf-8');
  return Handlebars.compile(source);
};

export const loadBaseCss = (): string => {
  return fs.readFileSync(path.join(themesDir(), 'broadcast.css'), 'utf-8');
};
