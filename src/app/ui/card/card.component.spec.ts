import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CardComponent, CardVariant } from './card.component';

@Component({
  standalone: true,
  imports: [CardComponent],
  template: `<app-card [variant]="variant()">Card body</app-card>`,
})
class CardHost {
  readonly variant = input<CardVariant>('content');
}

describe('CardComponent', () => {
  let fixture: ComponentFixture<CardHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardHost],
    }).compileComponents();

    fixture = TestBed.createComponent(CardHost);
  });

  it('should create with content variant by default', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();

    const card = fixture.nativeElement.querySelector('.card') as HTMLDivElement;
    expect(card.classList.contains('card--content')).toBeTrue();
  });

  it('should apply each card variant class', () => {
    const variants: CardVariant[] = [
      'feature-sage',
      'feature-green',
      'feature-dark',
      'currency-converter',
    ];

    for (const variant of variants) {
      fixture.componentRef.setInput('variant', variant);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.card') as HTMLDivElement;
      expect(card.classList.contains(`card--${variant}`)).toBeTrue();
    }
  });

  it('should project content', () => {
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.directive(CardComponent))
      .nativeElement as HTMLElement;
    expect(card.textContent).toContain('Card body');
  });
});
