export type Currency = 'INR' | 'USD';

export const CURRENCIES: { code: Currency; symbol: string; label: string; name: string }[] = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'USD ($)', name: 'US Dollar' },
];

export function getCurrencySymbol(currency?: string | null): string {
  if (currency === 'USD') return '$';
  return '₹';
}

export function formatCurrency(
  amount: number | null | undefined,
  currency?: string | null
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
  const isUSD = currency === 'USD';
  const locale = isUSD ? 'en-US' : 'en-IN';
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyWithSymbol(
  amount: number | null | undefined,
  currency?: string | null
): string {
  const sym = getCurrencySymbol(currency);
  const formatted = formatCurrency(amount, currency);
  return `${sym} ${formatted}`;
}
