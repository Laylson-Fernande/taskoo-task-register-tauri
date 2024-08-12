import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from '../services/authentication/auth.guard';

import { RegistrosPorDiaComponent } from './registros-por-dia/registros-por-dia.component';
import { DialogWindowComponent } from './dialog-window/dialog-window.component';
import { AppWindowComponent } from './app-window/app-window.component';
import { DialogStartRemindersComponent } from './dialog-start-reminders/dialog-start-reminders.component';
import { LoginComponent } from './login/login.component';
import { DialogNoteReminderComponent } from './dialog-note-reminder/dialog-note-reminder.component';
import { ConfiguracoesComponent } from './configuracoes/configuracoes.component';
import { DialogChangeAutorunComponent } from './dialog-change-autorun/dialog-change-autorun.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent},
  { path: 'settings', component: ConfiguracoesComponent},
  {
    path: '', component: AppWindowComponent,
    children: [
      { path: 'dashboard', component: RegistrosPorDiaComponent },
    ]
  },
  { path: 'dialog', component: DialogWindowComponent,
    children: [
      {path:'start-reminders', component: DialogStartRemindersComponent},
      {path:'note-reminder', component: DialogNoteReminderComponent},
      {path:'change-autorun', component: DialogChangeAutorunComponent}
    ]
   },
  // ... outras rotas
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }