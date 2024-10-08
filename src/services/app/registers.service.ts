import { Injectable } from '@angular/core';
import { RegistersRepository } from 'src/services/repositories/registers-repository.service';
import { OrbitClient, OrbitParams } from 'src/services/orbit/orbitClient';
import { NotificationService } from 'src/services/app/notification.service';
import { AppUtils } from 'src/utils/app.utils';
import { firstValueFrom } from 'rxjs';
import { AppSettings } from 'src/utils/app.settings';

enum StatusRegistros {
    PENDING = 'PENDING',
    PENDING_UPDATE = 'PENDING-UPDATE',
    PENDING_DELETE = 'PENDING-DELETE',
    PENDING_REPLACE = 'PENDING-REPLACE',
    ERROR = 'ERROR',
    SYNCED = 'SYNCED',
}

@Injectable({
    providedIn: 'root'
})
export class RegistersService {

    constructor(private orbitClient: OrbitClient,
        private appUtils: AppUtils, private notificationService: NotificationService, private registersRepository: RegistersRepository, private appSettings: AppSettings) { }

    async obterRegistrosPorDia(date: string) {
        if (this.isAutoSyncOrbit() && await this.validarIntegracaoOrbit()) {
            /*
            let registrosOrbit = await this.obterRegistrosPorDiaOrbit(date);
            await this.salvarRegistrosOrbitnoLocal(registrosOrbit);
            const registrosLocal = await this.obterRegistrosPorDiaLocal(date);
            await this.atualizarRegistrosApagadosNoOrbit(registrosLocal, registrosOrbit);
            const hasRegistrosEnviados = await this.salvarRegistrosLocalnoOrbit(registrosLocal, false);
            if (hasRegistrosEnviados) {
                registrosOrbit = await this.obterRegistrosPorDiaOrbit(date);
            }
            */
            const registros = await this.syncRegistersWithOrbitByDay(date);
            const registrosDia = await this.appUtils.mergeRegistrosSortedBy(registros.registrosOrbit, registros.registrosLocal, "-start_at");
            return registrosDia;
        } else {
            let registrosLocal: any = await this.obterRegistrosPorDiaLocal(date);
            registrosLocal.sort(this.appUtils.dynamicSort("-start_at"));
            return registrosLocal;
        }
    }

    async obterResumoDia(date: string) {
        const resumoTaskoo: any = await this.registersRepository.consultarTotalHorasDia(date);
        const resumoDia: any = {};
        if (resumoTaskoo && resumoTaskoo.length > 0) {
            resumoDia.total_taskoo = resumoTaskoo[0].total_horas_dia;
        }
        if (await this.validarIntegracaoOrbit()) {
            const resumoOrbit: any = await firstValueFrom(this.orbitClient.obterResumoDia(date));
            if (resumoOrbit) {
                resumoDia.total_hour_daily = resumoOrbit.data.total_hour_daily;
                resumoDia.balance_hours_daily = resumoOrbit.data.balance_hours_daily;
            }
        }
        return resumoDia;
    }

    async obterContratosPorFuncionario() {
        let contratos: any;
        const contratosStoraged = sessionStorage.getItem("contratos");
        if (contratosStoraged) {
            contratos = JSON.parse(contratosStoraged);
        } else {
            if (await this.validarIntegracaoOrbit()) {
                try {
                    const response = await firstValueFrom(this.orbitClient.obterContratosPorFuncionario());
                    contratos = response.data.map((item: any) => ({
                        id: item.service_contract.contract_id,
                        description: item.service_contract.description,
                        code: item.service_contract.code
                    }));
                    sessionStorage.setItem("contratos", JSON.stringify(contratos));
                } catch (error) {
                    console.error('Erro ao obter contratos:', error);
                }
            }
        }
        return contratos;
    }

    async criarRegistro(registro: any) {
        if (registro.start_at.length > 5) {
            registro.start_at = registro.start_at.substring(0, 5);
        }
        if (registro.end_at.length > 5) {
            registro.end_at = registro.end_at.substring(0, 5);
        }
        const bancoLocal = await this.criarRegistroBanco(registro);
        let orbit = false;
        if (this.isAutoSyncOrbit() && await this.validarIntegracaoOrbit()) {
            orbit = await this.criarRegistroOrbit(registro);
        }
        return bancoLocal || orbit;
    }

