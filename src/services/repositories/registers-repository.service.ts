import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/tauri';

interface Registro {
    id: number,
    orbit_id: String,
    contract_id: String,
    hour_type: String,
    start_at: String,
    end_at: String,
    total_time_sheet_hours: String,
    description: String,
    release_date: String,
    status: String,
    mensagem: String,
    created_at: String,
    updated_at: String,
}

@Injectable({
    providedIn: 'root'
})
export class RegistersRepository {

    async inserirRegistro(registro: Registro) {
        const iRegistro:Registro = this.getIregistro(registro);
        return await invoke("insert_registro", { registro:iRegistro });
    }

    async atualizarRegistro(id: number, registro: Registro) {
        const iRegistro:Registro = this.getIregistro(registro);
        return await invoke('update_registro', { id:id, registro:iRegistro });
    }

    async listarRegistros(release_date: String) {
        return await invoke('select_registros', { releaseDate:release_date });
    }

    async consultarSeExisteRegistro(registro: Registro){
        const iRegistro:Registro = this.getIregistro(registro);
        return await invoke("select_ifexist_registro", { registro:iRegistro });
    }

    async consultarUltimoRegistroDia(release_date: String){
        const iRegistro:Registro = this.getIregistro(release_date);
        return await invoke("select_last_registro", { releaseDate:release_date });
    }

    async excluirRegistro(id: number) {
        return  await invoke('delete_registro', { id });
    }

    async consultarTotalHorasDia(release_date: String) {
        return await invoke('get_total_horas_dia', { releaseDate:release_date });
    }

    async consultarTotalHorasNormaisDia(release_date: String, ignored_id:String) {
        return await invoke('get_total_horas_normal_dia', { releaseDate:release_date, ignoredId: ignored_id });
    }

    async daysWithWarning() {
        return await invoke('select_days_with_warning', {});
    }

     getIregistro(registro:any): Registro {
        const iRegistro:Registro = {
            id: 0,
            orbit_id: registro.orbit_id ? registro.orbit_id : "",
            contract_id : registro.contract_id ? registro.contract_id : "",
            hour_type: registro.hour_type ? registro.hour_type : "",
            start_at: registro.start_at ? registro.start_at : "",
            end_at: registro.end_at ? registro.end_at : "",
            total_time_sheet_hours: registro.total_time_sheet_hours ? registro.total_time_sheet_hours : "",
            description: registro.description ? registro.description : "",
            release_date: registro.release_date ? registro.release_date : "",
            status: registro.status ? registro.status : "",
            mensagem: registro.mensagem ? registro.mensagem : "",
            created_at: registro.created_at ? registro.created_at : "",
            updated_at: registro.updated_at ? registro.updated_at : "",

        }
        return iRegistro;
    }

}