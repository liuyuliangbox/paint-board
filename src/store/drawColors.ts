/** Default brush swatches (ColorSwatchList max is 6). White/yellow help on dark maps. */
export const DEFAULT_DRAW_COLORS = [
  '#000000',
  '#65CC8A',
  '#FF6363',
  '#3A59D1',
  '#FFFFFF',
  '#F5C518'
]

export const LEGACY_DEFAULT_DRAW_COLORS = [
  '#000000',
  '#65CC8A',
  '#FF6363',
  '#3A59D1'
]

export const sameColorList = (colors: unknown, expected: string[]) =>
  Array.isArray(colors) &&
  colors.length === expected.length &&
  colors.every((color, index) => color === expected[index])
