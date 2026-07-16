import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SortChange, SortHeaderDirective } from './sort-header.directive';
import { SortDirection } from '../pipes/sort.pipe';

@Component({
  template: `
    <table>
      <thead>
        <tr>
          <th
            appSortHeader
            [sortKey]="sortKey"
            [activeKey]="activeKey"
            [direction]="direction"
            (sortChange)="onSortChange($event)">
            Name
          </th>
        </tr>
      </thead>
    </table>
  `,
  standalone: true,
  imports: [SortHeaderDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestHostComponent {
  @ViewChild(SortHeaderDirective, { static: true }) directive!: SortHeaderDirective;
  sortKey = 'name';
  activeKey = '';
  direction: SortDirection = 'none';
  lastEvent: SortChange | null = null;

  onSortChange(event: SortChange): void {
    this.lastEvent = event;
  }
}

describe('SortHeaderDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  function getHeader(): HTMLTableCellElement {
    return fixture.nativeElement.querySelector('th') as HTMLTableCellElement;
  }

  function getButton(): HTMLButtonElement {
    return getHeader().querySelector('button') as HTMLButtonElement;
  }

  function getIndicator(): HTMLSpanElement {
    return getButton().querySelector('.sort-header__indicator') as HTMLSpanElement;
  }

  function updateInputs(activeKey: string, direction: SortDirection): void {
    fixture.componentInstance.activeKey = activeKey;
    fixture.componentInstance.direction = direction;
    fixture.componentInstance.directive.activeKey = activeKey;
    fixture.componentInstance.directive.direction = direction;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('wraps the header content in a type="button" element', () => {
    const button = getButton();

    expect(button).toBeTruthy();
    expect(button.type).toBe('button');
    expect(button.textContent).toContain('Name');
  });

  it('cycles direction none → asc → desc → none on click', () => {
    const button = getButton();
    const directive = fixture.componentInstance.directive;

    button.click();
    expect(fixture.componentInstance.lastEvent).toEqual({ key: 'name', direction: 'asc' });

    directive.direction = 'asc';
    fixture.detectChanges();
    button.click();
    expect(fixture.componentInstance.lastEvent).toEqual({ key: 'name', direction: 'desc' });

    directive.direction = 'desc';
    fixture.detectChanges();
    button.click();
    expect(fixture.componentInstance.lastEvent).toEqual({ key: 'name', direction: 'none' });
  });

  it('sets aria-sort to ascending when active and direction is asc', () => {
    updateInputs('name', 'asc');

    expect(getHeader().getAttribute('aria-sort')).toBe('ascending');
  });

  it('sets aria-sort to descending when active and direction is desc', () => {
    updateInputs('name', 'desc');

    expect(getHeader().getAttribute('aria-sort')).toBe('descending');
  });

  it('sets aria-sort to none when not active', () => {
    updateInputs('value', 'asc');

    expect(getHeader().getAttribute('aria-sort')).toBe('none');
  });

  it('sets aria-sort to none when active but direction is none', () => {
    updateInputs('name', 'none');

    expect(getHeader().getAttribute('aria-sort')).toBe('none');
  });

  it('renders an ascending arrow indicator when active and direction is asc', () => {
    updateInputs('name', 'asc');

    expect(getIndicator().textContent).toBe('▲');
  });

  it('renders a descending arrow indicator when active and direction is desc', () => {
    updateInputs('name', 'desc');

    expect(getIndicator().textContent).toBe('▼');
  });

  it('renders no arrow indicator when not active', () => {
    updateInputs('value', 'asc');

    expect(getIndicator().textContent).toBe('');
  });

  it('renders no arrow indicator when active but direction is none', () => {
    updateInputs('name', 'none');

    expect(getIndicator().textContent).toBe('');
  });
});
