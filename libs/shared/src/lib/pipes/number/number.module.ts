import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumberPipe } from './number.pipe';

/**
 * Sanitize HTML module.
 * Include pipe to set sanitize the needed html string value in the template
 */
@NgModule({
  declarations: [NumberPipe],
  imports: [CommonModule],
  exports: [NumberPipe],
})
export class NumberModule {}
