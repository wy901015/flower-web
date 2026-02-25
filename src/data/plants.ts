export type PlantCare = {
  id: string
  cnName: string
  enName?: string
  aliases?: string[]
  tags: string[]
  care: {
    light: string
    water: string
    temperature: string
    tips: string
  }
}

let plantsCache: PlantCare[] | null = null

export async function loadPlants(): Promise<PlantCare[]> {
  if (plantsCache) return plantsCache

  const response = await fetch('/plants.json')
  if (!response.ok) {
    throw new Error('无法加载植物数据')
  }
  const data = (await response.json()) as PlantCare[]
  plantsCache = data
  return plantsCache
}

export async function findPlantByName(
  name: string,
): Promise<PlantCare | undefined> {
  const normalized = name.trim().toLowerCase()
  const plants = await loadPlants()

  return plants.find((plant) => {
    if (plant.cnName === name) return true
    if (plant.enName && plant.enName.toLowerCase() === normalized) return true
    if (plant.aliases?.some((alias) => alias.toLowerCase() === normalized))
      return true
    return false
  })
}
