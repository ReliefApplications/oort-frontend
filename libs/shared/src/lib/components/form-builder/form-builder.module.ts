import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilderComponent } from './form-builder.component';
import { TranslateModule } from '@ngx-translate/core';
import { DateInputModule } from '@progress/kendo-angular-dateinputs';
import { DialogModule } from '@oort-front/ui';
import { SurveyCreatorModule } from 'survey-creator-angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { CustomJSONEditorComponent } from './custom-json-editor/custom-json-editor.component';
// Add new languages
import 'survey-core/i18n/french';
import 'survey-core/i18n/spanish';

/**
 * FormBuilderModule is a class used to manage all the modules and components
 * related to the form builder.
 */
@NgModule({
  declarations: [FormBuilderComponent],
  imports: [
    CommonModule,
    DialogModule,
    TranslateModule,
    DateInputModule,
    SurveyCreatorModule,
    FormsModule,
    MonacoEditorModule,
    ReactiveFormsModule,
    CustomJSONEditorComponent,
  ],
  exports: [FormBuilderComponent],
})
export class FormBuilderModule {}
