import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';
import { AuthService } from '@oort-front/shared';
import { firstValueFrom } from 'rxjs';

/**
 * Guard to check if user is authenticated or not.
 */
@Injectable({
  providedIn: 'root',
})
export class AccessGuard implements CanActivate {
  /**
   * Guard to check if user is authenticated or not.
   *
   * @param authService Shared authentication service
   * @param router Angular router
   */
  constructor(private authService: AuthService, private router: Router) {}

  /**
   * Defines the logic of the guard.
   * Passes if the user is authenticated.
   *
   * @returns Can the user continue navigation
   */
  async canActivate(): Promise<boolean | UrlTree> {
    const loaded = await firstValueFrom(this.authService.isDoneLoading$);
    if (!loaded) {
      return false;
    }

    const res = await firstValueFrom(this.authService.getProfile());
    if (res.data.me) {
      this.authService.user.next(res.data.me);
      return true;
    } else {
      if (this.authService.account) {
        this.authService.logout();
      } else {
        this.router.navigate(['/auth']);
      }

      return false;
    }
  }
}
