import { CURATED_TOP_30 } from './currency';

describe('CURATED_TOP_30', () => {
  it('should contain 30 currencies', () => {
    expect(CURATED_TOP_30.length).toBe(30);
  });

  it('should contain unique currency codes', () => {
    const codes = CURATED_TOP_30.map((currency) => currency.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
