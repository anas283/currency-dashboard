import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavBarComponent } from './nav-bar.component';
import { ThemeService } from '../../core/services/theme.service';

describe('NavBarComponent', () => {
  let fixture: ComponentFixture<NavBarComponent>;
  let themeService: Pick<ThemeService, 'theme' | 'toggle'>;

  beforeEach(async () => {
    themeService = {
      theme: signal('light'),
      toggle: jasmine.createSpy('toggle'),
    };

    await TestBed.configureTestingModule({
      imports: [NavBarComponent],
      providers: [{ provide: ThemeService, useValue: themeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(NavBarComponent);
  });

  it('should create and render brand + links', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('CurrencyDashboard');
    expect(compiled.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Rates');
    expect(compiled.textContent).toContain('Trends');
    expect(compiled.textContent).toContain('Converter');
  });

  it('should call themeService.toggle when theme toggle button is clicked', () => {
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.nav-bar__toggle'
    ) as HTMLButtonElement;
    button.click();

    expect(themeService.toggle).toHaveBeenCalled();
  });
});
