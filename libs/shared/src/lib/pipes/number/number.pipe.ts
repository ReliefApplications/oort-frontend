import { formatNumber } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

/**
 * Sanitize given html string to render in the template
 */
@Pipe({ name: 'sharedNumber' })
export class NumberPipe implements PipeTransform {
  /**
   * Formats string if it is a number, else leave it alone
   *
   * @param {string} value potentially a number
   * @returns {string} formatted number
   */
  transform(value: string): string {
    const number = parseFloat(value);
    return isNaN(number) ? value : formatNumber(number, 'en');
  }
}
