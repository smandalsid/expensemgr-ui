const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$',
}

export function currencySymbol(code: string) {
  return CURRENCY_SYMBOLS[code] ?? code
}

export function formatAmount(amount: number, currency: string) {
  const sym = currencySymbol(currency)
  return `${sym}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export const AVATAR_PALETTE = [
  { bg: 'rgba(201,169,110,0.18)', color: '#c9a96e' },
  { bg: 'rgba(96,165,250,0.18)', color: '#60a5fa' },
  { bg: 'rgba(74,222,128,0.18)', color: '#4ade80' },
  { bg: 'rgba(167,139,250,0.18)', color: '#a78bfa' },
  { bg: 'rgba(251,146,60,0.18)', color: '#fb923c' },
]

export function avatarStyle(key: number) {
  return AVATAR_PALETTE[key % AVATAR_PALETTE.length]
}
