import { Component, ContentChild, ElementRef, Input, OnInit } from '@angular/core';
import { SpinnerVariant } from '../spinner/spinner-variant.enum';
import { ButtonCategory } from './button-category.enum';
import { ButtonSize } from './button-size.enum';
import { ButtonVariant } from './button-variant.enum';

@Component({
  selector: 'safe-button',
  templateUrl: './button.component.html',
  styleUrls: [
    './button.component.scss'
  ]
})
export class SafeButtonComponent implements OnInit  {

  @Input() category: ButtonCategory | string = ButtonCategory.PRIMARY;

  @Input() size: ButtonSize | string = ButtonSize.MEDIUM;

  @Input() variant: ButtonVariant | string = ButtonVariant.DEFAULT;

  @Input() block = false;

  @Input() disabled = false;

  @Input() loading = false;

  @Input() icon = '';

  @ContentChild('content') content: ElementRef | undefined;

  get color(): string {
    switch (this.variant) {
      case ButtonVariant.PRIMARY: {
        return 'primary';
      }
      case ButtonVariant.DANGER: {
        return 'warn';
      }
      default: {
        return '';
      }
    }
  }

  get spinnerVariant(): string {
    switch (this.category) {
      case ButtonCategory.PRIMARY: {
        return this.variant;
      }
      case ButtonCategory.TERTIARY: {
        return this.variant;
      }
      default: {
        switch (this.variant) {
          case ButtonVariant.DEFAULT: {
            return SpinnerVariant.PRIMARY;
          }
          default: {
            return SpinnerVariant.LIGHT;
          }
        }
      }
    }
  }

  get isIconButton(): boolean {
    return this.content ? true : false;
  }

  constructor() {}

  ngOnInit(): void {}
}
