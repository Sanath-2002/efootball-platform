export type SizePreset =
  | 'a4'
  | 'a3'
  | 'social_1080x1350'
  | 'story_1080x1920'
  | 'hd_1920x1080'
  | 'uhd_4k';

export interface SizeConfig {
  width: number;
  height: number;
  landscape?: boolean;
  pdfFormat?: 'A4' | 'A3';
  pdfLandscape?: boolean;
}

/*
 * Every preset renders at a width the design system was drawn for; print
 * targets are scaled down at PDF time rather than squeezing the layout.
 */
export const SIZE_PRESETS: Record<SizePreset, SizeConfig> = {
  a4: { width: 1080, height: 1528, pdfFormat: 'A4' },
  a3: { width: 1440, height: 1018, pdfFormat: 'A3', landscape: true, pdfLandscape: true },
  social_1080x1350: { width: 1080, height: 1350 },
  story_1080x1920: { width: 1080, height: 1920 },
  hd_1920x1080: { width: 1920, height: 1080, landscape: true },
  uhd_4k: { width: 3840, height: 2160, landscape: true },
};

/** CSS pixel width of each paper size at Chromium's 96dpi. */
const PDF_PAGE_WIDTH_PX: Record<'A4' | 'A3', { portrait: number; landscape: number }> = {
  A4: { portrait: 794, landscape: 1123 },
  A3: { portrait: 1123, landscape: 1587 },
};

/** Scale that fits the rendered design onto the requested paper size. */
export const pdfScaleFor = (size: SizeConfig): number => {
  const page = PDF_PAGE_WIDTH_PX[size.pdfFormat ?? 'A4'];
  const landscape = size.pdfLandscape ?? size.landscape ?? false;
  const target = landscape ? page.landscape : page.portrait;
  return Math.min(2, Math.max(0.1, Number((target / size.width).toFixed(4))));
};

export const DEFAULT_SIZE_BY_TEMPLATE: Record<string, SizePreset> = {
  cover: 'social_1080x1350',
  summary: 'a4',
  standings: 'a4',
  fixtures: 'a4',
  bracket: 'a3',
  'match-result': 'social_1080x1350',
  'round-summary': 'a4',
  champion: 'social_1080x1350',
  'team-stats': 'a4',
  'tournament-stats': 'a4',
};

/** PNG is the primary target, so image formats default to social dimensions. */
export const DEFAULT_IMAGE_SIZE_BY_TEMPLATE: Record<string, SizePreset> = {
  ...DEFAULT_SIZE_BY_TEMPLATE,
  standings: 'social_1080x1350',
  summary: 'social_1080x1350',
  fixtures: 'social_1080x1350',
  'round-summary': 'social_1080x1350',
  'team-stats': 'social_1080x1350',
  'tournament-stats': 'social_1080x1350',
  bracket: 'hd_1920x1080',
};

export const resolveSize = (template: string, size?: string, format?: string): SizePreset => {
  if (size && size in SIZE_PRESETS) return size as SizePreset;
  const map = format && format !== 'pdf' ? DEFAULT_IMAGE_SIZE_BY_TEMPLATE : DEFAULT_SIZE_BY_TEMPLATE;
  return map[template] ?? 'a4';
};

/** Print targets get the full column set; social targets get a reduced one. */
export const isDocumentSize = (preset: SizePreset): boolean =>
  preset === 'a4' || preset === 'a3';
