import { Pipe, PipeTransform } from '@angular/core';

/**
 * A pipe that strips HTML tags from a string.
 * It uses the browser's DOM parsing capabilities to achieve this.
 */
@Pipe({
  name: 'sharedStripHtml',
  standalone: true,
})
export class StripHtmlPipe implements PipeTransform {
  /**
   * Transforms a string containing HTML into a plain text string.
   *
   * @param value The input string, potentially containing HTML.
   * @returns The input string with all HTML tags removed.
   */
  transform(value: string): string {
    // Create a temporary DOM element to leverage the browser's parsing
    const tempElement = document.createElement('div');
    tempElement.innerHTML = value;
    return tempElement.innerText; // Return the plain text
  }
}
