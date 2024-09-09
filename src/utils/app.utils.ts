import { Injectable } from '@angular/core';
import { retry } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class AppUtils {

    static somarHoras(hora1: string, hora2: string): string {
    
        const minutos1 = this.converterParaMinutos(hora1);
        const minutos2 = this.converterParaMinutos(hora2);
    
        const totalMinutos = minutos1 + minutos2;
    
        return this.converterMinutosParaHorario(totalMinutos);
    }

    static getTotalTimeSheetHours(start_at: string, end_at: string) {
        let result = "00:00";
        if (start_at && end_at) {
            const startAtMinutos = this.converterParaMinutos(start_at);
            const endAtMinutos = this.converterParaMinutos(end_at);
            const diferencaEmMinutos = (!isNaN(endAtMinutos) ? endAtMinutos : 0) - (!isNaN(startAtMinutos) ? startAtMinutos : 0);

            if (Number(diferencaEmMinutos) >= 0) {
                const diferencaEmHorario = this.converterMinutosParaHorario(diferencaEmMinutos);
                result = diferencaEmHorario;
            }
        }
        return result;
    }

    private static converterParaMinutos(horarioString: string): number {
        const [horas, minutos] = horarioString.split(':').map(Number);
        return horas * 60 + minutos;
    }

    static converterMinutosParaHorario(minutos: number): string {
        const horas = Math.floor(minutos / 60);
        const minutosRestantes = minutos % 60;
        return `${horas.toString().padStart(2, '0')}:${minutosRestantes.toString().padStart(2, '0')}`;
    }

    static calcularDiferencaEmMinutos(data1: Date, data2: Date): number {
        const diferencaEmMilissegundos = Math.abs(data1.getTime() - data2.getTime());
        const diferencaEmMinutos = Math.floor(diferencaEmMilissegundos / (1000 * 60));
        return diferencaEmMinutos;
      }

    dynamicSort(property: any) {
        var sortOrder = 1;
        if (property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a: any, b: any) {
            /* next line works with strings and numbers, 
             * and you may want to customize it to your needs
             */
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        }
    }

    mergeRegistrosSortedBy(orbit: any, local: any, property: any) {
        let registrosMerged: any[] = [];
        if (!local) {
            registrosMerged = orbit;
        } else if (!orbit) {
            registrosMerged = local;
        } else {
            local.forEach((registroLocal: any) => {
                let index = orbit.findIndex((registroOrbit: any) => this.compareRegistros(registroOrbit, registroLocal));
                if (index !== -1) {
                    const registroOrbit = orbit[index];
                    registroLocal.status = "SYNCED"
                    registroLocal.contract_description = registroOrbit.contract_description;
                    registroLocal.contract_code = registroOrbit.contract_code;
                    registroLocal.status_orbit = registroOrbit.status;
                    orbit.splice(index, 1);
                }
                registrosMerged.push(registroLocal);
            });
            orbit.forEach((registroOrbit: any) => {
                registroOrbit.id = null;
                registroOrbit.status = "PENDING";
                registroOrbit.mensagem = "O registro foi obtido do Orbit, mas ainda não está salvo no banco de dados local.";
                 registrosMerged.push(registroOrbit) 
                });
        }
        if (registrosMerged) {
            registrosMerged.sort(this.dynamicSort(property));
        }
        return registrosMerged;
    }
    /*
    interface Registro {
        id: number,
        orbit_id: String,
        contract_id: String,
        hour_type: String,
        start_at: String,
        end_at: String,
        description: String,
        release_date: String,
        status: String,
        mensagem: String,
    }
    */

    compareRegistros(orbit: any, local: any) {
        let equals = false;
        equals = orbit.id == local.orbit_id;
        if(equals && local.status === "PENDING-UPDATE"){
            return false;
        } else if (!equals) {
            equals = orbit.contract_id === local.contract_id;
            equals = equals && orbit.hour_type === local.hour_type;
            equals = equals && orbit.start_at === local.start_at;
            equals = equals && orbit.end_at === local.end_at;
            equals = equals && orbit.description === local.description;
            equals = equals && orbit.release_date === local.release_date;
            equals = equals && local.status !== "ERROR";
        }
        return equals;
    }


    obterStartEndMonth(data: Date) {
      
        const ano = data.getFullYear();
        const mes = data.getMonth();
      
        const primeiroDia = new Date(ano, mes, 1); 
        const ultimoDia = new Date(ano, mes + 1, 0); 
      
        return {
          primeiroDia: AppUtils.formatarData(primeiroDia),
          ultimoDia: AppUtils.formatarData(ultimoDia)
        };
      }

      static formatarData(data: Date): string {
        const yyyy = data.getFullYear();
        const mm = String(data.getMonth() + 1).padStart(2, '0');
        const dd = String(data.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
}