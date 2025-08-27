import 'chart.js';

/**
 * Extend chartjs type so it includes the custom plugins options.
 */

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, jsdoc/require-jsdoc
  interface PluginOptionsByType<TType extends string = string> {
    noData?: {
      loading?: boolean;
      display?: boolean;
      text?: string;
    };
  }
}
