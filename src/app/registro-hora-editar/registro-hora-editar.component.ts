import { Component, Input, ChangeDetectorRef, NgZone, Output, EventEmitter} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { listen } from '@tauri-apps/api/event';
import { RegistersRepository } from 'src/services/repositories/registers-repository.service';
import { RegistersService } from 'src/services/app/registers.service';
import { WebviewWindow } from '@tauri-apps/api/window'


import { NotificationService } from 'src/services/app/notification.service';
import { OrbitClient} from 'src/services/orbit/orbitClient';
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
  contractDropdownVisible : boolean = false;
  contractSearchText : string = '';

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
      contractSearchText: [''],
      contract_id_display:[''],
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
    document.addEventListener('click', this.onClickOutside.bind(this));
  }

  async atualizarForm() {
    this.contratos = await this.registersService.obterContratosPorFuncionario();
    if (this.isEditing) {
      this.formulario.patchValue(this.registroEdicao);
      const contrato = this.contratos.find(contrato => contrato.id == this.registroEdicao.contract_id);
      this.selectContrato(contrato);
    } else {
      this.limparForm();
    }
    this.changeDetectorRef.detectChanges();
  }

  limparForm() {
    //this.formulario.get('contract_id')?.setValue(this.contratos[0].id);
    //this.formulario.get('contract_id_display')?.setValue(this.contratos[0].code+" - "+this.contratos[0].description);
    this.selectContrato(this.contratos[0]);
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
        this.emitAtualizarDashboard();
        this.limparForm();
      }
    }
  }

  async emitAtualizarDashboard(){
    const app = await WebviewWindow.getByLabel('main');
    if (app) {
      await app.show();
      await app.setFocus();
      await app.maximize();
      await app.emit("atualizar-dashboard","");
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

  showDropdown(){
    this.contractDropdownVisible = true;
  }

  filteredContratos(): { id: string, description: string, code: string }[] {
    return this.contratos.filter(contrato => (contrato.code+" - "+contrato.description).toLocaleLowerCase().includes(this.formulario.value.contractSearchText.toLowerCase()));
  }

  selectContrato(contrato: any) {
      this.formulario.get('contract_id')?.setValue(contrato.id);
      this.formulario.get('contract_id_display')?.setValue(contrato.code+" - "+contrato.description);
      this.contractDropdownVisible = false;
  }

  onClickOutside(event: MouseEvent): void {
    const dropdown_table = document.getElementById('dropdown-table');
    const target = event.target as HTMLElement;
    if (dropdown_table && !dropdown_table.contains(target as Node) && target.id != "contract_id_display" && this.contractDropdownVisible) {
      this.contractDropdownVisible = false;
    }
  }

}