    async alterarRegistro(registro: any) {
        if (registro.start_at.length > 5) {
            registro.start_at = registro.start_at.substring(0, 5);
        }
        if (registro.end_at.length > 5) {
            registro.end_at = registro.end_at.substring(0, 5);
        }
        let alteradoOrbit = false;
        let alteradoLocal = false;
        if (registro.orbit_id  && registro.status !== StatusRegistros.PENDING_REPLACE && this.isAutoSyncOrbit() && await this.validarIntegracaoOrbit()) {
            alteradoOrbit = await this.alterarRegistroOrbit(registro);
        }
        if (registro.id) {
            alteradoLocal = await this.alterarRegistroLocal(registro, alteradoOrbit);
        }
        return alteradoOrbit || alteradoLocal
    }


    async apagarRegistro(registro: any) {

        if (registro.orbit_id && registro.orbit_id.length > 0) {
            if (this.isAutoSyncOrbit() && await this.validarIntegracaoOrbit()) {
                try {
                    await this.apagarRegistroOrbit(registro);
                    await this.apagarRegistroLocal(registro);
                } catch (httpErroResponse: any) {
                    registro.status = StatusRegistros.ERROR;
                    registro.mensagem = "Ocorreu um erro ao tentar excluir o registro no Orbit: " + JSON.stringify(httpErroResponse.error.errors);
                    await this.alterarRegistroLocal(registro, true);
                }
            } else {
                registro.status = StatusRegistros.PENDING_DELETE;
                registro.mensagem = "Registro com exclusão pendente, aguardando sincronização com Orbit para ser excluído. Editar o registro vai cancelar a exclusão."
                await this.alterarRegistroLocal(registro, true);
            }
        } else {
            await this.apagarRegistroLocal(registro);
        }
    }

    async reprocessarRegistro(registro: any) {
        registro.reprocess = true;
        await this.reprocessarRegistroOrbit(registro);
    }

    private async obterRegistrosPorDiaOrbit(date: string) {
        let registros;
        if (await this.validarIntegracaoOrbit()) {
            try {
                const orbitParams: OrbitParams = { queryString: `allStatus=true&release_date=${date}` };
                const response = await firstValueFrom(this.orbitClient.obterRegistrosPorDia(orbitParams));
                registros = response.data;
            } catch (erro) {
                this.notificationService.showNotification('Ocorreu um erro ao obter registros', '', 'error');
            }
        }
        return registros;
    }

    private async obterRegistrosPorDiaLocal(date: string) {
        const registros = await this.registersRepository.listarRegistros(date);
        return registros;
    }

