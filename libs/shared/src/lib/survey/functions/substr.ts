import { GlobalOptions } from '../types';

/**
 * Retruns substring
 *
 * @param params The param to convert to string.
 * @returns the string
 */
const substring = (params: any[]) => {
  const [str, start, end] = params;

  if (typeof str !== 'string' || typeof start !== 'number') {
    return '';
  }

  return str.substring(start, typeof end === 'number' ? end : undefined);
};

/**
 *  Generator for the custom function string.
 *
 * @param _ Global options
 * @returns The custom function string
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (_: GlobalOptions) => substring;
