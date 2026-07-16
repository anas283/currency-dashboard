import { Pipe, PipeTransform } from '@angular/core';

export type SortableValue = string | number;

export type Sortable = Record<string, SortableValue | undefined>;

export type SortDirection = 'asc' | 'desc' | 'none';

function compare(a: SortableValue | undefined, b: SortableValue | undefined): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  return String(a).localeCompare(String(b));
}

function getValue(item: object, key: string): SortableValue | undefined {
  const record = item as Sortable;
  return key in record ? record[key] : undefined;
}

@Pipe({
  name: 'sort',
  standalone: true,
})
export class SortPipe implements PipeTransform {
  transform<T extends object>(value: T[] | null | undefined, key: string, direction: SortDirection): T[] {
    if (!value || value.length < 2 || direction === 'none') {
      return value ?? [];
    }

    if (!value.every((item) => key in item)) {
      return value;
    }

    const multiplier = direction === 'desc' ? -1 : 1;

    return [...value].sort((a, b) => compare(getValue(a, key), getValue(b, key)) * multiplier);
  }
}
