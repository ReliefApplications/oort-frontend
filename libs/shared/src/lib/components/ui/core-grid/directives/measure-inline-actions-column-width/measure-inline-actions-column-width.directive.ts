import {
  AfterViewChecked,
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Output,
} from '@angular/core';

/**
 * Directive to measure the width of the inline actions column
 * Can be edited later to add some padding if required.
 */
@Directive({
  selector: '[sharedMeasureInlineActionsColumnWidth]',
  standalone: true,
})
export class MeasureInlineActionsColumnWidthDirective
  implements AfterViewChecked
{
  /** Emits the measured width */
  @Output() widthMeasured = new EventEmitter<number>();
  /** Last measured width to avoid emitting too many events */
  private lastWidth = 0;
  /** Element reference */
  private el = inject(ElementRef);

  ngAfterViewChecked(): void {
    const width = this.el.nativeElement.getBoundingClientRect().width;
    if (width && Math.abs(width - this.lastWidth) > 1) {
      this.lastWidth = width;
    }
  }
}
