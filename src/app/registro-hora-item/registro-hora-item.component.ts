import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmacaoExclusaoRegistroComponent } from '../confirmacao-exclusao-registro/confirmacao-exclusao-registro.component';
import { RegistroHoraEditarDialogComponent } from '../registro-hora-editar-dialog/registro-hora-editar-dialog.component';
import { OrbitClient, OrbitParams } from 'src/services/orbit/orbitClient';
import { AppUtils } from 'src/utils/app.utils';
import { RegistersService } from 'src/services/app/registers.service';

@Component({
  selector: 'app-registro-hora-item',
  templateUrl: './registro-hora-item.component.html',
  styleUrls: ['./registro-hora-item.component.css']
})
export class RegistroHoraItemComponent {
  @Input() RegistroHora: {
    id: string,
    orbit_id: string,
    contract_id: string,
    contract_description: string,
    contract_code:string,
    hour_type: string,
    start_at: string,
    end_at: string,
    total_time_sheet_hours: string,
    description: string,
    release_date: string
    status: string,
    status_orbit: string,
    mensagem: string,
    editar: string,
    apagar: string
  } = {
      id: '',
      orbit_id: '',
      contract_id: '',
      contract_description: '',
      contract_code:'',
      hour_type: '',
      start_at: '',
      end_at: '',
      total_time_sheet_hours: '',
      description: '',
      release_date: '',
      status: '',
      status_orbit:'',
      mensagem:'',
      editar: '',
      apagar: ''
    };

  @Output() registroAlterado = new EventEmitter<any>();

  private mouseHover :boolean = false;

  constructor(public dialog: MatDialog, private orbitClient: OrbitClient, private registersService: RegistersService) { }

  tipos_horas: { id: string, description: string }[] = [
    { id: "NORMAL", description: "Horas Normais" },
    { id: "ADDITIONAL", description: "Horas Adicionais" },
    { id: "DUTY", description: "Horas de Plantão" },
    { id: "STANDBY", description: "Horas em Sobreaviso" }
  ];

  ngOnInit() {
    if (this.RegistroHora.start_at.length > 5) {
      this.RegistroHora.start_at = this.RegistroHora.start_at.substring(0, 5);
    }
    if (this.RegistroHora.end_at.length > 5) {
      this.RegistroHora.end_at = this.RegistroHora.end_at.substring(0, 5);
    }
    if (!this.RegistroHora.total_time_sheet_hours || this.RegistroHora.total_time_sheet_hours.length == 0) {
      this.RegistroHora.total_time_sheet_hours = AppUtils.getTotalTimeSheetHours(this.RegistroHora.start_at, this.RegistroHora.end_at);
    } else if (this.RegistroHora.total_time_sheet_hours.length > 5) {
      this.RegistroHora.total_time_sheet_hours = this.RegistroHora.total_time_sheet_hours.substring(0, 5);
    }
    if (!this.RegistroHora.contract_description && this.RegistroHora.contract_id.length > 0) {
      const contratosStore = sessionStorage.getItem("contratos");
      if (contratosStore) {
        const contratos = JSON.parse(contratosStore);

        const contrato = contratos.find((contrato: any) => {
          if (contrato.id === this.RegistroHora.contract_id) {
            return contrato;
          }
        });
        if(contrato){
          this.RegistroHora.contract_description = contrato.description;
          this.RegistroHora.contract_code = contrato.code;
        }
      }
    }
  }

  getTipoHora(id: string) {
    const tipo_hora = this.tipos_horas.find(tipo_hora => tipo_hora["id"] === id);
    return tipo_hora ? tipo_hora.description : id;
  }
  abrirDialogoConfirmacao() {
    const dialogRef = this.dialog.open(ConfirmacaoExclusaoRegistroComponent, {
      width: '100%',
      data: { registro: this.RegistroHora },
      disableClose: true,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        await this.registersService.apagarRegistro(this.RegistroHora);
        this.registroAlterado.emit();
      }
    });
  }

  abrirDialogoEdicao() {
    const dialogRef = this.dialog.open(RegistroHoraEditarDialogComponent, {
      width: '100%',
      height: '100%',
      data: { registroHora: this.RegistroHora }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Atualizar o registro com os dados editados
        this.RegistroHora = result;
        this.registroAlterado.emit();
      }
    });
  }

  mouseenter(){
    this.mouseHover = true;
  }

  mouseleave() {
    this.mouseHover = false;
  }

  showMensagem(){
    return this.mouseHover && this.RegistroHora.mensagem.length > 0;
  }
} 