import { SortPipe, SortDirection } from './sort.pipe';

interface TestItem {
  name: string;
  value: number;
  optional?: string;
}

describe('SortPipe', () => {
  const pipe = new SortPipe();
  const items: TestItem[] = [
    { name: 'banana', value: 2 },
    { name: 'apple', value: 1 },
    { name: 'cherry', value: 3 },
  ];

  it('returns original array when direction is none', () => {
    const result = pipe.transform(items, 'value', 'none');

    expect(result).toBe(items);
  });

  it('sorts numeric values ascending', () => {
    const result = pipe.transform(items, 'value', 'asc');

    expect(result.map((item) => item.value)).toEqual([1, 2, 3]);
  });

  it('sorts numeric values descending', () => {
    const result = pipe.transform(items, 'value', 'desc');

    expect(result.map((item) => item.value)).toEqual([3, 2, 1]);
  });

  it('sorts string values ascending', () => {
    const result = pipe.transform(items, 'name', 'asc');

    expect(result.map((item) => item.name)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('returns original array when key is missing', () => {
    const result = pipe.transform(items, 'missing', 'asc');

    expect(result).toBe(items);
  });

  it('does not mutate the input array', () => {
    const original = [...items];

    pipe.transform(items, 'value', 'asc');

    expect(items).toEqual(original);
  });

  it('returns an empty array for null or undefined input', () => {
    expect(pipe.transform(null, 'value', 'asc')).toEqual([]);
    expect(pipe.transform(undefined, 'value', 'asc')).toEqual([]);
  });

  it('accepts allowed direction literals', () => {
    const directions: SortDirection[] = ['asc', 'desc', 'none'];

    expect(directions.length).toBe(3);
  });
});
