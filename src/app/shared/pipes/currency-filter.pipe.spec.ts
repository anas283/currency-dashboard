import { CurrencyFilterPipe } from './currency-filter.pipe';
import { Currency } from '../../core/models/currency';

describe('CurrencyFilterPipe', () => {
  const pipe = new CurrencyFilterPipe();
  const currencies: Currency[] = [
    { code: 'USD', name: 'United States Dollar', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  ];

  it('returns empty array for null or undefined input', () => {
    expect(pipe.transform(null, '')).toEqual([]);
    expect(pipe.transform(undefined, '')).toEqual([]);
  });

  it('returns all currencies when search is empty and no selectedCodes', () => {
    const result = pipe.transform(currencies, '');

    expect(result).toEqual(currencies);
  });

  it('filters by code substring case-insensitively', () => {
    const result = pipe.transform(currencies, 'us');

    expect(result).toEqual([currencies[0]]);
  });

  it('filters by name substring case-insensitively', () => {
    const result = pipe.transform(currencies, 'pound');

    expect(result).toEqual([currencies[2]]);
  });

  it('returns empty array when no currencies match', () => {
    const result = pipe.transform(currencies, 'xyz');

    expect(result).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const original = [...currencies];

    pipe.transform(currencies, 'euro');

    expect(currencies).toEqual(original);
  });

  it('filters by selectedCodes', () => {
    const result = pipe.transform(currencies, '', ['EUR', 'GBP']);

    expect(result).toEqual([currencies[1], currencies[2]]);
  });

  it('selectedCodes matching is case-insensitive', () => {
    const result = pipe.transform(currencies, '', ['eur', 'gbp']);

    expect(result).toEqual([currencies[1], currencies[2]]);
  });

  it('returns empty array when selectedCodes is empty', () => {
    const result = pipe.transform(currencies, '', []);

    expect(result).toEqual([]);
  });

  it('combines search and selectedCodes filters', () => {
    const result = pipe.transform(currencies, 'dollar', ['USD', 'GBP']);

    expect(result).toEqual([currencies[0]]);
  });
});
