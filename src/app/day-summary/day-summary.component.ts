import { ChangeDetectorRef, Component, Input, NgZone } from '@angular/core';
import { RegistersService } from 'src/services/app/registers.service';
import { AppUtils } from 'src/utils/app.utils';
import { listen } from '@tauri-apps/api/event';

@Component({
  selector: 'app-day-summary',
  templateUrl: './day-summary.component.html',
  styleUrls: ['./day-summary.component.css']
})
export class DaySummaryComponent {

  @Input() currentDate: Date = new Date();

  summary_itens: { title: string, value: string }[] = [];
  
  /*[
    { title: "Horas no Taskoo", value: "00:00" },
    { title: "Horas no Orbit", value: "00:00" },
    { title: "Horas Previstas", value: "00:00" },
    { title: "Saldo do dia", value: "00:00" },
  ];*/

  constructor(private registersService: RegistersService,  private changeDetectorRef: ChangeDetectorRef, private zone: NgZone) {
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
    let summary: { title: string, value: string }[] = [];
    const resumoDia = await this.registersService.obterResumoDia(AppUtils.formatarData(date));
    if (resumoDia) {
      summary.push({ title: "Horas Taskoo:", value: resumoDia.total_taskoo })
      if (resumoDia.total_hour_daily && resumoDia.balance_hours_daily) {
        summary.push({ title: "Saldo do dia:", value: resumoDia.balance_hours_daily })
        if (resumoDia.balance_hours_daily.includes("-")) {
          summary.push({ title: "Total Horas:", value: resumoDia.balance_hours_daily })
        } else {
          const totalHoras = AppUtils.somarHoras(resumoDia.balance_hours_daily, resumoDia.total_hour_daily);
          summary.push({ title: "Total Horas:", value: totalHoras })
        }
      }
    }
    this.summary_itens = summary;
    this.changeDetectorRef.detectChanges();
  }

  alterarData(date: Date){
    this.atualizarResumo(date);
    this.currentDate = date;
  }

}
