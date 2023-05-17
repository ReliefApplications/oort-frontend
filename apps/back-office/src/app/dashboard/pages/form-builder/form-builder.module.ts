import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilderRoutingModule } from './form-builder-routing.module';
import { FormBuilderComponent } from './form-builder.component';
import {
  SafeAccessModule,
  SafeFormBuilderModule,
  SafeButtonModule,
  SafeDateModule,
  SafeEditableTextModule,
} from '@oort-front/safe';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { HistoryComponent } from './components/history/history.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslateModule } from '@ngx-translate/core';
import { UiModule } from '@oort-front/ui';

/**
 * Form builder module.
 */
@NgModule({
  declarations: [FormBuilderComponent, HistoryComponent],
  imports: [
    CommonModule,
    FormBuilderRoutingModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    SafeFormBuilderModule,
    SafeAccessModule,
    SafeButtonModule,
    TranslateModule,
    SafeDateModule,
    SafeEditableTextModule,
    UiModule,
  ],
  exports: [FormBuilderComponent],
})
export class FormBuilderModule {}
