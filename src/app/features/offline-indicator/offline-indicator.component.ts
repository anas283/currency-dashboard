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
import { BadgeComponent, BadgeVariant } from '../../ui/badge/badge.component';

const STALE_THRESHOLD_MINUTES = 24 * 60;

function formatSecondsAgo(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - timestamp) / 1000));
}

// Sample data ships with a fixed timestamp, so "minutes ago" against the
// current date can run into the hundreds of thousands — show a date instead.
function formatFetchedAgo(timestamp: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes <= STALE_THRESHOLD_MINUTES) {
    return `${minutes}m ago`;
  }
  return `on ${new Date(timestamp).toLocaleDateString()}`;
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

  private readonly now = signal(Date.now());

  constructor() {
    effect((onCleanup) => {
      const status = this.realtimeService.status();
      const interval = status === 'live' || status === 'polling' ? 1000 : 60_000;
      const base = Date.now();

      const subscription = timer(0, interval)
        .pipe(map((tickCount) => base + tickCount * interval))
        .subscribe((value) => this.now.set(value));

      onCleanup(() => subscription.unsubscribe());
    });
  }

  readonly variant = computed<BadgeVariant>(() => {
    const current = this.realtimeService.status();
    return current === 'live' || current === 'polling' ? 'positive' : 'negative';
  });

  readonly label = computed<string>(() => {
    const current = this.realtimeService.status();
    const lastUpdated = this.realtimeService.lastUpdated();
    const now = this.now();

    switch (current) {
      case 'live':
        return lastUpdated === null
          ? 'Live'
          : `Live · updated ${formatSecondsAgo(lastUpdated, now)}s ago`;
      case 'polling':
        return lastUpdated === null
          ? 'Polling'
          : `Polling · updated ${formatSecondsAgo(lastUpdated, now)}s ago`;
      case 'backing-off':
        return lastUpdated === null
          ? 'Backing off'
          : `Backing off · fetched ${formatFetchedAgo(lastUpdated, now)}`;
      case 'paused':
        return 'Paused';
      case 'offline':
        return 'Offline — showing cached data';
      case 'error':
        return 'Error — using cached data';
      default:
        return '';
    }
  });
}
