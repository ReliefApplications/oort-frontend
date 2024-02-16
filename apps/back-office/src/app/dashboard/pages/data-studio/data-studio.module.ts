import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataStudioComponent } from '../data-studio/data-studio.component';
import {
  ButtonModule,
  CheckboxModule,
  DateModule,
  FormWrapperModule,
  IconModule,
  PaginatorModule,
  SelectMenuModule,
  SelectOptionModule,
  SpinnerModule,
  TableModule,
  TabsModule,
  TooltipModule,
  ExpansionPanelModule,
  GraphQLSelectModule,
  RadioModule,
  ToggleModule,
} from '@oort-front/ui';
import { ListFilterComponent, SkeletonTableModule } from '@oort-front/shared';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DataStudioRoutingModule } from './data-studio-routing.module';
import { DataGenerationFieldsComponent } from './data-generation-fields/data-generation-fields.component';
import { SurveyModule } from 'survey-angular-ui';

@NgModule({
  declarations: [DataStudioComponent, DataGenerationFieldsComponent],
  imports: [
    CommonModule,
    TooltipModule,
    PaginatorModule,
    TranslateModule,
    DateModule,
    SkeletonTableModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerModule,
    FormWrapperModule,
    IconModule,
    SelectMenuModule,
    ButtonModule,
    TableModule,
    DateModule,
    ListFilterComponent,
    DataStudioRoutingModule,
    SelectOptionModule,
    TabsModule,
    CheckboxModule,
    ExpansionPanelModule,
    GraphQLSelectModule,
    RadioModule,
    ToggleModule,
    SurveyModule,
  ],
})
export class DataStudioModule {}
