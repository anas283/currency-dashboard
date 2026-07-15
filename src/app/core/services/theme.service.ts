import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly theme = signal<Theme>(this.resolveInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(value: Theme): void {
    this.theme.set(value);
    this.applyTheme(value);
    this.persistTheme(value);
  }

  private resolveInitialTheme(): Theme {
    const stored = this.readStoredTheme();
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return this.prefersDarkScheme() ? 'dark' : 'light';
  }

  private readStoredTheme(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem('cx-theme');
    } catch {
      return null;
    }
  }

  private prefersDarkScheme(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(value: Theme): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-theme', value);
  }

  private persistTheme(value: Theme): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem('cx-theme', value);
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }
}
