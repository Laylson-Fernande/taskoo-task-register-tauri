import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/tauri';

interface Configuracao {
    id: number,
    identifier: String,
    default_value: String,
    custom_value: String,
}

@Injectable({
    providedIn: 'root'
})
export class SettingsRepository {

    async getAllSettings() {
        return await invoke('select_configuracoes', { });
    }
    async getSettingByIdentifier(identifier:String) {
        const setting: any = await invoke('select_configuracao', { identifier:identifier});
        if(setting && setting.length > 0) {
            return setting[0];
        }
        return this.getIconfiguracao({});
    }

    async updateSettings( configuracao : any) {
        const iConfiguracao:Configuracao = this.getIconfiguracao(configuracao);
        return await invoke('update_configuracao', {configuracao:iConfiguracao});
    }

    async resetSettings() {
        return await invoke('reset_configuracoes', { });
    }

    getIconfiguracao(configuracao:any): Configuracao {
        const iConfiguracao:Configuracao = {
            id: configuracao.id ? configuracao.id : "",
            identifier: configuracao.identifier ? configuracao.identifier : "",
            default_value: configuracao.default_value ? configuracao.default_value : "",
            custom_value: configuracao.custom_value ? configuracao.custom_value : "",
        }
        return iConfiguracao;
    }
}