import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RolesComponent } from './roles.component';
import { IsNormalizeUrl } from '../../../guards/normalize-url.guard';

/** List of routes of Roles page */
const routes: Routes = [
  {
    path: '',
    component: RolesComponent,
    data: { inApplication: true },
    canActivate: [IsNormalizeUrl],
  },
];

/**
 * Routing module of Roles page.
 */
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RolesRoutingModule {}