    private async atualizarRegistrosApagadosNoOrbit(regstrosLocal: any, registrosOrbit: any) {
        if (regstrosLocal && registrosOrbit) {
            for (let registroLocal of regstrosLocal) {
                if (registroLocal.orbit_id) {
                    const index = registrosOrbit.findIndex((registroOrbit: any) => registroLocal.orbit_id === registroOrbit.id);
                    if (index === -1) {
                        registroLocal.orbit_id = "";
                        registroLocal.status = "REMOVED-FROM-ORBIT";
                        registroLocal.mensagem = "O registro foi removido do Orbit e agora está disponível apenas no Taskoo. Você pode excluir o registro do Taskoo ou editá-lo para enviá-lo ao Orbit novamente.";
                        await this.registersRepository.atualizarRegistro(registroLocal.id, registroLocal);
                    }
                }
            }
        }
    }
    private async salvarRegistrosOrbitnoLocal(registros: any) {
        if (registros) {
            for (const registro of registros) {
                registro.orbit_id = registro.id;
                if (registro.start_at.length > 5) {
                    registro.start_at = registro.start_at.substring(0, 5);
                }
                if (registro.end_at.length > 5) {
                    registro.end_at = registro.end_at.substring(0, 5);
                }
                const registrosLocal: any = await this.registersRepository.consultarSeExisteRegistro(registro);
                if (registrosLocal && registrosLocal.length > 0) {
                    let registroLocal = registrosLocal[0];
                    const updated_atLocal = new Date(registroLocal.updated_at);
                    const updated_atOrbit = new Date(registro.updated_at);
                    const diferencaEmMinutos = AppUtils.calcularDiferencaEmMinutos(updated_atLocal, updated_atOrbit);
                    if ((!registroLocal.orbit_id || registroLocal.orbit_id.length == 0) && registroLocal.status !== StatusRegistros.ERROR) { //Registros salvos no TASKOO, que ainda não tem ID ORBIT
                        registroLocal.orbit_id = registro.id;
                        registroLocal.status = StatusRegistros.SYNCED;
                        registroLocal.mensagem = "";
                        await this.registersRepository.atualizarRegistro(registroLocal.id, registroLocal);
                    } else if (registroLocal.orbit_id == registro.orbit_id && diferencaEmMinutos > 2 && registroLocal.status !== StatusRegistros.PENDING_UPDATE && registroLocal.status !== StatusRegistros.PENDING_DELETE && registroLocal.status !== StatusRegistros.PENDING_REPLACE) { // Registros alterados via orbit, para serem atualizados no TASKOO
                        registroLocal.status = StatusRegistros.SYNCED;
                        registroLocal.mensagem = "";
                        registroLocal.start_at = registro.start_at;
                        registroLocal.end_at = registro.end_at;
                        registroLocal.description = registro.description;
                        await this.registersRepository.atualizarRegistro(registroLocal.id, registroLocal);
                    }
                } else {
                    let registroLocal = structuredClone(registro);
                    registroLocal.orbit_id = registro.id;
                    registroLocal.status = "SYNCED";
                    registroLocal.mensagem = "";
                    await this.registersRepository.inserirRegistro(registroLocal);
                }
            }
        }
    }

    private async salvarRegistrosLocalnoOrbit(registros: any, instantSave: boolean) {
        let hasRegistrosEnviados = false;
        if (registros) {
            for (let registro of registros) {
                const created_at = new Date(registro.created_at);
                const diferencaEmMinutos = AppUtils.calcularDiferencaEmMinutos(created_at, new Date());
                if ((instantSave || diferencaEmMinutos > 1) && (!registro.orbit_id || registro.orbit_id.length == 0) && registro.status === StatusRegistros.PENDING) {
                    try {
                        const response = await firstValueFrom(this.orbitClient.criarRegistro(registro));
                        hasRegistrosEnviados = true;
                    } catch (httpErroResponse: any) {
                        registro.status = StatusRegistros.ERROR;
                        registro.mensagem = "Ocorreu um erro ao tentar salvar esse registro no Orbit: " + JSON.stringify(httpErroResponse.error.errors);
                        await this.registersRepository.atualizarRegistro(registro.id, registro);
                    }
                } else if (registro.orbit_id && registro.orbit_id.length !== 0 && registro.status === StatusRegistros.PENDING_UPDATE) {
                    try {
                        await firstValueFrom(this.orbitClient.alterarRegistro(registro.orbit_id, registro));
                        hasRegistrosEnviados = true;
                        registro.status = StatusRegistros.SYNCED;
                        registro.mensagem = "";
                        await this.registersRepository.atualizarRegistro(registro.id, registro);
                    } catch (httpErroResponse: any) {
                        registro.status = StatusRegistros.ERROR;
                        registro.mensagem = "Ocorreu um erro ao tentar atualizar esse registro no Orbit: " + JSON.stringify(httpErroResponse.error.errors);
                        await this.registersRepository.atualizarRegistro(registro.id, registro);
                    }

                } else if (registro.orbit_id && registro.orbit_id.length !== 0 && registro.status === StatusRegistros.PENDING_REPLACE){
                    try {
                        await firstValueFrom(this.orbitClient.deletarRegistro(registro.orbit_id));
                        registro.orbit_id = '';
                        registro.status = StatusRegistros.PENDING;
                        await this.registersRepository.atualizarRegistro(registro.id, registro);
                        AppUtils.ThreadSleep(2);
                        await firstValueFrom(this.orbitClient.criarRegistro(registro));
                        hasRegistrosEnviados = true;
                    } catch (httpErroResponse: any) {
                    }

                } else if (registro.orbit_id && registro.orbit_id.length !== 0 && registro.status === StatusRegistros.PENDING_DELETE) {
                    try {
                        await firstValueFrom(this.orbitClient.deletarRegistro(registro.orbit_id));
                        await this.registersRepository.excluirRegistro(registro.id);
                    } catch (httpErroResponse: any) {
                    }
                }
            }
        }
        return hasRegistrosEnviados;
    }


