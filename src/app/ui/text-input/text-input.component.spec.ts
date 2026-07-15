import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextInputComponent } from './text-input.component';

describe('TextInputComponent', () => {
  let fixture: ComponentFixture<TextInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextInputComponent);
  });

  it('should create with default inputs', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('text');
  });

  it('should render label and bind it to input', () => {
    fixture.componentRef.setInput('label', 'Amount');
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(label.textContent).toContain('Amount');
    expect(label.htmlFor).toBe(input.id);
  });

  it('should accept value, placeholder and type inputs', () => {
    fixture.componentRef.setInput('value', '100');
    fixture.componentRef.setInput('placeholder', '0.00');
    fixture.componentRef.setInput('type', 'number');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('100');
    expect(input.placeholder).toBe('0.00');
    expect(input.type).toBe('number');
  });

  it('should emit valueChange on input', () => {
    fixture.detectChanges();

    const onChange = jasmine.createSpy('valueChange');
    fixture.componentInstance.valueChange.subscribe(onChange);

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '42';
    input.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('42');
  });
});
