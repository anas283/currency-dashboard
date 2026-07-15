import { Injectable, OnDestroy, inject, signal, computed } from '@angular/core';
import { Subscription, timer } from 'rxjs';

import { RatesService } from './rates.service';
import { OnlineService } from './online.service';
import { ENV_TOKEN, EnvironmentConfig } from '../tokens/env.token';

export type RealtimeStatus = 'live' | 'polling' | 'backing-off' | 'paused' | 'offline' | 'error';

@Injectable({
  providedIn: 'root',
})
export class RealtimeService implements OnDestroy {
  private readonly rates = inject(RatesService);
  private readonly onlineService = inject(OnlineService);
  private readonly env = inject(ENV_TOKEN, { optional: true }) as EnvironmentConfig | null;

  readonly status = signal<RealtimeStatus>('live');
  readonly lastUpdated$ = computed(() => this.rates.lastUpdated());

  private baseInterval = this.env?.pollInterval ?? 60_000;
  private currentInterval = this.baseInterval;
  private failureCount = 0;
  private consecutiveFailures = 0;
  private isPolling = false;
  private pendingRefresh = false;
  private skipNextTick = false;

  private timerSubscription?: Subscription;

  private readonly onVisibilityChange = (): void => {
    if (this.shouldPause()) {
      this.pause();
    } else {
      this.resume();
    }
  };

  private readonly onOnline = (): void => {
    if (this.onlineService.online()) {
      this.resume();
    }
  };

  private readonly onOffline = (): void => {
    this.pause();
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    }

    this.resubscribeTimer(false);
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    }
  }

  refresh(): void {
    this.failureCount = 0;
    this.consecutiveFailures = 0;
    this.currentInterval = this.baseInterval;
    this.pendingRefresh = false;
    this.resubscribeTimer(false);
  }

  private onTick(): void {
    if (this.skipNextTick) {
      this.skipNextTick = false;
      return;
    }

    if (this.isPolling || this.shouldPause()) {
      if (this.shouldPause()) {
        this.updatePausedStatus();
      }
      return;
    }

    this.isPolling = true;
    this.status.set('polling');

    this.rates
      .loadLatest()
      .then(() => this.handleResult())
      .catch(() => this.handleFailure('error'))
      .finally(() => {
        this.isPolling = false;
        if (this.pendingRefresh) {
          this.pendingRefresh = false;
          this.refresh();
        }
      });
  }

  private handleResult(): void {
    const ratesStatus = this.rates.status();

    if (ratesStatus === 'live') {
      this.handleSuccess();
    } else {
      this.handleFailure(ratesStatus === 'error' ? 'error' : 'backing-off');
    }
  }

  private handleSuccess(): void {
    this.failureCount = 0;
    this.consecutiveFailures = 0;
    this.currentInterval = this.baseInterval;
    this.status.set('live');
    this.resubscribeTimer(true);
  }

  private handleFailure(status: RealtimeStatus): void {
    this.failureCount++;
    this.consecutiveFailures++;
    this.status.set(status);

    if (this.consecutiveFailures >= 5) {
      this.baseInterval = Math.min(this.baseInterval * 2, 5 * 60 * 1000);
      this.consecutiveFailures = 0;
    }

    this.currentInterval = this.computeBackoff();
    this.resubscribeTimer(true);
  }

  private computeBackoff(): number {
    return Math.min(1000 * 2 ** (this.failureCount - 1), 60_000);
  }

  private resubscribeTimer(skipImmediate: boolean): void {
    this.timerSubscription?.unsubscribe();
    this.skipNextTick = skipImmediate;

    if (this.shouldPause()) {
      this.updatePausedStatus();
      return;
    }

    this.timerSubscription = timer(0, this.currentInterval).subscribe(() => this.onTick());
  }

  private pause(): void {
    this.timerSubscription?.unsubscribe();
    this.updatePausedStatus();
  }

  private resume(): void {
    if (!this.shouldPause()) {
      this.resubscribeTimer(false);
    }
  }

  private shouldPause(): boolean {
    return (typeof document !== 'undefined' && document.hidden) || !this.onlineService.online();
  }

  private updatePausedStatus(): void {
    this.status.set(!this.onlineService.online() ? 'offline' : 'paused');
  }
}
