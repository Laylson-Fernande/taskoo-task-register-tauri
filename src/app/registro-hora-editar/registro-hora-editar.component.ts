import { Component, Input, Output, EventEmitter, ChangeDetectorRef, Inject, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { listen } from '@tauri-apps/api/event';
import { firstValueFrom } from 'rxjs';
import { RegistersRepository } from 'src/services/repositories/registers-repository.service';
import { RegistersService } from 'src/services/app/registers.service';


import { NotificationService } from 'src/services/app/notification.service';
import { OrbitClient, OrbitParams } from 'src/services/orbit/orbitClient';
import { AppUtils } from 'src/utils/app.utils';

@Component({
  selector: 'app-registro-hora-editar',
  templateUrl: './registro-hora-editar.component.html',
  styleUrls: ['./registro-hora-editar.component.css']
})
export class RegistroHoraEditarComponent {
  @Input() registroEdicao: any; // Recebe o registro a ser editado
  @Input() isEditing: any = false;
  @Input() dateRelease: any;
  @Output() registroAlterado = new EventEmitter<any>(); // Emite o registro editado

  formulario: FormGroup;
  registro: any;

  constructor(private orbitClient: OrbitClient, private fb: FormBuilder, private changeDetectorRef: ChangeDetectorRef,
    private notificationService: NotificationService, private registersRepository: RegistersRepository, private registersService: RegistersService, private zone: NgZone) {
    this.formulario = this.fb.group({
      id: [''],
      orbit_id: [''],
      contract_id: ['', Validators.required],
      hour_type: ['', Validators.required],
      start_at: ['', Validators.required],
      end_at: ['', Validators.required],
      description: ['', Validators.required],
      release_date: ['', Validators.required],
      total_time_sheet_hours: ['', Validators.required],
    });

    listen('atualizar-dashboard', (event) => {
      this.zone.run(() => {
        this.atualizarForm();
      });
    });
  }

  contratos: { id: string, description: string, code: string }[] = [
    { id: "", description: '', code:'' }
  ];

  tipos_horas: { id: string, description: string }[] = [
    { id: "NORMAL", description: "Horas Normais" },
    { id: "ADDITIONAL", description: "Horas Adicionais" },
    { id: "DUTY", description: "Horas de Plantão" },
    { id: "STANDBY", description: "Horas em Sobreaviso" }
  ];

  ngOnInit() {
    this.atualizarForm();
  }

  async atualizarForm() {
    this.contratos = await this.registersService.obterContratosPorFuncionario();
    if (this.isEditing) {
      this.formulario.patchValue(this.registroEdicao);
    } else {
      this.limparForm();
    }
    this.changeDetectorRef.detectChanges();
  }

  limparForm() {
    this.formulario.get('contract_id')?.setValue(this.contratos[0].id);
    this.formulario.get('hour_type')?.setValue(this.tipos_horas[0].id);
    this.formulario.get('start_at')?.setValue('');
    this.formulario.get('end_at')?.setValue('');
    this.formulario.get('total_time_sheet_hours')?.setValue(AppUtils.converterMinutosParaHorario(0));
    this.formulario.get('description')?.setValue('');
    this.changeDetectorRef.detectChanges();
  }

  cancelar(event: Event) {
    event.preventDefault();
    this.registroAlterado.emit();
  }

  async salvar() {
    let registro = this.formulario.value;
    if (this.validarRegistro(registro)) {
      let registroCriado = false;
      let registroAlterado = false;
      if (!registro.id) {
        registro.release_date = this.dateRelease;
        registroCriado = await this.registersService.criarRegistro(registro);
      } else {
        registroAlterado = await this.registersService.alterarRegistro(registro)
      }
      if(registroCriado || registroAlterado){
        this.registroAlterado.emit(registro);
        this.limparForm();
      }
    }
  }

  validarRegistro(registro: any) {
    if (registro) {
      return true;
    }
    return false;
  }

  horaAlterada(valorAlterado: string, id: string) {
    const start_at = this.formulario.get('start_at')?.getRawValue();
    const end_at = this.formulario.get('end_at')?.getRawValue();

    const timeSheetHours = AppUtils.getTotalTimeSheetHours(start_at, end_at);

    this.formulario.get('total_time_sheet_hours')?.setValue(timeSheetHours);

  }
}
