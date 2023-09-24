import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabSettingsComponent } from './tab-settings.component';
import { WidgetGridModule } from '../../../widget-grid/widget-grid.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule, FormWrapperModule } from '@oort-front/ui';

/**
 * Tab settings module, part of tabs widget settings.
 */
@NgModule({
  declarations: [TabSettingsComponent],
  imports: [
    CommonModule,
    WidgetGridModule,
    FormsModule,
    ReactiveFormsModule,
    FormWrapperModule,
    ButtonModule,
  ],
  exports: [TabSettingsComponent],
})
export class TabSettingsModule {}