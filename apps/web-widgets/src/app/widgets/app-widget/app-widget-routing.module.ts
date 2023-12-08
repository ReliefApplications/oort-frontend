import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

/**
 * List of top level routes of the Front-Office.
 */
const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: ':id',
    loadChildren: () =>
      import('./application/application.module').then(
        (m) => m.ApplicationModule
      ),
    // canActivate: [AccessGuard],
  },
  // {
  //   path: '**',
  //   redirectTo: '/',
  //   pathMatch: 'full',
  // },
];

/**
 * Application routing module.
 */
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class ApplicationWidgetRoutingModule {}
