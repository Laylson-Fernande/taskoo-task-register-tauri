import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private syncing: boolean = false;

  isSyncing():boolean {
    return this.syncing;
  }

  setLoading(isLoading: boolean) {
    if(this.syncing){
      this.loadingSubject.next(false);
    } else {
      this.loadingSubject.next(isLoading);
    }
    
  }

  setSyncing(isSyncing:boolean){
    this.syncing = isSyncing;
  }
}
