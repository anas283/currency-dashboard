import { Injectable, OnDestroy, inject, signal, computed } from '@angular/core';
import { Subject, Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';

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
  private failureCount = 0;
  private consecutiveFailures = 0;
  private isPolling = false;
  private pendingRefresh = false;

  private readonly trigger = new Subject<void>();
  private readonly resume$ = new Subject<void>();
  private readonly triggerSubscription: Subscription;
  private timerSubscription?: Subscription;

  private readonly onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && !document.hidden && this.onlineService.online()) {
      this.resume$.next();
    }
  };

  private readonly onOnlineEvent = (): void => {
    if (this.onlineService.online()) {
      this.resume$.next();
    }
  };

  constructor() {
    this.triggerSubscription = this.trigger.subscribe(() => this.onTick());

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnlineEvent);
    }

    this.scheduleNext(0);
  }

  ngOnDestroy(): void {
    this.triggerSubscription.unsubscribe();
    this.timerSubscription?.unsubscribe();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnlineEvent);
    }
  }

  refresh(): void {
    this.failureCount = 0;
    this.consecutiveFailures = 0;
    this.timerSubscription?.unsubscribe();

    if (this.isPolling) {
      this.pendingRefresh = true;
      return;
    }

    this.trigger.next();
  }

  private async onTick(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    if (this.shouldPause()) {
      this.updatePausedStatus();
      this.isPolling = false;
      await this.waitForResume();
      this.onTick();
      return;
    }

    try {
      this.status.set('polling');
      await this.rates.loadLatest();
      this.handleResult();
    } catch {
      this.failureCount++;
      this.consecutiveFailures++;
      this.status.set('error');

      if (this.consecutiveFailures >= 5) {
        this.baseInterval = Math.min(this.baseInterval * 2, 5 * 60 * 1000);
        this.consecutiveFailures = 0;
      }

      this.scheduleNext(this.computeNextDelay());
    } finally {
      this.isPolling = false;
    }

    if (this.pendingRefresh) {
      this.pendingRefresh = false;
      this.trigger.next();
    }
  }

  private shouldPause(): boolean {
    return (typeof document !== 'undefined' && document.hidden) || !this.onlineService.online();
  }

  private updatePausedStatus(): void {
    if (!this.onlineService.online()) {
      this.status.set('offline');
    } else {
      this.status.set('paused');
    }
  }

  private waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const sub = this.resume$.pipe(take(1)).subscribe(() => {
        sub.unsubscribe();
        resolve();
      });
    });
  }

  private handleResult(): void {
    const ratesStatus = this.rates.status();

    if (ratesStatus === 'live') {
      this.failureCount = 0;
      this.consecutiveFailures = 0;
      this.status.set('live');
    } else {
      this.failureCount++;
      this.consecutiveFailures++;
      this.status.set(ratesStatus === 'error' ? 'error' : 'backing-off');

      if (this.consecutiveFailures >= 5) {
        this.baseInterval = Math.min(this.baseInterval * 2, 5 * 60 * 1000);
        this.consecutiveFailures = 0;
      }
    }

    this.scheduleNext(this.computeNextDelay());
  }

  private computeNextDelay(): number {
    if (this.failureCount > 0) {
      return Math.min(1000 * 2 ** (this.failureCount - 1), 60_000);
    }
    return this.baseInterval;
  }

  private scheduleNext(delayMs: number): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = timer(delayMs)
      .pipe(take(1))
      .subscribe(() => this.trigger.next());
  }
}
