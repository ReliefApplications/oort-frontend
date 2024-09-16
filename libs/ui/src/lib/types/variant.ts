/**
 * Variant
 */
export const variants = [
  'default',
  'primary',
  'success',
  'danger',
  'grey',
  'light',
  'warning',
  'lighter',
] as const;
export type Variant = (typeof variants)[number];
