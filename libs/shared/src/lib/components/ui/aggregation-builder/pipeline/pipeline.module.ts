import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PipelineComponent } from './pipeline.component';
import { QueryBuilderModule } from '../../../query-builder/query-builder.module';
import { TranslateModule } from '@ngx-translate/core';
import { GroupStageComponent } from './group-stage/group-stage.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddFieldStageComponent } from './add-field-stage/add-field-stage.component';
import { ExpressionsComponent } from './expressions/expressions.component';
import { FieldDropdownComponent } from './field-dropdown/field-dropdown.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FilterModule } from '../../../filter/filter.module';
import { SortStageComponent } from './sort-stage/sort-stage.component';
import { LabelStageComponent } from './label-stage/label-stage.component';
import {
  TextareaModule,
  FormWrapperModule,
  MenuModule,
  TooltipModule,
  ButtonModule,
  ExpansionPanelModule,
  SelectMenuModule,
  IconModule,
  CheckboxModule,
  AlertModule,
} from '@oort-front/ui';
import { UserStageComponent } from './user-stage/user-stage.component';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ResizableModule } from 'angular-resizable-element';

/**
 * Aggregation builder pipeline module.
 */
@NgModule({
  declarations: [
    PipelineComponent,
    GroupStageComponent,
    AddFieldStageComponent,
    ExpressionsComponent,
    FieldDropdownComponent,
    SortStageComponent,
    LabelStageComponent,
    UserStageComponent,
  ],
  imports: [
    CommonModule,
    QueryBuilderModule,
    MenuModule,
    TranslateModule,
    ExpansionPanelModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    IconModule,
    TooltipModule,
    FilterModule,
    TextareaModule,
    ButtonModule,
    FormWrapperModule,
    SelectMenuModule,
    CheckboxModule,
    MonacoEditorModule,
    ResizableModule,
    AlertModule,
  ],
  exports: [
    PipelineComponent,
    GroupStageComponent,
    AddFieldStageComponent,
    ExpressionsComponent,
    FieldDropdownComponent,
    SortStageComponent,
    LabelStageComponent,
  ],
})
export class PipelineModule {}
