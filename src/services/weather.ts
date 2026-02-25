/**
 * 使用 Open-Meteo 免费 API，支持中英文城市名，返回当前天气与养护提醒
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export type WeatherTip = {
  text: string
  type: 'sun' | 'rain' | 'neutral'
}

export type CurrentWeather = {
  temp: number
  weatherDesc: string
  humidity?: number
}

export type WeatherForCity = {
  current: CurrentWeather
  tip: WeatherTip
}

/** 中英文城市名均可，Open-Meteo 按名称搜索支持多语言 */
async function geocodeCity(cityName: string): Promise<{ lat: number; lon: number } | null> {
  const trimmed = cityName.trim()
  if (!trimmed) return null

  const res = await fetch(
    `${GEOCODE_URL}?name=${encodeURIComponent(trimmed)}&count=1`,
  )
  if (!res.ok) return null
  const data = (await res.json()) as {
    results?: Array<{ latitude: number; longitude: number }>
  }
  const first = data.results?.[0]
  if (!first) return null
  return { lat: first.latitude, lon: first.longitude }
}

const WEATHER_CODE_MAP: Record<number, string> = {
  0: '晴',
  1: '少云',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾',
  51: '毛毛雨',
  53: '毛毛雨',
  55: '毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '阵雨',
  81: '阵雨',
  82: '强阵雨',
  85: '阵雪',
  86: '阵雪',
  95: '雷阵雨',
  96: '雷阵雨',
  99: '强雷阵雨',
}

function weatherCodeToDesc(code: number): string {
  if (WEATHER_CODE_MAP[code]) return WEATHER_CODE_MAP[code]
  if (code <= 3) return '晴'
  if (code >= 51 && code <= 67) return '雨'
  if (code >= 71 && code <= 77) return '雪'
  if (code >= 80 && code <= 82) return '阵雨'
  if (code >= 95 && code <= 99) return '雷阵雨'
  return '阴'
}

/**
 * 获取该城市当前天气 + 未来几日养护提醒（支持中文/英文城市名）
 */
export async function getWeatherForCity(cityName: string): Promise<WeatherForCity | null> {
  const coords = await geocodeCity(cityName)
  if (!coords) return null

  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: 'temperature_2m,weathercode,relative_humidity_2m',
    daily: 'weathercode,precipitation_sum',
    timezone: 'auto',
    forecast_days: '7',
  })

  const res = await fetch(`${FORECAST_URL}?${params}`)
  if (!res.ok) return null

  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number
      weathercode?: number
      relative_humidity_2m?: number
    }
    daily?: {
      time: string[]
      weathercode: number[]
      precipitation_sum: number[]
    }
  }

  const current = data.current
  const daily = data.daily
  if (!current || !daily?.time?.length) return null

  const temp = Math.round(current.temperature_2m ?? 0)
  const code = current.weathercode ?? 0
  const currentWeather: CurrentWeather = {
    temp,
    weatherDesc: weatherCodeToDesc(code),
    humidity: current.relative_humidity_2m,
  }

  const codes = daily.weathercode ?? []
  const precip = daily.precipitation_sum ?? []
  const tomorrowCode = codes[1] ?? 0
  const hasRainSoon = precip.some((p, i) => i >= 1 && i <= 3 && p > 0)
  const sunnyDays = codes.filter((c) => c <= 3).length
  const rainyDays = codes.filter((c) => c >= 61 && c <= 82).length

  let tip: WeatherTip
  if (hasRainSoon && rainyDays >= 1) {
    tip = {
      type: 'rain',
      text: '未来几天可能有雨，可以把花盆搬出去淋雨，省一次浇水。',
    }
  } else if (sunnyDays >= 3 && tomorrowCode <= 3) {
    tip = {
      type: 'sun',
      text: '未来几天以晴天为主，可以给植物多晒晒太阳。',
    }
  } else {
    tip = {
      type: 'neutral',
      text: '暂无特别提醒，按养护卡照常养护即可。',
    }
  }

  return { current: currentWeather, tip }
}
