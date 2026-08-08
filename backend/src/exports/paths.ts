import fs from 'fs';
import path from 'path';

/** Resolve exports directory whether running from src (tsx) or dist (node). */
export const getExportsRoot = (): string => {
  const candidates = [
    path.join(__dirname),
    path.join(__dirname, '..', '..', 'src', 'exports'),
    path.join(process.cwd(), 'src', 'exports'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'templates'))) return dir;
  }
  return path.join(process.cwd(), 'src', 'exports');
};

export const templatesDir = () => path.join(getExportsRoot(), 'templates');
export const componentsDir = () => path.join(getExportsRoot(), 'components');
export const themesDir = () => path.join(getExportsRoot(), 'themes');
