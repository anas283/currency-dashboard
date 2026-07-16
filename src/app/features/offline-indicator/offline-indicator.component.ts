import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { RealtimeService } from '../../core/services/realtime.service';
import { RatesService } from '../../core/services/rates.service';
import { BadgeComponent, BadgeVariant } from '../../ui/badge/badge.component';

type BadgeStatus = 'live' | 'stale' | 'offline' | 'error';

function toMs(timestamp: number): number {
  return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
}

function formatSecondsAgo(timestamp: number): number {
  return Math.max(0, Math.floor((Date.now() - toMs(timestamp)) / 1000));
}

function formatMinutesAgo(timestamp: number): number {
  return Math.max(0, Math.floor((Date.now() - toMs(timestamp)) / 60_000));
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

  private readonly status = computed<BadgeStatus>(() => this.ratesService.status());

  readonly variant = computed<BadgeVariant>(() => {
    const current = this.status();
    return current === 'live' || current === 'stale' ? 'positive' : 'negative';
  });

  readonly label = computed<string>(() => {
    const current = this.status();
    const lastUpdated = this.realtimeService.lastUpdated$();

    switch (current) {
      case 'live':
        return lastUpdated === null
          ? 'Live'
          : `Live · updated ${formatSecondsAgo(lastUpdated)}s ago`;
      case 'stale':
        return lastUpdated === null
          ? 'Cached'
          : `Cached · fetched ${formatMinutesAgo(lastUpdated)}m ago`;
      case 'offline':
        return 'Offline — showing cached data';
      case 'error':
        return 'Error — using cached data';
      default:
        return '';
    }
  });
}
