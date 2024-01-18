import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversionComponent } from './conversion.component';
import {
  ButtonModule,
  DateModule,
  FormWrapperModule,
  IconModule,
  PaginatorModule,
  SelectMenuModule,
  SelectOptionModule,
  SpinnerModule,
  TableModule,
  TooltipModule,
} from '@oort-front/ui';
import { ListFilterComponent, SkeletonTableModule } from '@oort-front/shared';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FilterModule } from 'libs/shared/src/lib/components/filter/filter.module';
import { TranslateModule } from '@ngx-translate/core';
import { ConversionRoutingModule } from './conversion-routing.module';
import { ConversionFieldsComponent } from './conversion-fields/conversion-fields.component';

@NgModule({
  declarations: [ConversionComponent, ConversionFieldsComponent],
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
    FilterModule,
    SelectMenuModule,
    ButtonModule,
    TableModule,
    DateModule,
    ListFilterComponent,
    ConversionRoutingModule,
    SelectOptionModule,
  ],
})
export class ConversionModule {}
