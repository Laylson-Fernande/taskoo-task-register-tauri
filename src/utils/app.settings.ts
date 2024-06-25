import { Injectable } from '@angular/core';
import { SettingsRepository } from 'src/services/repositories/settings-repository.service';

enum SettingsIdentifiers {
    USER_ORBIT_EMAIL = 'USER.ORBIT.EMAIL',
    USER_ORBIT_PASSWORD = 'USER.ORBIT.PASSWORD',
    REMINDERS_INTERVAL = 'REMINDERS.INTERVAL',
    AUTO_SYNC_ORBIT = 'AUTO.SYNC.ORBIT',
    INTEGRATE_ORBIT = 'INTEGRATE.ORBIT',
}

@Injectable({
    providedIn: 'root'
})
export class AppSettings {

    constructor(private settingsRepository: SettingsRepository) {
        this.loadAllSettings();
    }

    user_email = 'lfernandes@viceri.com.br';
    user_password = 'U2FsdGVkX1/f9mUNfyJ1ezagQonFv1Y06jDFOD2JRp0=';
    passHash = 'orbitseidorprod';

    settingsMap:any = null;

    private async loadAllSettings() {
        const mapSettings = new Map();
        const configuracoes: any = await this.settingsRepository.getAllSettings();
        configuracoes.forEach((configuracao: any) => {
            mapSettings.set(configuracao.identifier, configuracao);
        });
        this.settingsMap = mapSettings;
    }

    async isIntegratedOrbit() {
        if(!this.settingsMap){
            await this.loadAllSettings();
        }
        const configuracao = await this.settingsRepository.getSettingByIdentifier(SettingsIdentifiers.INTEGRATE_ORBIT);
        const value = configuracao.custom_value ? configuracao.custom_value : configuracao.default_value;
        return value.toLocaleLowerCase() === "true";
    }

    async saveUserOrbitCredentials(user_email: string, user_password: string) {
        try {
            await this.settingsRepository.updateSettings({
                identifier: SettingsIdentifiers.USER_ORBIT_EMAIL,
                custom_value: user_email
            });

            await this.settingsRepository.updateSettings({
                identifier: SettingsIdentifiers.USER_ORBIT_PASSWORD,
                custom_value: user_password
            });
        } catch (error) {

        }
    }

    async integrarComOrbit(integrar: boolean) {
        try {
            await this.settingsRepository.updateSettings({
                identifier: SettingsIdentifiers.INTEGRATE_ORBIT,
                custom_value: integrar.toString()
            });
        } catch (error) {

        }
    }
}