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
 * Sidenav widths
 */
export const SIDENAV_WIDTH_PX = {
  expanded: '240px',
  collapsed: '92px',
};
