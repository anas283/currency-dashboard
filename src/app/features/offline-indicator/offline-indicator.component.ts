import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';

import { RealtimeService } from '../../core/services/realtime.service';
import { RatesService } from '../../core/services/rates.service';
import { BadgeComponent, BadgeVariant } from '../../ui/badge/badge.component';

const TIMESTAMP_MS_THRESHOLD = 1_000_000_000_000;
const REFRESH_INTERVAL_MS = 1_000;

function toMs(timestamp: number): number {
  return timestamp > TIMESTAMP_MS_THRESHOLD ? timestamp : timestamp * 1000;
}

function formatSecondsAgo(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - toMs(timestamp)) / 1000));
}

function formatMinutesAgo(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - toMs(timestamp)) / 60_000));
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

  private readonly baseNow = Date.now();
  private readonly now = toSignal(
    timer(0, REFRESH_INTERVAL_MS).pipe(
      map((tickCount) => this.baseNow + tickCount * REFRESH_INTERVAL_MS)
    ),
    { initialValue: this.baseNow }
  );

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