    private async criarRegistroBanco(registro: any) {
        const registroLocal = structuredClone(registro);
        registroLocal.status = StatusRegistros.PENDING;
        registroLocal.mensagem = "O registro foi criado com sucesso, mas ainda não foi sincronizado com o Orbit.";
        const response = await this.registersRepository.inserirRegistro(registroLocal);
        if (response == 1) {
            this.notificationService.showNotification('Registro criado com sucesso!', '', 'success');
            return true;
        } else {
            this.notificationService.showNotification('Ocorreu um erro ao criar o registro', '', 'error');
            return false;
        }
    }
    private async criarRegistroOrbit(registro: any) {
        try {
            const response = await firstValueFrom(this.orbitClient.criarRegistro(registro));
            this.notificationService.showNotification('Registro criado no Orbit com sucesso!', '', 'success');
            return true;
        } catch (error) {
            this.notificationService.showNotification('Ocorreu um erro ao criar o registro no Orbit.', '', 'error');
            return false;
        }
    }

    private async reprocessarRegistroOrbit(registro: any) {
        let registroOrbit = structuredClone(registro);
        const orbit_id = registroOrbit.orbit_id;
        if (registroOrbit.start_at.length > 5) {
            registroOrbit.start_at = registroOrbit.start_at.substring(0, 5);
        }
        if (registroOrbit.end_at.length > 5) {
            registroOrbit.end_at = registroOrbit.end_at.substring(0, 5);
        }
        try {
            const response = await firstValueFrom(this.orbitClient.alterarRegistro(orbit_id, registroOrbit));
            this.notificationService.showNotification('Registro alterado no Orbit com sucesso!', '', 'success');
            return true;
        } catch (httpErroResponse: any) {
            this.notificationService.showNotification('Ocorreu um erro ao alterar o registro no Orbit.', httpErroResponse.error.errors[0], 'error');
            //this.notificationService.showNotification(httpErroResponse.errors[0], '', 'error');
            return false;
        }
    }

    private async alterarRegistroOrbit(registro: any) {
        let registroOrbit = structuredClone(registro);
        const orbit_id = registroOrbit.orbit_id;
        if (registroOrbit.start_at.length > 5) {
            registroOrbit.start_at = registroOrbit.start_at.substring(0, 5);
        }
        if (registroOrbit.end_at.length > 5) {
            registroOrbit.end_at = registroOrbit.end_at.substring(0, 5);
        }
        try {
            const response = await firstValueFrom(this.orbitClient.alterarRegistro(orbit_id, registroOrbit));
            this.notificationService.showNotification('Registro alterado no Orbit com sucesso!', '', 'success');
            return true;
        } catch (error) {
            this.notificationService.showNotification('Ocorreu um erro ao alterar o registro no Orbit.', '', 'error');
            return false;
        }
    }

    private async alterarRegistroLocal(registro: any, alteradoOrbit: boolean) {
        let registroLocal = structuredClone(registro);
        if (registroLocal.start_at.length > 5) {
            registroLocal.start_at = registroLocal.start_at.substring(0, 5);
        }
        if (registroLocal.end_at.length > 5) {
            registroLocal.end_at = registroLocal.end_at.substring(0, 5);
        }
        if (!registro.orbit_id || registro.orbit_id.length == 0) {
            registroLocal.status = StatusRegistros.PENDING;
            registroLocal.mensagem = "O registro foi alterado com sucesso, mas ainda não foi sincronizado com o Orbit.";
        } else if (!alteradoOrbit && registro.status !== StatusRegistros.PENDING_REPLACE) {
            registroLocal.status = StatusRegistros.PENDING_UPDATE;
            registroLocal.mensagem = "O registro foi alterado, mas as atualizações ainda não foram sincronizadas com o Orbit.";
        }
        try {
            if (registro.id) {
                const response = await this.registersRepository.atualizarRegistro(registro.id, registroLocal);
                this.notificationService.showNotification('Registro alterado com sucesso!', '', 'success');
            }
            return true;
        } catch (error) {
            this.notificationService.showNotification('Ocorreu um erro ao criar o registro', '', 'error');
            return false;
        }
    }

