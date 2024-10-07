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
 * Available variants for the sidenav styling
 * Use 'original' to get the default look
 * Use 'new' to get the oort revamp look (TODO: Horizontal compatibility)
 */
export const sidenavVariants = ['original', 'new'] as const;
export type SidenavVariantsTypes = (typeof sidenavVariants)[number];
/**
 * Sidenav widths
 */
export const NEW_SIDENAV_WIDTH_PX = {
  expanded: '240px',
  collapsed: '92px',
};
