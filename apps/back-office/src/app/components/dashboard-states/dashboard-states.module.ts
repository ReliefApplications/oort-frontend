import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStatesComponent } from './dashboard-states.component';
import { EmptyModule } from '@oort-front/shared';
import { ButtonModule } from '@oort-front/ui';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Module for the DashboardStatesComponent
 */
@NgModule({
  declarations: [DashboardStatesComponent],
  imports: [CommonModule, EmptyModule, ButtonModule, TranslateModule],
  exports: [DashboardStatesComponent],
})
export class DashboardStatesModule {}
