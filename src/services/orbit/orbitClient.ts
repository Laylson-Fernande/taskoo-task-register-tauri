import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../authentication/auth.service';
import { AppSettings } from 'src/utils/app.settings';

// Interface para definir os parâmetros da requisição
export interface OrbitParams {
  body?: any;
  queryString?: string;
  pathParams?: any;
}

@Injectable({
  providedIn: 'root'
})
export class OrbitClient {
  private apiUrl_officeservice = 'https://api.orbitspot.com/officeservice/api'; // Substitua pela URL da sua API

  private apiUrl = '';

  constructor(private http: HttpClient, private router: Router, private authService: AuthService, private appSettings: AppSettings) { }

  async verificarIntegracaoOrbit() {
    if(this.authService.isAuthenticated()){
      return true;
    } else {
      if (this.appSettings.isIntegratedOrbit()) {
        try {
          await this.authService.login(this.appSettings.getUserOrbitEmail(), this.appSettings.getUserOrbitPassword());
          return true;
        } catch (erro) {
          this.router.navigate(['/login']);
        }
      }
    }
    return false;
  }

  obterRegistrosPorDia(params?: OrbitParams): Observable<any> {
    const url = `${this.apiUrl_officeservice}/time-sheet/release-by-day${params?.queryString ? '?' + params.queryString : ''}`;
    return this.http.get(url, { params: params?.body });
  }

  obterContratosPorFuncionario(): Observable<any> {
    const url = `${this.apiUrl_officeservice}/service-contract-association/by-employee`;
    return this.http.get(url);
  }

  criarRegistro(registro: any): Observable<any> {
    const body: any = {
      contract_id: registro.contract_id,
      description: registro.description,
      end_at: registro.end_at,
      hour_type: registro.hour_type,
      release_date: registro.release_date,
      start_at: registro.start_at,
    }
    return this.http.post(`${this.apiUrl_officeservice}/time-sheet`, body);
  }

  alterarRegistro(id: string, registro: any): Observable<any> {
    const body: any = {
      contract_id: registro.contract_id,
      description: registro.description,
      end_at: registro.end_at,
      hour_type: registro.hour_type,
      start_at: registro.start_at,
    }
    return this.http.put(`${this.apiUrl_officeservice}/time-sheet/${id}`, body);
  }

  deletarRegistro(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl_officeservice}/time-sheet/${id}`);
  }

  obterResumoTotalMes(release_date_start: string, release_date_end: string): Observable<any> {
    const url = `${this.apiUrl_officeservice}/time-sheet/month-total-summary?release_date_start=${release_date_start}&release_date_end=${release_date_end}`;
    return this.http.get(url, {});
  }

  obterResumoStatusRegitros(release_date_start: string, release_date_end: string): Observable<any> {
    const url = `${this.apiUrl_officeservice}/time-sheet/status-hours-recorded-summary?release_date_start=${release_date_start}&release_date_end=${release_date_end}`;
    return this.http.get(url, {});
  }

  obterResumoHoraTrabalho(release_date_start: string, release_date_end: string): Observable<any> {
    const url = `${this.apiUrl_officeservice}/time-sheet/working-hours-summary?release_date_start=${release_date_start}&release_date_end=${release_date_end}&week_summary=false`;
    return this.http.get(url, {});
  }
}
