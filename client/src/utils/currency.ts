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

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertUnderThousand(n: number): string {
  let s = '';
  if (n >= 100) {
    s += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    s += TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') + ' ';
  } else if (n > 0) {
    s += ONES[n] + ' ';
  }
  return s.trim();
}

export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'INR Zero Only';
  const whole = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - whole) * 100);

  let words = '';
  const crore = Math.floor(whole / 10000000);
  let rem = whole % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  const hundreds = rem % 1000;

  if (crore > 0) words += convertUnderThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertUnderThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertUnderThousand(thousand) + ' Thousand ';
  if (hundreds > 0) words += convertUnderThousand(hundreds) + ' ';

  words = words.trim();
  let result = 'INR ' + (words || 'Zero');
  if (paise > 0) {
    result += ' and ' + convertUnderThousand(paise) + ' Paise';
  }
  return result + ' Only';
}

export function numberToWords(amount: number, currency = 'INR'): string {
  if (currency === 'USD') {
    const whole = Math.floor(Math.abs(amount));
    const cents = Math.round((Math.abs(amount) - whole) * 100);
    let words = convertUnderThousand(whole);
    let res = 'US Dollars ' + (words || 'Zero');
    if (cents > 0) {
      res += ' and ' + cents + '/100';
    }
    return res + ' Only';
  }
  return numberToIndianWords(amount);
}

