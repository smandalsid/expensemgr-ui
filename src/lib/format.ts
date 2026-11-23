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

// Backend timestamps like "2026-08-08T06:48:56.700917" are in UTC but omit the
// "Z" suffix, so the JS Date parser would otherwise interpret them as local time.
export function parseBackendDate(dttm: string | null | undefined): Date | null {
  if (!dttm) return null
  const utcDttm = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dttm) ? dttm : `${dttm}Z`
  const date = new Date(utcDttm)
  return isNaN(date.getTime()) ? null : date
}

export function formatDateTime(dttm: string | null | undefined) {
  const date = parseBackendDate(dttm)
  if (!date) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// "YYYY-MM-DD" calendar dates have no timezone; building them from local parts
// avoids new Date("YYYY-MM-DD") (UTC) showing the previous day west of UTC.
export function parseDateOnly(date: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

export function formatDate(date: string | null | undefined) {
  const d = parseDateOnly(date)
  if (!d) return '—'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Local-time "YYYY-MM-DD", the value format of <input type="date">.
export function toDateInputValue(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

// Clamps to the target month's last day (31 Mar - 1 month = 28/29 Feb, not 3 Mar).
export function addMonths(date: Date, months: number) {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(date.getDate(), lastDay))
  return result
}
