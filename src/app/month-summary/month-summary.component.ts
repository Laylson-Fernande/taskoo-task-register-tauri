import { Component, Input, ChangeDetectorRef, NgZone } from '@angular/core';
import { RegistersService } from 'src/services/app/registers.service';
import { listen } from '@tauri-apps/api/event';

@Component({
  selector: 'app-month-summary',
  templateUrl: './month-summary.component.html',
  styleUrls: ['./month-summary.component.css']
})
export class MonthSummaryComponent {

  @Input() currentDate: Date = new Date();

  resumoTotalMes = {
    total_sum_hours_recorded: '',
    total_status_approved: '',
    total_status_waiting_approval: '',
    total_status_disapproved: '',
    working_hours: ''
  }

  constructor(private registersService: RegistersService, private changeDetectorRef: ChangeDetectorRef, private zone: NgZone) { 
    listen('atualizar-dashboard', (event) => {
      this.zone.run(() => {
        this.atualizarResumo(this.currentDate);
      });
    });
  }

  ngOnInit() {
    this.atualizarResumo(this.currentDate);
  }

  async atualizarResumo(date: Date) {
    this.resumoTotalMes = await this.registersService.obterResumoTotalMes(date);
    this.changeDetectorRef.detectChanges();
  }

  alterarData(date: Date){
    if(date.getMonth() !== this.currentDate.getMonth()){
      this.atualizarResumo(date);
    }
    this.currentDate = date;
  }

}
