import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeEditAggregationModalComponent } from './edit-aggregation-modal.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { SafeModalModule } from '../../ui/modal/modal.module';

/**
 * Modal to edit aggregation settings.
 */
@NgModule({
  declarations: [SafeEditAggregationModalComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    SafeModalModule,
  ],
  exports: [SafeEditAggregationModalComponent],
})
export class SafeEditAggregationModalModule {}