    private async apagarRegistroOrbit(registro: any) {
        try {
            const response = await firstValueFrom(this.orbitClient.deletarRegistro(registro.orbit_id));
            this.notificationService.showNotification('Registro excluído no Orbit com sucesso!', '', 'success');
        } catch (httpErroResponse: any) {
            this.notificationService.showNotification('Ocorreu um erro ao excluir o registro no Orbit', '', 'error');
            throw httpErroResponse;
        }
    }

    async apagarRegistroLocal(registro: any) {
        const id = Number(registro.id);
        try {

            const response = await this.registersRepository.excluirRegistro(id)
            this.notificationService.showNotification('Registro excluído com sucesso!', '', 'success');
        } catch (error) {

            this.notificationService.showNotification('Ocorreu um erro ao excluír o registro', '', 'error');
        }
    }

    async obterResumoTotalMes(date: Date) {
        const startEndMonth = this.appUtils.obterStartEndMonth(date);
        let resumoTotalMes = {
            total_sum_hours_recorded: '',
            total_status_approved: '',
            total_status_waiting_approval: '',
            total_status_error: '',
            working_hours: ''
        }
        if (await this.validarIntegracaoOrbit) {
            try {
                const resumoMes: any = await firstValueFrom(this.orbitClient.obterResumoTotalMes(startEndMonth.primeiroDia, startEndMonth.ultimoDia));
                const resumoRegistros: any = await firstValueFrom(this.orbitClient.obterResumoStatusRegitros(startEndMonth.primeiroDia, startEndMonth.ultimoDia));
                const resumoHoras: any = await firstValueFrom(this.orbitClient.obterResumoHoraTrabalho(startEndMonth.primeiroDia, startEndMonth.ultimoDia));
                resumoTotalMes = {
                    total_sum_hours_recorded: resumoMes.data.total_sum_hours_recorded,
                    total_status_approved: resumoRegistros.data.total_status_approved,
                    total_status_waiting_approval: resumoRegistros.data.total_status_waiting_approval,
                    total_status_error: resumoRegistros.data.total_status_error,
                    working_hours: resumoHoras.data.working_hours
                };
            } catch (error) {
            }
        }
        return resumoTotalMes;
    }

    async syncRegistersWithOrbitByDay(date: string) {
        let registrosOrbit = await this.obterRegistrosPorDiaOrbit(date);
        await this.salvarRegistrosOrbitnoLocal(registrosOrbit);
        const registrosLocal = await this.obterRegistrosPorDiaLocal(date);
        await this.atualizarRegistrosApagadosNoOrbit(registrosLocal, registrosOrbit);
        const hasRegistrosEnviados = await this.salvarRegistrosLocalnoOrbit(registrosLocal, true);
        if (hasRegistrosEnviados) {
            if (!this.isAutoSyncOrbit()) {
                AppUtils.ThreadSleep(5);
                registrosOrbit = await this.obterRegistrosPorDiaOrbit(date);
                await this.salvarRegistrosOrbitnoLocal(registrosOrbit);
            } else {
                registrosOrbit = await this.obterRegistrosPorDiaOrbit(date);
            }
        }
        return { registrosOrbit, registrosLocal };
    }

    async syncRegistersWithOrbit() {
        const daysTaskoo = await this.daysWithWarningTaskoo();
        for (let i = 0; i < daysTaskoo.length; i++) {
            const day = daysTaskoo[i];
            await this.syncRegistersWithOrbitByDay(AppUtils.formatarData(day.date))
        }
    }

