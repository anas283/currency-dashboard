import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
  });

  it('should create and render copyright', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('CurrencyDashboard');
    expect(compiled.textContent).toContain('All rights reserved');
  });

  it('should use provided year', () => {
    fixture.componentRef.setInput('year', 2025);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2025');
  });
});
