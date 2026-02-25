import { findPlantByName, type PlantCare } from '../data/plants'

export type IdentifyResult = {
  plant?: PlantCare
  /** 识别到的植物名称（优先中文，其次英文），不一定有养护卡 */
  recognizedName?: string
  errorMessage?: string
  raw?: unknown
}

const PROVIDER =
  (import.meta.env.VITE_PLANT_PROVIDER as 'plantid' | 'aliyun' | undefined) ??
  'plantid'

const PLANT_ID_API_KEY = import.meta.env.VITE_PLANT_ID_API_KEY
const ALIYUN_APPCODE = import.meta.env.VITE_ALIYUN_APPCODE

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('无法读取图片内容'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

async function identifyWithPlantId(file: File): Promise<IdentifyResult> {
  if (!PLANT_ID_API_KEY) {
    const fallback = await findPlantByName('龟背竹')
    return {
      plant: fallback,
      recognizedName: '龟背竹',
      errorMessage:
        '未配置 plant.id API Key，当前返回示例结果（龟背竹）。',
    }
  }

  const base64 = await fileToBase64(file)

  const body = {
    images: [base64],
    modifiers: ['crops_simple'],
    plant_language: 'zh-CN',
    plant_details: ['common_names'],
  }

  const response = await fetch('https://api.plant.id/v2/identify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': PLANT_ID_API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return { errorMessage: 'plant.id 识别请求失败，请稍后重试。' }
  }

  const data: unknown = await response.json()
  const anyData = data as {
    suggestions?: Array<{
      probability?: number
      plant_name?: string
      plant_details?: { common_names?: string[] }
    }>
  }

  const top = anyData.suggestions?.[0]
  if (!top) {
    return { errorMessage: '未从 plant.id 得到有效识别结果。', raw: data }
  }

  const enName = top.plant_name
  const cnName = top.plant_details?.common_names?.[0]
  const matchedPlant =
    (cnName && (await findPlantByName(cnName))) ||
    (enName && (await findPlantByName(enName))) ||
    undefined

  return {
    plant: matchedPlant,
    recognizedName: cnName || enName,
    raw: data,
    errorMessage: matchedPlant
      ? undefined
      : '识别成功，但暂时没有该植物的养护卡。',
  }
}

async function identifyWithAliyun(file: File): Promise<IdentifyResult> {
  if (!ALIYUN_APPCODE) {
    const fallback = await findPlantByName('龟背竹')
    return {
      plant: fallback,
      recognizedName: '龟背竹',
      errorMessage:
        '未配置阿里云 APPCODE，当前返回示例结果（龟背竹）。',
    }
  }

  const base64 = await fileToBase64(file)
  const pureBase64 = base64.split(',')[1] ?? base64

  const response = await fetch(
    'https://plant.market.alicloudapi.com/plant/recognize',
    {
      method: 'POST',
      headers: {
        Authorization: `APPCODE ${ALIYUN_APPCODE}`,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({ img_base64: pureBase64 }).toString(),
    },
  )

  if (!response.ok) {
    return { errorMessage: '阿里云植物识别请求失败，请稍后重试。' }
  }

  const data: unknown = await response.json()
  const anyData = data as {
    result?: Array<{
      Name?: string
      LatinName?: string
      AliasName?: string
      Score?: number
    }>
  }

  const top = anyData.result?.[0]
  if (!top) {
    return { errorMessage: '未从阿里云得到有效识别结果。', raw: data }
  }

  const nameCandidates = [
    top.Name,
    top.LatinName,
    ...(top.AliasName?.split(/[,，、]/).map((s) => s.trim()) ?? []),
  ].filter(Boolean) as string[]

  const matchedPlant =
    (
      await Promise.all(
        nameCandidates.map((n) => findPlantByName(n)),
      )
    ).find((p): p is PlantCare => Boolean(p)) ?? undefined

  const recognizedName = nameCandidates[0]

  return {
    plant: matchedPlant,
    recognizedName,
    raw: data,
    errorMessage: matchedPlant
      ? undefined
      : '识别成功，但暂时没有该植物的养护卡。',
  }
}

export async function identifyPlant(file: File): Promise<IdentifyResult> {
  if (PROVIDER === 'aliyun') {
    return identifyWithAliyun(file)
  }
  return identifyWithPlantId(file)
}

