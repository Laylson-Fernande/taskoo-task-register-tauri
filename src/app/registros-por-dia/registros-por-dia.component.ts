import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RegistersService } from 'src/services/app/registers.service';
import { AppSettings } from 'src/utils/app.settings';
import { AuthService } from 'src/services/authentication/auth.service';
import { MonthSummaryComponent } from '../month-summary/month-summary.component';

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

  constructor(private fb: FormBuilder, private registersService: RegistersService, private changeDetectorRef: ChangeDetectorRef,
    private appSettings: AppSettings, private authService: AuthService, private router: Router) {
    this.form = this.fb.group({
      currentDate: [new Date()]
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
    this.monthSummaryComponent.alterarData(this.currentDate);
    this.atualizarListaRegistros();
  }
  avancarProximoDia() {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.monthSummaryComponent.alterarData(this.currentDate);
    this.atualizarListaRegistros();
  }

  selecionarDia() {
    this.currentDate = new Date(this.formattedDate + " 00:00");
    this.monthSummaryComponent.alterarData(this.currentDate);
    this.atualizarListaRegistros();
  }

  async obterRegistrosPorDia(date: string) {
    this.registrosDia = await this.registersService.obterRegistrosPorDia(date);
    this.storeLastRecord();
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
}
