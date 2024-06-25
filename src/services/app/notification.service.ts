import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  id: number; // Adicionamos um ID para cada notificação
  message: string;
  details: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new Subject<Notification[]>(); // Usamos um Subject para emitir um array de notificações
  notifications$ = this.notificationsSubject.asObservable();
  private nextId = 1; // Contador para gerar IDs únicos
  notifications: Notification[] = [];

  showNotification(message: string, details: string, type: 'success' | 'error') {
    const newNotification: Notification = {
      id: this.nextId++,
      message,
      details,
      type
    };

    this.notifications.push(newNotification);
    this.notificationsSubject.next(this.notifications); // Emite o novo array de notificações

    setTimeout(() => {
      this.removeNotification(newNotification.id); // Remove a notificação após 3 segundos
    }, 5000);
  }

  removeNotification(id: number) {
    this.notifications = this.notifications.filter(notification => notification.id !== id); // Remove do array
    this.notificationsSubject.next(this.notifications); // Emite uma notificação "vazia" para o componente atualizar
  }
}