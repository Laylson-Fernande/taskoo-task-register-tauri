import { Injectable } from '@angular/core';
import {
    checkUpdate,
    installUpdate,
    onUpdaterEvent,
} from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import { invoke } from '@tauri-apps/api/tauri';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class CheckUpdate {

    constructor(private http: HttpClient) {
        //this.atualizar();
    }

    async atualizar() {
        const unlisten = await onUpdaterEvent(({ error, status }) => {
            console.log('Updater event', error, status)
        })

        try {
            const { shouldUpdate, manifest } = await checkUpdate()

            if (shouldUpdate) {
                // You could show a dialog asking the user if they want to install the update here.
                console.log(
                    `Installing update ${manifest?.version}, ${manifest?.date}, ${manifest?.body}`
                )

                // Install the update. This will also restart the app on Windows!
                await installUpdate()

                // On macOS and Linux you will need to restart the app manually.
                // You could use this step to display another confirmation dialog.
                //await relaunch()
            }
        } catch (error) {
            console.error(error)
        }

        // you need to call unlisten if your handler goes out of scope, for example if the component is unmounted.
        unlisten()
    }

}