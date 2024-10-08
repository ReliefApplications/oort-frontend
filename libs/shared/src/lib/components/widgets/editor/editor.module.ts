import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorComponent } from './editor.component';
import {
  ButtonModule,
  IconModule,
  SpinnerModule,
  TooltipModule,
} from '@oort-front/ui';
import { TranslateModule } from '@ngx-translate/core';
import { HtmlWidgetContentModule } from '../common/html-widget-content/html-widget-content.module';

/**
 * Module for the sharedEditor component
 */
@NgModule({
  declarations: [EditorComponent],
  imports: [
    CommonModule,
    ButtonModule,
    TranslateModule,
    HtmlWidgetContentModule,
    SpinnerModule,
    IconModule,
    TooltipModule,
  ],
  exports: [EditorComponent],
})
export class EditorModule {}
