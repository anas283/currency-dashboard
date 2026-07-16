import {
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
} from '@angular/core';

import { SortDirection } from '../pipes/sort.pipe';

export interface SortChange {
  key: string;
  direction: SortDirection;
}

function nextDirection(direction: SortDirection): SortDirection {
  switch (direction) {
    case 'none':
      return 'asc';
    case 'asc':
      return 'desc';
    case 'desc':
      return 'none';
  }
}

function ariaSortValue(direction: SortDirection): 'ascending' | 'descending' | 'none' {
  switch (direction) {
    case 'asc':
      return 'ascending';
    case 'desc':
      return 'descending';
    case 'none':
      return 'none';
  }
}

@Directive({
  selector: '[appSortHeader]',
  standalone: true,
})
export class SortHeaderDirective implements OnInit, OnDestroy {
  @Input({ required: true }) sortKey!: string;

  @Input()
  get activeKey(): string {
    return this._activeKey;
  }
  set activeKey(value: string) {
    this._activeKey = value;
    this.updateState();
  }
  private _activeKey = '';

  @Input()
  get direction(): SortDirection {
    return this._direction;
  }
  set direction(value: SortDirection) {
    this._direction = value;
    this.updateState();
  }
  private _direction: SortDirection = 'none';

  @Output() sortChange = new EventEmitter<SortChange>();

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly button = this.renderer.createElement('button') as HTMLButtonElement;
  private readonly indicator = this.renderer.createElement('span') as HTMLSpanElement;
  private removeClickListener: (() => void) | null = null;
  private initialized = false;

  ngOnInit(): void {
    const host = this.elementRef.nativeElement;

    this.renderer.setAttribute(this.button, 'type', 'button');
    this.renderer.addClass(this.button, 'sort-header__button');

    this.renderer.setAttribute(this.indicator, 'aria-hidden', 'true');
    this.renderer.addClass(this.indicator, 'sort-header__indicator');

    while (host.firstChild) {
      this.renderer.appendChild(this.button, host.firstChild);
    }

    this.renderer.appendChild(this.button, this.indicator);
    this.renderer.appendChild(host, this.button);

    this.removeClickListener = this.renderer.listen(this.button, 'click', () => this.onClick());
    this.initialized = true;
    this.updateState();
  }

  ngOnDestroy(): void {
    this.removeClickListener?.();
  }

  private onClick(): void {
    this.sortChange.emit({
      key: this.sortKey,
      direction: nextDirection(this.direction),
    });
  }

  private updateState(): void {
    if (!this.initialized) {
      return;
    }

    const active = this.activeKey === this.sortKey;
    const direction = this.direction;

    this.renderer.setAttribute(
      this.elementRef.nativeElement,
      'aria-sort',
      active ? ariaSortValue(direction) : 'none',
    );

    this.indicator.textContent = active && direction !== 'none' ? (direction === 'asc' ? '▲' : '▼') : '';
  }
}
