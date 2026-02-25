import type { PlantCare } from '../data/plants'

export type Pot = {
  id: string
  name: string
  /** 有养护卡时存完整 plant，否则只存识别到的名字 */
  plant: PlantCare | null
  recognizedName: string
  city: string
  wateringInterval: number
  createdAt: number
}

export const POTS_STORAGE_KEY = 'flower-care-pots'
export const MAX_POTS = 10

export function loadPotsFromStorage(): Pot[] {
  try {
    const raw = localStorage.getItem(POTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Pot[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_POTS) : []
  } catch {
    return []
  }
}

export function savePotsToStorage(pots: Pot[]): void {
  localStorage.setItem(POTS_STORAGE_KEY, JSON.stringify(pots.slice(0, MAX_POTS)))
}

export function createPot(
  name: string,
  plant: PlantCare | null,
  recognizedName: string,
  wateringInterval: number = 7,
  city: string = '',
): Pot {
  return {
    id: `pot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: name.trim() || `花盆 ${Date.now().toString().slice(-6)}`,
    plant,
    recognizedName,
    city: city.trim(),
    wateringInterval,
    createdAt: Date.now(),
  }
}