    async obterDaysWithWarning(date: Date) {
        let daysWithWarning: { day: number, month: number, date: Date, status: String }[] = [];
        const daysOrbit = await this.daysWithWarningOrbit(date);
        const daysTaskoo = await this.daysWithWarningTaskoo();
        if (daysOrbit.length > 0) {
            daysOrbit.forEach(day => daysWithWarning.push({ day: day.date.getDate(), month: day.date.getMonth() + 1, date: day.date, status: day.status }));
        }
        if (daysTaskoo.length > 0) {
            daysTaskoo.forEach(day => daysWithWarning.push({ day: day.date.getDate(), month: day.date.getMonth() + 1, date: day.date, status: day.status }));
        }
        return daysWithWarning;
    }

    async daysWithWarningOrbit(date: Date) {
        const endCurrentMonth = this.appUtils.obterStartEndMonth(date).ultimoDia;
        date.setMonth(date.getMonth() - 1);
        const beginLastMonth = this.appUtils.obterStartEndMonth(date).primeiroDia
        const resumoDiasMes = await firstValueFrom(this.orbitClient.obterResumoDiasMes(beginLastMonth, endCurrentMonth));

        let days: { date: Date, status: String }[] = [];
        resumoDiasMes.data.forEach((resumoDia: any) => {
            const release_date = resumoDia.release_date;
            const status = resumoDia.high_priority_status !== 'APPROVED' && resumoDia.high_priority_status !== 'WAITING_APPROVAL' ? StatusRegistros.PENDING: '';
            days.push({ date: new Date(release_date.replace("T", " ").replace("Z", "")), status: status });
        });
        return days;
    }

    async daysWithWarningTaskoo() {
        const daysWithWarning: any = await this.registersRepository.daysWithWarning();
        let days: { date: Date, status: String }[] = [];
        daysWithWarning.forEach((data: any) => {
            days.push({ date: new Date(data.day_warning + " 00:00"), status: data.status });
        }
        );
        return days;
    }

    async validarIntegracaoOrbit() {
        return await this.orbitClient.verificarIntegracaoOrbit();
    }

    isAutoSyncOrbit(): boolean {
        return this.appSettings.isAutoSyncOrbit();
    }

    async exceedsLimit(registro: any) {
        const totalHorasNormaisDia: any = await this.registersRepository.consultarTotalHorasNormaisDia(registro.release_date, String(registro.id));
        const totalMinutosNormalDia = AppUtils.converterParaMinutos(totalHorasNormaisDia[0].total_horas_dia);
        const limiteDia = (60 * 8);
        let timeSheetMinutes = AppUtils.converterParaMinutos(registro.total_time_sheet_hours);
        if (registro.hour_type === "NORMAL" && (totalMinutosNormalDia + timeSheetMinutes) > limiteDia) {
            if (totalMinutosNormalDia < limiteDia) {
                let registroAdditional = structuredClone(registro);
                registroAdditional.hour_type = "ADDITIONAL";
                registroAdditional.start_at = AppUtils.addMinutesToTime(registroAdditional.start_at, limiteDia - totalMinutosNormalDia);
                registroAdditional.total_time_sheet_hours = AppUtils.getTotalTimeSheetHours(registroAdditional.start_at, registroAdditional.end_at);
                registroAdditional.orbit_id = '';
                registroAdditional.status = StatusRegistros.PENDING;

                registro.end_at = registroAdditional.start_at;
                registro.total_time_sheet_hours = AppUtils.getTotalTimeSheetHours(registro.start_at, registro.end_at);
                return registroAdditional;
            }
        }
        return null;
    }

    async hasSaldoDia(date: string) {
        const totalHorasNormaisDia: any = await this.registersRepository.consultarTotalHorasNormaisDia(date, '');
        const minutosNormaisDia = AppUtils.converterParaMinutos(totalHorasNormaisDia[0].total_horas_dia);
        return minutosNormaisDia < (60 * 8);
    }

    async consultarUltimoRegistroDia(date: string) {
        const ultimoRegistro: any = await this.registersRepository.consultarUltimoRegistroDia(date);
        if (ultimoRegistro && ultimoRegistro.length > 0) {
            return ultimoRegistro[0];
        }
        return null;
    }

    static statusRegistros() {
        return StatusRegistros;
    }
}