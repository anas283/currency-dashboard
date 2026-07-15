export type Aggregation = 'daily' | 'weekly' | 'monthly';

export interface DataPoint {
  date: Date;
  value: number;
}

interface Bucket {
  sum: number;
  count: number;
  date: Date;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfIsoWeek(date: Date): Date {
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday;
}

function bucketKey(date: Date, aggregation: Aggregation): number {
  switch (aggregation) {
    case 'weekly':
      return startOfIsoWeek(date).getTime();
    case 'monthly':
      return startOfMonth(date).getTime();
    default:
      return date.getTime();
  }
}

function bucketDate(date: Date, aggregation: Aggregation): Date {
  switch (aggregation) {
    case 'weekly':
      return startOfIsoWeek(date);
    case 'monthly':
      return startOfMonth(date);
    default:
      return new Date(date.getTime());
  }
}

export function aggregate(points: DataPoint[], aggregation: Aggregation): DataPoint[] {
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (aggregation === 'daily') {
    return sorted;
  }

  const buckets = new Map<number, Bucket>();

  for (const point of sorted) {
    const key = bucketKey(point.date, aggregation);
    const existing = buckets.get(key);

    if (existing) {
      existing.sum += point.value;
      existing.count += 1;
    } else {
      buckets.set(key, {
        date: bucketDate(point.date, aggregation),
        sum: point.value,
        count: 1,
      });
    }
  }

  return Array.from(buckets.values()).map((bucket) => ({
    date: bucket.date,
    value: bucket.sum / bucket.count,
  }));
}
