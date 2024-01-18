import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConversionComponent } from './conversion.component';

/**
 * Routes of conversion module.
 */
const routes: Routes = [
  {
    path: '',
    component: ConversionComponent,
  },
];

/**
 * Conversion routing module.
 */
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConversionRoutingModule {}
