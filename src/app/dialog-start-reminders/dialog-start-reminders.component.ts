import { Component } from '@angular/core';
import { invoke } from "@tauri-apps/api/tauri";
import { WebviewWindow } from '@tauri-apps/api/window'

@Component({
  selector: 'app-dialog-start-reminders',
  templateUrl: './dialog-start-reminders.component.html',
  styleUrls: ['./dialog-start-reminders.component.css']
})
export class DialogStartRemindersComponent {

  async onNoClick(): Promise<void> {
    invoke<string>("start_reminders", { isStartReminders:false }).then();
    this.closeDialogView();
  }

  async onYesClick(): Promise<void> {
    invoke<string>("start_reminders", { isStartReminders:true });
    this.closeDialogView();
  }

  async closeDialogView(): Promise<void> {
    const webView = await WebviewWindow.getByLabel('start-reminders');
    if (webView) {
      await webView.close();
    }
  }
}
