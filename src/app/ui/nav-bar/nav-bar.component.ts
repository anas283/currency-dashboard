import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../core/services/theme.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { OfflineIndicatorComponent } from '../../features/offline-indicator/offline-indicator.component';

interface NavLink {
  label: string;
  path: string;
}

const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, OfflineIndicatorComponent],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBarComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly realtimeService = inject(RealtimeService);
  protected readonly links = signal<NavLink[]>([
    { label: 'Dashboard', path: '/' },
    { label: 'Rates', path: '/rates' },
    { label: 'Trends', path: '/trends' },
    { label: 'Converter', path: '/converter' },
  ]);

  protected readonly lastUpdatedLabel = computed<string | null>(() => {
    const timestamp = this.realtimeService.lastUpdated();
    if (timestamp === null) {
      return null;
    }
    return `Updated ${TIME_FORMATTER.format(new Date(timestamp))}`;
  });
}
