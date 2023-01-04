import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DistributionListsComponent } from './distribution-lists.component';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { SafeSkeletonTableModule } from '../skeleton/skeleton-table/skeleton-table.module';
import { EditDistributionListModalModule } from './components/edit-distribution-list-modal/edit-distribution-list-modal.module';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { SafeButtonModule } from '../ui/button/button.module';
import { SafeDividerModule } from '../ui/divider/divider.module';

/**
 * Module of distribution list table
 */
@NgModule({
  declarations: [DistributionListsComponent],
  imports: [
    CommonModule,
    MatTableModule,
    TranslateModule,
    SafeSkeletonTableModule,
    EditDistributionListModalModule,
    MatMenuModule,
    MatIconModule,
    SafeButtonModule,
    SafeDividerModule,
  ],
  exports: [DistributionListsComponent],
})
export class DistributionListsModule {}