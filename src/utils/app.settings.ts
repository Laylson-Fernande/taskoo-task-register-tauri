import { Injectable } from '@angular/core';
import { LoadingService } from 'src/services/app/loading.service';
import { SettingsRepository } from 'src/services/repositories/settings-repository.service';

enum SettingsIdentifiers {
    USER_ORBIT_EMAIL = 'USER.ORBIT.EMAIL',
    USER_ORBIT_PASSWORD = 'USER.ORBIT.PASSWORD',
    REMINDERS_INTERVAL = 'REMINDERS.INTERVAL',
    AUTO_SYNC_ORBIT = 'AUTO.SYNC.ORBIT',
    INTEGRATE_ORBIT = 'INTEGRATE.ORBIT',
    AUTORUN_APPLICATION = 'AUTORUN.APPLICATION',
}

@Injectable({
    providedIn: 'root'
})
export class AppSettings {

    constructor(private settingsRepository: SettingsRepository,public loadingService: LoadingService) {
        this.loadAllSettings();
    }

    //user_email = 'lfernandes@viceri.com.br';
    //user_password = 'U2FsdGVkX1/f9mUNfyJ1ezagQonFv1Y06jDFOD2JRp0=';
    passHash = 'orbitseidorprod';

    private static settingsMap:Map<string, any> = new Map();

    private async loadAllSettings() {
        //this.loadingService.setLoading(true);
        const mapSettings = new Map();
        const configuracoes: any = await this.settingsRepository.getAllSettings();
        configuracoes.forEach((configuracao: any) => {
            mapSettings.set(configuracao.identifier, configuracao);
        });
        AppSettings.settingsMap = mapSettings;
        //this.loadingService.setLoading(false);
    }

    private getSetting(identifier: string) :string {
        if(AppSettings.settingsMap.size == 0){
            this.loadAllSettings();
        }
        const setting = AppSettings.settingsMap.get(identifier);
        
        if(setting){
            return this.getSettingValue(setting);
        } else {
            return "";
        }
    }

    private getSettingValue(setting:any):string {
        return setting.custom_value && setting.custom_value !== "" ? setting.custom_value : setting.default_value;
    }

    private async updateSettings(identifier: string, value: string) {
        try {
            await this.settingsRepository.updateSettings({
                identifier: identifier,
                custom_value: value
            });
        } catch (error) {
        }
        let setting: any = AppSettings.settingsMap.get(identifier);
        setting.custom_value = value;
        AppSettings.settingsMap.set(identifier, setting);
    }

    isAllSettingsReady() {
        return AppSettings.settingsMap.size !== 0;
    }

    isIntegratedOrbit():boolean {
        return this.getSetting(SettingsIdentifiers.INTEGRATE_ORBIT).toLocaleLowerCase() === "true";
    }

    getUserOrbitEmail() :string {
        return this.getSetting(SettingsIdentifiers.USER_ORBIT_EMAIL);
    }

    getUserOrbitPassword() :string  {
        return this.getSetting(SettingsIdentifiers.USER_ORBIT_PASSWORD)
    }

    async getAutoRunDefinition() {
        const setting = await this.settingsRepository.getSettingByIdentifier(SettingsIdentifiers.AUTORUN_APPLICATION);
        const value = this.getSettingValue(setting);
        return value.toLocaleLowerCase() === "true";
    }

    async setAutoRunDefinition(autorun: boolean) {
        await this.updateSettings(SettingsIdentifiers.AUTORUN_APPLICATION, autorun.toString());
    }

    async SaveIntegrarComOrbit(integrar: boolean) {
        await this.updateSettings(SettingsIdentifiers.INTEGRATE_ORBIT, integrar.toString());
    }

    async saveUserOrbitCredentials(user_email: string, user_password: string, saveInDatabase: boolean) {
        if(saveInDatabase){
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
        this.saveUserOrbitCredentialsInSession(user_email, user_password);
    }

    saveUserOrbitCredentialsInSession(user_email: string, user_password: string) {
        let user_email_setting: any = AppSettings.settingsMap.get(SettingsIdentifiers.USER_ORBIT_EMAIL);
        user_email_setting.custom_value = user_email;
        AppSettings.settingsMap.set(SettingsIdentifiers.USER_ORBIT_EMAIL, user_email_setting);

        let user_password_setting: any = AppSettings.settingsMap.get(SettingsIdentifiers.USER_ORBIT_PASSWORD);
        user_password_setting.custom_value = user_password;
        AppSettings.settingsMap.set(SettingsIdentifiers.USER_ORBIT_PASSWORD, user_password_setting);
    }
}