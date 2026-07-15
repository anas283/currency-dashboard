import { Injectable, OnDestroy, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OnlineService implements OnDestroy {
  readonly online = signal<boolean>(this.readOnline());

  private readonly handleOnline = () => this.online.set(true);
  private readonly handleOffline = () => this.online.set(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  private readOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}
