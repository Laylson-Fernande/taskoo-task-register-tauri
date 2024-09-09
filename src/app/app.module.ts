import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule , FormsModule  } from '@angular/forms';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { MatDialogModule } from '@angular/material/dialog';

import { HoraMaskDirective } from "src/utils/hora-mask.directive";

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from "./app.component";
import { AuthInterceptor } from '../services/authentication/auth.interceptor';
import { LoadingInterceptor } from "src/services/app/loading.interceptor";

import { RegistroHoraItemComponent } from './registro-hora-item/registro-hora-item.component';
import { RegistrosPorDiaComponent } from './registros-por-dia/registros-por-dia.component';
import { RegistroHoraEditarComponent } from './registro-hora-editar/registro-hora-editar.component';
import { ConfirmacaoExclusaoRegistroComponent } from './confirmacao-exclusao-registro/confirmacao-exclusao-registro.component';
import { RegistroHoraEditarDialogComponent } from './registro-hora-editar-dialog/registro-hora-editar-dialog.component';
import { NotificationComponent } from './notification/notification.component';
import { DialogWindowComponent } from './dialog-window/dialog-window.component';
import { AppWindowComponent } from './app-window/app-window.component';
import { DialogStartRemindersComponent } from './dialog-start-reminders/dialog-start-reminders.component';
import { LoginComponent } from './login/login.component';
import { DialogNoteReminderComponent } from './dialog-note-reminder/dialog-note-reminder.component';
import { ConfiguracoesComponent } from './configuracoes/configuracoes.component';
import { MonthSummaryComponent } from './month-summary/month-summary.component';
import { DaySummaryComponent } from './day-summary/day-summary.component';
import { DialogChangeAutorunComponent } from './dialog-change-autorun/dialog-change-autorun.component';
import { LoggedUserInformationComponent } from './logged-user-information/logged-user-information.component';
import { DialogCheckUpdateComponent } from './dialog-check-update/dialog-check-update.component';
import { CalendarModule } from 'primeng/calendar';

@NgModule({
  declarations: [AppComponent, RegistroHoraItemComponent, RegistrosPorDiaComponent, RegistroHoraEditarComponent, HoraMaskDirective, ConfirmacaoExclusaoRegistroComponent, RegistroHoraEditarDialogComponent, NotificationComponent, DialogWindowComponent, AppWindowComponent, DialogStartRemindersComponent, LoginComponent, DialogNoteReminderComponent, ConfiguracoesComponent, MonthSummaryComponent, DaySummaryComponent, DialogChangeAutorunComponent, LoggedUserInformationComponent, DialogCheckUpdateComponent],
  imports: [BrowserModule, MatDialogModule, NgxMaskDirective, 
    NgxMaskPipe, ReactiveFormsModule ,FormsModule, HttpClientModule, AppRoutingModule, CalendarModule],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true }, provideNgxMask()],
  bootstrap: [AppComponent],
})
export class AppModule { }
