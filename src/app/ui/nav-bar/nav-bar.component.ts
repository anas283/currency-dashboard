import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { ThemeService } from '../../core/services/theme.service';

interface NavLink {
  label: string;
  href: string;
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBarComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly links = signal<NavLink[]>([
    { label: 'Dashboard', href: '#' },
    { label: 'Rates', href: '#' },
    { label: 'Trends', href: '#' },
    { label: 'Converter', href: '#' },
  ]);
}
