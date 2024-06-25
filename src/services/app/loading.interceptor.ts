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

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    this.loadingService.setLoading(true); // Inicia o carregamento

    return next.handle(request).pipe(
      finalize(() => {
        this.loadingService.setLoading(false); // Finaliza o carregamento
      })
    );
  }
}
