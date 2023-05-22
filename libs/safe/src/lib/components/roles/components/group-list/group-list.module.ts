import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeGroupListComponent } from './group-list.component';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { TranslateModule } from '@ngx-translate/core';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { SafeSkeletonTableModule } from '../../../skeleton/skeleton-table/skeleton-table.module';
import { MenuModule, ButtonModule } from '@oort-front/ui';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';

/**
 * SafeGroupsModule manages modules and components
 * related to the groups tab
 */
@NgModule({
  declarations: [SafeGroupListComponent],
  imports: [
    CommonModule,
    TranslateModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    SafeSkeletonTableModule,
    MenuModule,
    MatTableModule,
    ButtonModule,
  ],
  exports: [SafeGroupListComponent],
})
export class SafeGroupListModule {}
