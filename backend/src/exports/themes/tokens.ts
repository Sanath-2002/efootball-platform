/**
 * Broadcast export design system — theme tokens.
 *
 * Derived from analysis of official league graphics (Premier League, La Liga,
 * eFootball, betPawa). Ground is a light canvas; rows are capsules separated by
 * space; colour appears only on goal difference, form results and zone markers.
 *
 * Hard constraints enforced by this system:
 *   - no gradients, no shadows, no glow
 *   - one separation system (capsule gaps), never hairlines as well
 *   - points emphasised by ground inversion, never by size
 */

export type ThemeId =
  | 'efootball_yellow'
  | 'ucl_blue'
  | 'premier_purple'
  | 'laliga_dark'
  | 'custom';

export interface ThemeTokens {
  id: ThemeId;
  name: string;
  cssVars: Record<string, string>;
}

/** Typography, spacing, grid and shape — identical across every theme. */
const systemTokens: Record<string, string> = {
  // Resolved against fonts guaranteed on the render host; weight carries the
  // hierarchy rather than a second family, so nothing falls back to a serif.
  '--font-display':
    "'Helvetica Neue', Helvetica, 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif",
  '--font-body':
    "'Helvetica Neue', Helvetica, 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif",

  '--type-display-xl': '72px',
  '--type-display-l': '44px',
  '--type-heading': '24px',
  '--type-subtitle': '18px',
  '--type-column-label': '13px',
  '--type-club-name': '19px',
  '--type-stat': '17px',
  '--type-stat-emphasis': '18px',
  '--type-points': '21px',
  '--type-position': '16px',
  '--type-marker': '15px',
  '--type-caption': '13px',

  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '20px',
  '--space-6': '24px',
  '--space-8': '32px',
  '--space-10': '40px',
  '--space-12': '48px',
  '--space-16': '64px',
  '--space-20': '80px',
  '--space-24': '96px',

  '--margin-x': '64px',
  '--margin-y': '56px',
  '--identity-min': '320px',
  '--col-stat': '56px',
  '--col-gd': '64px',
  '--col-points': '76px',
  '--col-form': '128px',

  '--radius-sm': '4px',
  '--radius-pill': '999px',

  '--form-square': '22px',
  '--form-gap': '3px',
  '--zone-bar': '4px',

  // Density defaults; overridden by density class on the board.
  '--row-height': '56px',
  '--row-gap': '8px',
  '--crest-size': '34px',
  '--logo-size': '96px',
};

/** Functional colours — identical across themes so meaning never shifts. */
const functionalColors: Record<string, string> = {
  '--positive': '#0A8A43',
  '--negative': '#D4183D',
  '--neutral-stat': '#5F6368',
  '--form-w': '#1F9D55',
  '--form-d': '#9AA0A6',
  '--form-l': '#D93025',
  '--zone-champions': '#0B5FD9',
  '--zone-europa': '#F5A623',
  '--zone-conference': '#17A398',
  '--zone-relegation': '#D4183D',
};

/** Light canvas surface set — shared by all themes. */
const lightCanvas: Record<string, string> = {
  '--canvas': '#FFFFFF',
  '--row-surface': '#F4F5F7',
  '--ink': '#111318',
  '--ink-muted': '#5F6368',
  '--ink-subtle': '#9AA0A6',
  '--rule': '#E8EAED',
  '--rule-strong': '#DADCE0',
  '--inverse-ink': '#FFFFFF',
};

const theme = (
  id: ThemeId,
  name: string,
  brand: {
    /** Fill colour for blocks and champion rows. */
    accent: string;
    /** Text colour that sits on the accent fill. */
    accentInk: string;
    /** Accent variant with enough contrast to set small text on white. */
    accentText: string;
  }
): ThemeTokens => ({
  id,
  name,
  cssVars: {
    ...systemTokens,
    ...functionalColors,
    ...lightCanvas,
    '--accent': brand.accent,
    '--accent-ink': brand.accentInk,
    '--accent-text': brand.accentText,
    '--points-fill': '#111318',
    '--points-ink': '#FFFFFF',
  },
});

export const THEMES: Record<ThemeId, ThemeTokens> = {
  efootball_yellow: theme('efootball_yellow', 'eFootball Yellow', {
    accent: '#F5C400',
    accentInk: '#111318',
    accentText: '#8A6D00',
  }),
  ucl_blue: theme('ucl_blue', 'Champions League Blue', {
    accent: '#0B5FD9',
    accentInk: '#FFFFFF',
    accentText: '#0B5FD9',
  }),
  premier_purple: theme('premier_purple', 'Premier League Purple', {
    accent: '#37003C',
    accentInk: '#FFFFFF',
    accentText: '#37003C',
  }),
  laliga_dark: theme('laliga_dark', 'La Liga Red', {
    accent: '#D4183D',
    accentInk: '#FFFFFF',
    accentText: '#B01230',
  }),
  custom: theme('custom', 'Custom Brand', {
    accent: '#F5C400',
    accentInk: '#111318',
    accentText: '#8A6D00',
  }),
};

export const resolveTheme = (themeId?: string): ThemeTokens => {
  if (themeId && themeId in THEMES) return THEMES[themeId as ThemeId];
  return THEMES.efootball_yellow;
};

export const themeVarsToCss = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n  ');
