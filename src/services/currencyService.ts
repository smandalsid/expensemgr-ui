import { apiClient } from '../lib/apiClient'
import type { Currency } from '../types/currency'

export function getCurrencies(): Promise<Currency[]> {
  return apiClient.get<Currency[]>('/currency/get_all')
}
