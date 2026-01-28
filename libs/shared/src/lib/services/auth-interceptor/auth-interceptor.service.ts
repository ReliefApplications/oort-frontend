import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { RestService } from '../rest/rest.service';

/**
 * Shared Authentication interceptor service
 */
@Injectable({
  providedIn: 'root',
})
export class AuthInterceptorService implements HttpInterceptor {
  /**
   * Shared Authentication interceptor service
   *
   * @param authService Shared authentication service
   * @param restService Shared rest service
   * @param environment Application environment
   */
  constructor(
    private authService: AuthService,
    private restService: RestService,
    @Inject('environment') private environment: any
  ) {}

  /**
   * Intercept request to add token to headers
   *
   * @param request http request
   * @param next next interceptor in chain
   * @returns event if new token in request
   */
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.authService.getAuthToken();
    if (this.shouldAttachToken(request) && token) {
      // If we have a token, we set it to the header
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Passing the accesstoken so backend can use it in proxy request involving authorization code flow
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        request = request.clone({
          setHeaders: {
            AccessToken: accessToken,
          },
        });
      }
    }
    return next.handle(request).pipe(
      catchError((err) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401) {
            // redirect user to the logout page
          }
        }
        return throwError(() => new Error(err.error ?? err.message));
      })
    );
  }

  /**
   * Check if we should attach the token to the request
   *
   * @param request http request
   * @returns boolean indicating if token should be attached
   */
  private shouldAttachToken(request: HttpRequest<any>): boolean {
    if (request.url.startsWith(this.restService.apiUrl)) {
      return true;
    }

    const allowedDomains = this.environment.allowedAuthDomains ?? [];
    return allowedDomains.some((domain: string) =>
      request.url.startsWith(domain)
    );
  }
}
