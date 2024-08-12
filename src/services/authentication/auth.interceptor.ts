import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { AppSettings } from 'src/utils/app.settings';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService, private appSettings: AppSettings, private router: Router) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if(req.url.endsWith("auth")){
        return next.handle(req);
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
