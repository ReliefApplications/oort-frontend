import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesRoutingModule } from './resources-routing.module';
import { ResourcesComponent } from './resources.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  SkeletonTableModule,
  DateModule as SharedDateModule,
  ListFilterComponent,
} from '@oort-front/shared';
import { FilterComponent } from './filter/filter.component';
import { TranslateModule } from '@ngx-translate/core';
import {
  MenuModule,
  ButtonModule,
  SpinnerModule,
  TableModule,
  FormWrapperModule,
  IconModule,
  PaginatorModule,
  DateModule,
  TooltipModule,
  DialogModule,
  ErrorMessageModule,
  SelectMenuModule,
  DividerModule,
} from '@oort-front/ui';
import { IdShapeModalComponent } from './id-shape-modal/id-shape-modal.component';
import { ImportFieldModalComponent } from './import-field-modal/import-field-modal.component';

/**
 * Resources page module.
 */
@NgModule({
  declarations: [
    ResourcesComponent,
    FilterComponent,
    IdShapeModalComponent,
    ImportFieldModalComponent,
  ],
  imports: [
    CommonModule,
    ResourcesRoutingModule,
    SpinnerModule,
    IconModule,
    MenuModule,
    FormsModule,
    PaginatorModule,
    ReactiveFormsModule,
    TranslateModule,
    SkeletonTableModule,
    SharedDateModule,
    ButtonModule,
    FormWrapperModule,
    TableModule,
    DateModule,
    TooltipModule,
    ListFilterComponent,
    DialogModule,
    ErrorMessageModule,
    SelectMenuModule,
    DividerModule,
  ],
  exports: [ResourcesComponent],
})
export class ResourcesModule {}
