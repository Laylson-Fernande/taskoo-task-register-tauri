import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { LoadingService } from './loading.service'; // Crie um serviço para gerenciar o estado de carregamento

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loadingService: LoadingService) {}

  notShowLoading: string[] = [
    "month-total-summary",
    "status-hours-recorded-summary",
    "working-hours-summary",
    "daily-summary",
  ]

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const index = this.notShowLoading.findIndex(endpoint => request.url.toLocaleLowerCase().includes(endpoint.toLocaleLowerCase()));
    if(index == -1){
      this.loadingService.setLoading(true);
    }
    return next.handle(request).pipe(
      finalize(() => {
        this.loadingService.setLoading(false);
      })
    );
  }
}
