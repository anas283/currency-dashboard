import { Pipe, PipeTransform } from '@angular/core';
import { Currency } from '../../core/models/currency';

@Pipe({
  name: 'currencyFilter',
  standalone: true,
})
export class CurrencyFilterPipe implements PipeTransform {
  transform(value: Currency[] | null | undefined, search: string, selectedCodes?: string[]): Currency[] {
    const currencies = value ?? [];
    const query = search.trim().toLowerCase();
    const codeSet = selectedCodes ? new Set(selectedCodes.map((code) => code.toUpperCase())) : null;

    return currencies.filter((currency) => {
      if (codeSet && !codeSet.has(currency.code.toUpperCase())) {
        return false;
      }

      if (!query) {
        return true;
      }

      return currency.code.toLowerCase().includes(query) || currency.name.toLowerCase().includes(query);
    });
  }
}
