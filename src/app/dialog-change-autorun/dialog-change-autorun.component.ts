import { Component } from '@angular/core';
import { invoke } from "@tauri-apps/api/tauri";
import { WebviewWindow } from '@tauri-apps/api/window'
import { AppSettings } from 'src/utils/app.settings';
import { enable, isEnabled, disable } from "tauri-plugin-autostart-api";

@Component({
  selector: 'app-dialog-change-autorun',
  templateUrl: './dialog-change-autorun.component.html',
  styleUrls: ['./dialog-change-autorun.component.css']
})
export class DialogChangeAutorunComponent {

  private inicialized = false;
  constructor(private appSettings: AppSettings){
    this.inicialize();
  }

  async inicialize(){
    if(await this.appSettings.getAutoRunDefinition()){
      this.onYesClick();
    } else {
      this.onNoClick();
    }
    this.inicialized = true;
  }

  async onNoClick(): Promise<void> {
    if(await isEnabled()){
      await disable();
    }
    this.appSettings.setAutoRunDefinition(false);
    this.closeDialogView();
  }

  async onYesClick(): Promise<void> {
    await enable();
    this.appSettings.setAutoRunDefinition(true);
    this.closeDialogView();
  }

  async closeDialogView(): Promise<void> {
    const webView = await WebviewWindow.getByLabel('change-autorun');
    if (webView) {
      await webView.hide();
    }
  }
}
