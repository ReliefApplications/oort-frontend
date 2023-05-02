import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import {
  SafeAccessModule,
  SafeRecordHistoryModule,
  SafeWidgetGridModule,
  SafeButtonModule,
  SafeSkeletonModule,
  SafeAlertModule,
  SafeSearchMenuModule,
  SafeIconModule,
  SafeModalModule,
  SafeEditableTextModule,
  FullScreenModule,
  SafeGraphQLSelectModule,
  DashboardFilterModule,
} from '@oort-front/safe';
import { ShareUrlComponent } from './components/share-url/share-url.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';

/**
 * Dashboard page module.
 */
@NgModule({
  declarations: [DashboardComponent, ShareUrlComponent],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    SafeAccessModule,
    SafeWidgetGridModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule,
    ClipboardModule,
    SafeRecordHistoryModule,
    SafeButtonModule,
    SafeIconModule,
    TranslateModule,
    OverlayModule,
    SafeSearchMenuModule,
    SafeSkeletonModule,
    SafeAlertModule,
    SafeModalModule,
    SafeEditableTextModule,
    FullScreenModule,
    SafeGraphQLSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    DashboardFilterModule,
  ],
  exports: [DashboardComponent],
})
export class DashboardModule {}
