import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let storage: Record<string, string | null>;
  let matchMediaCalls: { query: string; matches: boolean }[];
  let originalLocalStorage: Storage;
  let originalMatchMedia: ((query: string) => MediaQueryList) | undefined;

  beforeAll(() => {
    originalLocalStorage = globalThis.localStorage;
    originalMatchMedia = globalThis.matchMedia;
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });

    if (originalMatchMedia) {
      Object.defineProperty(globalThis, 'matchMedia', {
        value: originalMatchMedia,
        configurable: true,
      });
    } else {
      delete (globalThis as { matchMedia?: unknown }).matchMedia;
    }
  });

  const setupMocks = (options: {
    storedTheme?: string | null;
    prefersDark?: boolean;
  } = {}) => {
    storage = {};
    if (options.storedTheme !== undefined) {
      storage['cx-theme'] = options.storedTheme;
    }

    matchMediaCalls = [];

    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, 'matchMedia', {
      value: (query: string) => {
        matchMediaCalls.push({ query, matches: options.prefersDark ?? false });
        return {
          matches: options.prefersDark ?? false,
          media: query,
          addEventListener: () => void 0,
          removeEventListener: () => void 0,
          dispatchEvent: () => false,
        };
      },
      configurable: true,
    });
  };

  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('should use stored light theme', () => {
    setupMocks({ storedTheme: 'light' });
    service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should use stored dark theme', () => {
    setupMocks({ storedTheme: 'dark' });
    service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should fall back to system preference when no valid stored theme', () => {
    setupMocks({ storedTheme: null, prefersDark: true });
    service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(matchMediaCalls).toContain(
      jasmine.objectContaining({ query: '(prefers-color-scheme: dark)' })
    );
  });

  it('should default to light when no stored theme and system preference is light', () => {
    setupMocks({ storedTheme: null, prefersDark: false });
    service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should ignore invalid stored theme and fall back to system preference', () => {
    setupMocks({ storedTheme: 'invalid', prefersDark: true });
    service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  describe('toggle', () => {
    it('should switch from light to dark and persist', () => {
      setupMocks({ storedTheme: 'light' });
      service = TestBed.inject(ThemeService);

      service.toggle();

      expect(service.theme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(storage['cx-theme']).toBe('dark');
    });

    it('should switch from dark to light and persist', () => {
      setupMocks({ storedTheme: 'dark' });
      service = TestBed.inject(ThemeService);

      service.toggle();

      expect(service.theme()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(storage['cx-theme']).toBe('light');
    });
  });

  describe('setTheme', () => {
    it('should set light theme and persist', () => {
      setupMocks({ storedTheme: 'dark' });
      service = TestBed.inject(ThemeService);

      service.setTheme('light');

      expect(service.theme()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(storage['cx-theme']).toBe('light');
    });

    it('should set dark theme and persist', () => {
      setupMocks({ storedTheme: 'light' });
      service = TestBed.inject(ThemeService);

      service.setTheme('dark');

      expect(service.theme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(storage['cx-theme']).toBe('dark');
    });
  });
});
