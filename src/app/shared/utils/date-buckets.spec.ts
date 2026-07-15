import { aggregate, Aggregation } from './date-buckets';

describe('date-buckets', () => {
  const point = (y: number, m: number, d: number, value: number) => ({
    date: new Date(Date.UTC(y, m - 1, d)),
    value,
  });

  describe('aggregate', () => {
    it('returns empty array for empty input', () => {
      expect(aggregate([], 'daily')).toEqual([]);
      expect(aggregate([], 'weekly')).toEqual([]);
      expect(aggregate([], 'monthly')).toEqual([]);
    });

    it('returns single point unchanged for daily aggregation', () => {
      const input = [point(2024, 6, 15, 10)];

      expect(aggregate(input, 'daily')).toEqual(input);
    });

    it('buckets single point to the start of its ISO week', () => {
      const input = [point(2024, 6, 15, 10)];

      const result = aggregate(input, 'weekly');

      expect(result.length).toBe(1);
      expect(result[0].date.toISOString()).toBe('2024-06-10T00:00:00.000Z');
      expect(result[0].value).toBe(10);
    });

    it('buckets single point to the first of its month', () => {
      const input = [point(2024, 6, 15, 10)];

      const result = aggregate(input, 'monthly');

      expect(result.length).toBe(1);
      expect(result[0].date.toISOString()).toBe('2024-06-01T00:00:00.000Z');
      expect(result[0].value).toBe(10);
    });

    it('passes daily points through sorted by date', () => {
      const input = [point(2024, 6, 15, 1), point(2024, 6, 10, 2), point(2024, 6, 12, 3)];

      const result = aggregate(input, 'daily');

      expect(result.map((p) => p.date.toISOString())).toEqual([
        '2024-06-10T00:00:00.000Z',
        '2024-06-12T00:00:00.000Z',
        '2024-06-15T00:00:00.000Z',
      ]);
      expect(result.map((p) => p.value)).toEqual([2, 3, 1]);
    });

    it('buckets weekly by ISO week-start (Monday) and averages values', () => {
      // 2024-04-29 is Monday; the week crosses into May.
      const input = [
        point(2024, 4, 29, 10),
        point(2024, 4, 30, 20),
        point(2024, 5, 1, 30),
      ];

      const result = aggregate(input, 'weekly');

      expect(result.length).toBe(1);
      expect(result[0].date.toISOString()).toBe('2024-04-29T00:00:00.000Z');
      expect(result[0].value).toBe(20);
    });

    it('groups weekly points into multiple ISO weeks', () => {
      const input = [
        point(2024, 4, 29, 10), // Monday week 1
        point(2024, 5, 5, 20), // Sunday week 1
        point(2024, 5, 6, 30), // Monday week 2
      ];

      const result = aggregate(input, 'weekly');

      expect(result.length).toBe(2);
      expect(result[0].date.toISOString()).toBe('2024-04-29T00:00:00.000Z');
      expect(result[0].value).toBe(15);
      expect(result[1].date.toISOString()).toBe('2024-05-06T00:00:00.000Z');
      expect(result[1].value).toBe(30);
    });

    it('buckets monthly by calendar month and averages values', () => {
      const input = [
        point(2024, 1, 15, 10),
        point(2024, 1, 20, 20),
        point(2024, 2, 5, 30),
      ];

      const result = aggregate(input, 'monthly');

      expect(result.length).toBe(2);
      expect(result[0].date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(result[0].value).toBe(15);
      expect(result[1].date.toISOString()).toBe('2024-02-01T00:00:00.000Z');
      expect(result[1].value).toBe(30);
    });

    it('sorts input ascending before bucketing', () => {
      const input = [
        point(2024, 2, 5, 30),
        point(2024, 1, 20, 20),
        point(2024, 1, 15, 10),
      ];

      const result = aggregate(input, 'monthly');

      expect(result.length).toBe(2);
      expect(result[0].date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(result[0].value).toBe(15);
      expect(result[1].date.toISOString()).toBe('2024-02-01T00:00:00.000Z');
      expect(result[1].value).toBe(30);
    });
  });

  describe('Aggregation type', () => {
    it('accepts allowed aggregation literals', () => {
      const aggregations: Aggregation[] = ['daily', 'weekly', 'monthly'];
      expect(aggregations.length).toBe(3);
    });
  });
});
