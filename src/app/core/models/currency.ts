export interface Currency {
  code: string;
  name: string;
  flag: string;
}

export const CURATED_TOP_30: Currency[] = [
  { code: 'USD', name: 'United States Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'AED', name: 'United Arab Emirates Dirham', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'ILS', name: 'Israeli New Shekel', flag: '🇮🇱' },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
];
