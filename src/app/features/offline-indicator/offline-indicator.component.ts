import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { map, timer } from 'rxjs';

import { RealtimeService } from '../../core/services/realtime.service';
import { RatesService } from '../../core/services/rates.service';
import { BadgeComponent, BadgeVariant } from '../../ui/badge/badge.component';

function formatSecondsAgo(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - timestamp) / 1000));
}

function formatMinutesAgo(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - timestamp) / 60_000));
}

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './offline-indicator.component.html',
  styleUrl: './offline-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineIndicatorComponent {
  readonly realtimeService = inject(RealtimeService);
  readonly ratesService = inject(RatesService);

  private readonly now = signal(Date.now());

  constructor() {
    effect((onCleanup) => {
      const status = this.ratesService.status();
      const interval = status === 'live' ? 1000 : 60_000;
      const base = Date.now();

      const subscription = timer(0, interval)
        .pipe(map((tickCount) => base + tickCount * interval))
        .subscribe((value) => this.now.set(value));

      onCleanup(() => subscription.unsubscribe());
    });
  }

  readonly variant = computed<BadgeVariant>(() => {
    const current = this.ratesService.status();
    return current === 'live' || current === 'stale' ? 'positive' : 'negative';
  });

  readonly label = computed<string>(() => {
    const current = this.ratesService.status();
    const lastUpdated = this.realtimeService.lastUpdated$();
    const now = this.now();

    switch (current) {
      case 'live':
        return lastUpdated === null
          ? 'Live'
          : `Live · updated ${formatSecondsAgo(lastUpdated, now)}s ago`;
      case 'stale':
        return lastUpdated === null
          ? 'Cached'
          : `Cached · fetched ${formatMinutesAgo(lastUpdated, now)}m ago`;
      case 'offline':
        return 'Offline — showing cached data';
      case 'error':
        return 'Error — using cached data';
      default:
        return '';
    }
  });
}
