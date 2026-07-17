import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../core/services/theme.service';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBarComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly links = signal<NavLink[]>([
    { label: 'Dashboard', path: '/' },
    { label: 'Rates', path: '/rates' },
    { label: 'Trends', path: '/trends' },
    { label: 'Converter', path: '/converter' },
  ]);
}
