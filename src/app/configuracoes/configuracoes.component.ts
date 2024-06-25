import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-configuracoes',
  templateUrl: './configuracoes.component.html',
  styleUrls: ['./configuracoes.component.css']
})
export class ConfiguracoesComponent {
  abas = ['Geral', 'Notificações', 'Segurança']; // Abas de configuração
  formularioAtivo = this.abas[0]; // Aba ativa inicialmente
  formularios: { [key: string]: FormGroup } = {}; // Objeto para armazenar os formulários

  constructor(private fb: FormBuilder, private router:Router) {

    this.formularios['Geral'] = this.fb.group({
      INTEGRATE_ORBIT: [''],
      AUTO_SYNC_ORBIT: [''],
      REMINDERS_INTERVAL: [''],
    });
  }

  mudarAba(aba: string) {
    this.formularioAtivo = aba;
  }

  salvarConfiguracoes() {
    console.log(this.formularios[this.formularioAtivo].value);
  }

  voltar(){
    this.router.navigate(["/dashboard"]);
  }
}
