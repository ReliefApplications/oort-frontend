import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutsTabRoutingModule } from './layouts-tab-routing.module';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';
import { MenuModule, UiModule } from '@oort-front/ui';
import { TranslateModule } from '@ngx-translate/core';
import {
  SafeButtonModule,
  SafeDateModule,
  SafeSkeletonTableModule,
  SafeEmptyModule,
} from '@oort-front/safe';
import { LayoutsTabComponent } from './layouts-tab.component';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';

/**
 * Layouts tab of resource page
 */
@NgModule({
  declarations: [LayoutsTabComponent],
  imports: [
    CommonModule,
    LayoutsTabRoutingModule,
    MatIconModule,
    MenuModule,
    SafeButtonModule,
    TranslateModule,
    OverlayModule,
    SafeDateModule,
    SafeSkeletonTableModule,
    MatPaginatorModule,
    SafeEmptyModule,
    UiModule,
  ],
})
export class LayoutsTabModule {}
