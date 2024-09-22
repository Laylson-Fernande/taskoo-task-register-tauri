import { Component, ChangeDetectorRef, ViewChild, NgZone, OnInit, OnDestroy } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegistersService } from 'src/services/app/registers.service';
import { AppSettings } from 'src/utils/app.settings';
import { AuthService } from 'src/services/authentication/auth.service';
import { MonthSummaryComponent } from '../month-summary/month-summary.component';
import { EventService } from 'src/utils/event-service';
import { Subscription } from 'rxjs';
import { listen } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { DaySummaryComponent } from '../day-summary/day-summary.component';
import { PrimeNGConfig } from 'primeng/api';

@Component({
  selector: 'app-registros-por-dia',
  templateUrl: './registros-por-dia.component.html',
  styleUrls: ['./registros-por-dia.component.css']
})
export class RegistrosPorDiaComponent {
  currentDate: Date = new Date();
  formattedDate: any = '';

  form: FormGroup;

  @ViewChild(MonthSummaryComponent) monthSummaryComponent!: MonthSummaryComponent;
  @ViewChild(DaySummaryComponent) daySummaryComponent!: DaySummaryComponent;

  specialDays: Set<string> = new Set([
    '2024-09-15', // exemplo de data
    '2024-09-25'
  ]);

  constructor(private fb: FormBuilder, private registersService: RegistersService, private changeDetectorRef: ChangeDetectorRef,
    private appSettings: AppSettings, private authService: AuthService, private router: Router, private zone: NgZone, private eventService: EventService, private primeNgConfig: PrimeNGConfig) {
    this.form = this.fb.group({
      currentDate: [new Date()]
    });

    listen('atualizar-dashboard', (event) => {
      this.zone.run(() => {
        this.atualizarListaRegistros();
      });
    });

    this.primeNgConfig.setTranslation({
      apply: 'Aplicar',
      clear: 'Limpar',
      accept: 'Sim',
      reject: 'Não',
      firstDayOfWeek: 0,
      dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
      dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
      dayNamesMin: ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa'],
      monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
        'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
      monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      today: 'Hoje'
  });
  }

  registrosDia: any;

  ngOnInit() {
    this.inicializar();
  }

  async inicializar(){
    await this.isAuthenticated();
    this.formattedDate = formatDate(this.currentDate, 'yyyy-MM-dd', 'en-US');
    this.obterRegistrosPorDia(this.formattedDate);
  }

  async isAuthenticated() {
    if (await this.appSettings.isIntegratedOrbit() && !this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  atualizarListaRegistros() {
    this.formattedDate = formatDate(this.currentDate, 'yyyy-MM-dd', 'en-US');
    this.obterRegistrosPorDia(this.formattedDate);
    this.changeDetectorRef.detectChanges();
  }

  voltarDiaAnterior() {
    this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.alterarData();
  }
  avancarProximoDia() {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.alterarData();
  }

  selecionarDia() {
    this.currentDate = new Date(this.formattedDate + " 00:00");
    this.alterarData();
  }

  alterarData(){
    this.monthSummaryComponent.alterarData(this.currentDate);
    //this.daySummaryComponent.alterarData(this.currentDate);
    this.atualizarListaRegistros();
  }

  async obterRegistrosPorDia(date: string) {
    this.registrosDia = await this.registersService.obterRegistrosPorDia(date);
    this.storeLastRecord();
    this.daySummaryComponent.atualizarResumo(this.currentDate);
  }

  storeLastRecord() {
    let todayString = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    if (todayString == this.formattedDate) {
      if (this.registrosDia.length > 0) {
        localStorage.setItem("lastRegister", JSON.stringify(this.registrosDia[0]));
      } else {
        localStorage.removeItem("lastRegister");
      }
    }
  }

  isIntegratedOrbit(){
    return this.appSettings.isIntegratedOrbit();
  }

  sincronizarRegistrosOrbit(integradoOrbit: boolean) {
    if(integradoOrbit){
      this.atualizarListaRegistros();
    } else {
      this.router.navigate(['/login']);
    }
  }

  getDayClass(date: any, month: number, year: number): string {
    const formattedDate = `${year}-${('0' + (month + 1)).slice(-2)}-${('0' + date.day).slice(-2)}`;
    if (this.specialDays.has(formattedDate)) {
      return 'highlight-day'; // Classe CSS para dias especiais
    }
    return '';
  }
}
