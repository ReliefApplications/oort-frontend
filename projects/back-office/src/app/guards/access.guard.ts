import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import {
  SafeAuthService,
  SafeSnackBarService,
  NOTIFICATIONS,
} from '@safe/builder';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AccessGuard implements CanActivate {
  constructor(
    private authService: SafeAuthService,
    private snackBar: SafeSnackBarService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return this.authService.getProfile().pipe(
      map((res) => {
        if (res.data.me) {
          if (res.data.me.isAdmin) {
            this.authService.user.next(res.data.me);
            return true;
          } else {
            this.snackBar.openSnackBar(
              NOTIFICATIONS.accessNotProvided('platform'),
              { error: true }
            );
            console.log(1);
            this.authService.logout();
            this.router.navigate(['/auth']);
            return false;
          }
        } else {
          if (this.authService.account) {
            console.log(2);
            this.authService.logout();
          } else {
            this.router.navigate(['/auth']);
          }
          return false;
        }
      })
    );
  }
}
