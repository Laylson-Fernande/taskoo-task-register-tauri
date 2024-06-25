import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { AppSettings } from 'src/utils/app.settings';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService, private appSettings: AppSettings) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if(req.url.endsWith("auth")){
        return next.handle(req);
    }

    if(!this.authService.isAuthenticated() && !req.url.endsWith("auth")){
        this.authService.login(this.appSettings.user_email, this.appSettings.user_password);
    }
    const token = sessionStorage.getItem('token');
    const x_api_key = sessionStorage.getItem('x-api-key');
    if (token && x_api_key) {
      req = req.clone({
        setHeaders: {
          "token": token,
          "x-api-key":x_api_key
        }
      });
    }
    return next.handle(req);
  }
}
