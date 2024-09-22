import { Component } from '@angular/core';
import { invoke } from "@tauri-apps/api/tauri";
import { WebviewWindow } from '@tauri-apps/api/window'
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { writeBinaryFile, BaseDirectory } from '@tauri-apps/api/fs';
import { fetch, ResponseType } from '@tauri-apps/api/http';
import { LoadingService } from 'src/services/app/loading.service';

@Component({
  selector: 'app-dialog-check-update',
  templateUrl: './dialog-check-update.component.html',
  styleUrls: ['./dialog-check-update.component.css']
})
export class DialogCheckUpdateComponent {

  private urlLatestRelease = "https://api.github.com/repos/Laylson-Fernande/taskoo-task-register-tauri/releases/latest";

  latest_version:string = "";
  current_version: string = "";
  release_link:string = "";

  constructor(private http: HttpClient, private loadingService: LoadingService) {
    this.verificarAtualizações();
  }

  async verificarAtualizações() {
    const latest_release: any = await firstValueFrom(this.http.get(this.urlLatestRelease));
    this.current_version  = await invoke<string>("get_version");
    if (latest_release.name && this.current_version < latest_release.name) {
      this.latest_version = latest_release.name;
      this.release_link = latest_release.html_url;
      this.exibirDialog();
    } else {
      this.closeDialogView();
    }
  }

  async downloadAndSaveFile(): Promise<void> {
    try {
      this.loadingService.setLoading(true);
      const latest_release: any = await firstValueFrom(this.http.get(this.urlLatestRelease));
      const asset = latest_release.assets.find((asset:any) => asset.name === "Taskoo.exe");

      if(asset){
      this.loadingService.setLoading(true);
      const response = await fetch(asset.browser_download_url, { method:"GET", responseType: ResponseType.Binary});
      const buffer = new Uint8Array(response.data as ArrayBuffer);

      this.loadingService.setLoading(true);
      await writeBinaryFile("Taskoo.exe", buffer, { dir: BaseDirectory.App});
      }
      console.log('Arquivo baixado e salvo com sucesso!');
      await invoke<string>("executar_script_powershell_update");
      this.loadingService.setLoading(false);
    } catch (error) {
      console.error('Erro ao baixar ou salvar o arquivo:', error);
      this.loadingService.setLoading(false);
    }
  }

  async exibirDialog(){
    const webView = await WebviewWindow.getByLabel('check-update');
    if (webView) {
      await webView.show();
    }
  }

  async onNoClick(): Promise<void> {
    invoke<string>("start_reminders", { isStartReminders:false }).then();
    this.closeDialogView();
  }

  async onYesClick(): Promise<void> {
    //invoke<string>("start_reminders", { isStartReminders:true });
    await this.downloadAndSaveFile();
    this.closeDialogView();
  }

  async closeDialogView(): Promise<void> {
    const webView = await WebviewWindow.getByLabel('check-update');
    if (webView) {
      await webView.close();
    }
  }

  openLink() {
      window.open(this.release_link, '_blank'); // Abre o link em uma nova aba
  }

}
