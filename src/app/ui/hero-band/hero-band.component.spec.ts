import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeroBandComponent } from './hero-band.component';

describe('HeroBandComponent', () => {
  let fixture: ComponentFixture<HeroBandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroBandComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroBandComponent);
  });

  it('should create and render headline', () => {
    fixture.componentRef.setInput('headline', 'Exchange rates');
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();

    const headline = fixture.nativeElement.querySelector(
      'h1'
    ) as HTMLHeadingElement;
    expect(headline.textContent).toContain('Exchange rates');
  });

  it('should render subheadline when provided', () => {
    fixture.componentRef.setInput('headline', 'Exchange rates');
    fixture.componentRef.setInput('subheadline', 'Track currencies in real time');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Track currencies in real time');
  });

  it('should apply dark variant class', () => {
    fixture.componentRef.setInput('headline', 'Exchange rates');
    fixture.componentRef.setInput('variant', 'dark');
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.classList.contains('hero-band--dark')).toBeTrue();
  });
});
