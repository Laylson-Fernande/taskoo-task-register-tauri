import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private eventSubject = new Subject<any>();

  emitEvent(eventName: string, data: any) {
    this.eventSubject.next({ eventName, data });
  }

  getEvent() {
    return this.eventSubject.asObservable();
  }
}
