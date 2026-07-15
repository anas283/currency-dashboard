import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { BadgeComponent, BadgeVariant } from './badge.component';

@Component({
  standalone: true,
  imports: [BadgeComponent],
  template: `<app-badge [variant]="variant()">Live</app-badge>`,
})
class BadgeHost {
  readonly variant = input<BadgeVariant>('positive');
}

describe('BadgeComponent', () => {
  let fixture: ComponentFixture<BadgeHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeHost],
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeHost);
  });

  it('should create with positive variant by default', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();

    const badge = fixture.nativeElement.querySelector('.badge') as HTMLSpanElement;
    expect(badge.classList.contains('badge--positive')).toBeTrue();
  });

  it('should render negative variant', () => {
    fixture.componentRef.setInput('variant', 'negative');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge') as HTMLSpanElement;
    expect(badge.classList.contains('badge--negative')).toBeTrue();
  });

  it('should project content', () => {
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.directive(BadgeComponent))
      .nativeElement as HTMLElement;
    expect(badge.textContent).toContain('Live');
  });
});
