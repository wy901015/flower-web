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
    const en = plant.enName?.toLowerCase()
    const idName = plant.id.replace(/_/g, ' ').toLowerCase()
    const aliasesLower = plant.aliases?.map((a) => a.toLowerCase()) ?? []

    // 精确匹配中文名
    if (plant.cnName === name) return true

    // 精确匹配英文名
    if (en && en === normalized) return true

    // 精确匹配别名
    if (aliasesLower.includes(normalized)) return true

    // 匹配学名或带种加词，如 "narcissus tazetta"
    if (normalized === idName) return true

    // 支持像 "narcissus tazetta" 命中 "narcissus"
    if (en && normalized.includes(en) && en.length >= 4) return true

    // 支持学名包含在别名或反向包含
    if (
      aliasesLower.some(
        (alias) =>
          normalized.includes(alias) ||
          (alias.length >= 4 && alias.includes(normalized)),
      )
    ) {
      return true
    }

    return false
  })
}
