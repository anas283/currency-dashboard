import { TestBed } from '@angular/core/testing';

import { OnlineService } from './online.service';

describe('OnlineService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  const createService = (): OnlineService => TestBed.inject(OnlineService);

  it('should initialize online to navigator.onLine', () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(true);
    const service = createService();

    expect(service.online()).toBeTrue();
  });

  it('should initialize online to false when navigator.onLine is false', () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(false);
    const service = createService();

    expect(service.online()).toBeFalse();
  });

  it('should set online to true on window online event', () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(false);
    const service = createService();

    expect(service.online()).toBeFalse();

    window.dispatchEvent(new Event('online'));

    expect(service.online()).toBeTrue();
  });

  it('should set online to false on window offline event', () => {
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(true);
    const service = createService();

    expect(service.online()).toBeTrue();

    window.dispatchEvent(new Event('offline'));

    expect(service.online()).toBeFalse();
  });

  it('should default to true when navigator is undefined', () => {
    const global = globalThis as unknown as Record<string, unknown>;
    const nav = global['navigator'];
    delete global['navigator'];

    try {
      const service = createService();
      expect(service.online()).toBeTrue();
    } finally {
      global['navigator'] = nav;
    }
  });
});
