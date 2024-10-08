import { Component, ChangeDetectorRef, ViewChild, NgZone, OnInit, OnDestroy, inject } from '@angular/core';
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
import { WebviewWindow } from '@tauri-apps/api/window'
import { DaySummaryComponent } from '../day-summary/day-summary.component';
import { NgbCalendar, NgbDate, NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from 'src/services/app/loading.service';
import { AppUtils } from 'src/utils/app.utils';

@Component({
  selector: 'app-registros-por-dia',
  templateUrl: './registros-por-dia.component.html',
  styleUrls: ['./registros-por-dia.component.css']
})
export class RegistrosPorDiaComponent {

  private calendar = inject(NgbCalendar);
  modelDatePicker: NgbDateStruct;

  currentDate: Date = new Date();
  //formattedDate: any = '';

  isSyncing = false;
  //isAutoSyncOrbit = false;
  form: FormGroup;

  @ViewChild(MonthSummaryComponent) monthSummaryComponent!: MonthSummaryComponent;
  @ViewChild(DaySummaryComponent) daySummaryComponent!: DaySummaryComponent;

  datesWithWarning: { day: number, month: number, date: Date, status: String }[] = [];

  constructor(private fb: FormBuilder, private registersService: RegistersService, private changeDetectorRef: ChangeDetectorRef,
    private appSettings: AppSettings, private authService: AuthService, private router: Router, private zone: NgZone, private eventService: EventService, public loadingService: LoadingService) {
    this.form = this.fb.group({
      currentDate: [new Date()]
    });
    this.modelDatePicker = this.calendar.getToday();
    //this.isAutoSyncOrbit = this.appSettings.isAutoSyncOrbit();

    listen('atualizar-dashboard', (event) => {
      this.zone.run(() => {
        this.atualizarListaRegistros();
      });
    });

    listen('SINCRONIZAR-REGISTROS', (event) => {
      this.zone.run(() => {
        if(this.isAutoSyncOrbit() && this.getCalendarAlertType() !== ''){
          this.registersService.syncRegistersWithOrbit();
        }
      });
    });

  }

  registrosDia: any;

  ngOnInit() {
    this.inicializar();
  }

  async inicializar() {
    await this.isAuthenticated();
    this.obterRegistrosPorDia(this.formattedDate());
    this.updateDatesWithWarning();
  }

  async isAuthenticated() {
    if (await this.appSettings.isIntegratedOrbit() && !this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  atualizarListaRegistros() {
    this.obterRegistrosPorDia(this.formattedDate());
    this.updateDatesWithWarning();
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
    //this.currentDate = new Date(this.formattedDate + " 00:00");
    this.currentDate = new Date(this.modelDatePicker.year, this.modelDatePicker.month - 1, this.modelDatePicker.day);
    this.alterarData();
  }

  today() {
    this.modelDatePicker = this.calendar.getToday();
    this.selecionarDia();
  }

  async alterarData() {
    this.monthSummaryComponent.alterarData(this.currentDate);
    //this.atualizarListaRegistros();
    this.modelDatePicker = { year: this.currentDate.getFullYear(), month: this.currentDate.getMonth() + 1, day: this.currentDate.getDate() }
    this.updateDatesWithWarning();
    this.emitAtualizarDashboard();
  }

  async emitAtualizarDashboard() {
    const app = await WebviewWindow.getByLabel('main');
    if (app) {
      await app.emit("atualizar-dashboard", "");
    }
  }

  async updateDatesWithWarning() {
    this.datesWithWarning = await this.registersService.obterDaysWithWarning(structuredClone(this.currentDate));
  }

  formattedDate() {
    return formatDate(this.currentDate, 'yyyy-MM-dd', 'en-US');
  }

  isDayWithWarning(date: NgbDate) {
    const index = this.datesWithWarning.findIndex(withWarning => date.month === withWarning.month && date.day === withWarning.day && withWarning.status == 'PENDING');
    return index !== -1;
  }

  isDayWithError(date: NgbDate) {
    const index = this.datesWithWarning.findIndex(withWarning => date.month === withWarning.month && date.day === withWarning.day && withWarning.status == 'ERROR');
    return index !== -1;
  }

  getCalendarAlertType() {
    const pending = this.datesWithWarning.findIndex(withWarning => withWarning.status == 'PENDING');
    const error = this.datesWithWarning.findIndex(withWarning => withWarning.status == 'ERROR');
    if (error !== -1) {
      return "ERROR";
    } else if (pending !== -1) {
      return "PENDING";
    }
    return '';
  }

  async obterRegistrosPorDia(date: string) {
    this.registrosDia = await this.registersService.obterRegistrosPorDia(date);
    this.daySummaryComponent.atualizarResumo(this.currentDate);
  }

  isIntegratedOrbit() {
    return this.appSettings.isIntegratedOrbit();
  }

  isAutoSyncOrbit() {
    return this.appSettings.isAutoSyncOrbit();
  }
  async changeAutoSyncOrbit() {
    //this.isAutoSyncOrbit = !this.isAutoSyncOrbit;
    await this.appSettings.setAutoSyncOrbitDefinition(!this.isAutoSyncOrbit());
    if (this.isAutoSyncOrbit()) {
      this.sincronizarRegistrosOrbit(true);
    }
  }

  async sincronizarRegistrosOrbit(integradoOrbit: boolean) {
    if (integradoOrbit) {
      //this.atualizarListaRegistros();
      try {
        this.loadingService.setSyncing(true);
        this.changeDetectorRef.detectChanges();
        await this.registersService.syncRegistersWithOrbit();
      } finally {
        this.loadingService.setSyncing(false);
        this.emitAtualizarDashboard();
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

}
