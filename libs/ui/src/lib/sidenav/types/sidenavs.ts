/**
 * Sidenav display types
 */
export const sidenavs = ['side', 'over'] as const;
export type SidenavTypes = (typeof sidenavs)[number];
/**
 * Sidenav position types
 */
export const sidenavPositions = ['start', 'end'] as const;
export type SidenavPositionTypes = (typeof sidenavPositions)[number];
/**
 * Sidenav position types
 */
export const sidenavVariants = ['original', 'new'] as const;
export type SidenavVariantsTypes = (typeof sidenavVariants)[number];
