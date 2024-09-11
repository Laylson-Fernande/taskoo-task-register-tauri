import { Component, NgZone } from '@angular/core';
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/window'
import { formatDate } from '@angular/common';
import { OrbitClient, OrbitParams } from 'src/services/orbit/orbitClient';
import { Howl } from 'howler';
import { RegistersService } from 'src/services/app/registers.service';
import { EventService } from 'src/utils/event-service';

@Component({
  selector: 'app-dialog-note-reminder',
  templateUrl: './dialog-note-reminder.component.html',
  styleUrls: ['./dialog-note-reminder.component.css']
})
export class DialogNoteReminderComponent {

  newHourFinal: any = '';
  lastRegister: any;

  private sound = new Howl({
    src: ['assets/audio/cuckoo.mp3']
  });

  constructor(private zone: NgZone, private registersService:RegistersService) {
    listen('atualizar-note-reminder', (event) => {
      this.zone.run(() => {
        this.atualizar();
      });
    });
    listen('stop-sound-notification', (event) => {
      this.zone.run(() => {
        this.stopSoundNotification();
      });
    });
  }

  atualizar() {
    this.newHourFinal = formatDate(new Date(), 'HH:mm', 'en-US');
    const lasRegister = localStorage.getItem("lastRegister");
    if (lasRegister) {
      this.lastRegister = JSON.parse(lasRegister);
    }
    this.playSoundNotification();
  }

  playSoundNotification() {
    if (!this.sound.playing()) {
      this.sound.volume(1);
      this.sound.loop(true);
      this.sound.play();
    }
  }

  stopSoundNotification() {
    if (this.sound.playing()) {
      this.sound.stop();
    }
  }

  async redirectToDashboard() {
    const app = await WebviewWindow.getByLabel('main');
    if (app) {
      await app.show();
      await app.setFocus();
      await app.maximize();
      await app.emit("atualizar-dashboard","");
      //this.eventService.emitEvent('atualizar-dashboard', { some: 'data' });
      this.fecharDialog();
    }
  }

  async fecharDialog() {
    const dialog = await WebviewWindow.getByLabel('note-reminder');
    if (dialog) {
      await dialog.hide();
    }
  }


  criarNovoRegistro() {
    this.redirectToDashboard();
    this.stopSoundNotification();
  }

  async atualizarUltimoRegistro() {
    this.stopSoundNotification();
    this.lastRegister.end_at = this.newHourFinal;
    const alterado = await this.registersService.alterarRegistro(this.lastRegister);
    if(!alterado){
      this.redirectToDashboard();
    } else {
      this.fecharDialog();
    }
  }

  fecharLembrete() {
    this.stopSoundNotification();
    this.fecharDialog();
  }
}
