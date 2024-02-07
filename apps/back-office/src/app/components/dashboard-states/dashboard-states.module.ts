import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStatesComponent } from './dashboard-states.component';
import { EmptyModule } from '@oort-front/shared';
import { ButtonModule, TableModule, ToggleModule } from '@oort-front/ui';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

/**
 * Module for the DashboardStatesComponent
 */
@NgModule({
  declarations: [DashboardStatesComponent],
  imports: [
    CommonModule,
    EmptyModule,
    ButtonModule,
    TranslateModule,
    ToggleModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
  ],
  exports: [DashboardStatesComponent],
})
export class DashboardStatesModule {}
