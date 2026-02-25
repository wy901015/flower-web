import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import type { PlantCare } from './data/plants'
import { identifyPlant } from './services/identify'
import {
  downloadWateringCalendar,
  downloadPotWateringCalendar,
  downloadGroupWateringCalendar,
  type PotCalendarItem,
} from './utils/calendar'
import {
  loadPotsFromStorage,
  savePotsToStorage,
  createPot,
  MAX_POTS,
  type Pot,
} from './types/pot'
import { getWeatherForCity, type WeatherForCity } from './services/weather'
import {
  IconLeaf,
  IconCamera,
  IconCheck,
  IconCard,
  IconCalendar,
  IconSun,
  IconDroplet,
  IconThermometer,
  IconSparkles,
  IconAddToCalendar,
  IconLocation,
  IconTrash,
  IconCloudRain,
  IconCloudSun,
} from './components/Icons'

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plant, setPlant] = useState<PlantCare | null>(null)
  const [recognizedName, setRecognizedName] = useState<string | null>(null)
  const [wateringInterval, setWateringInterval] = useState(7)

  const [pots, setPots] = useState<Pot[]>(() => loadPotsFromStorage())
  const [showAddPot, setShowAddPot] = useState(false)
  const [newPotName, setNewPotName] = useState('')
  const [weatherInfo, setWeatherInfo] = useState<Record<string, WeatherForCity | null>>({})
  const [weatherLoading, setWeatherLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    savePotsToStorage(pots)
  }, [pots])

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setError(null)
    setPlant(null)
    setRecognizedName(null)
    setShowAddPot(false)
    setNewPotName('')

    try {
      setLoading(true)
      const result = await identifyPlant(file)
      setPlant(result.plant ?? null)
      setRecognizedName(result.recognizedName ?? null)
      if (result.plant || result.recognizedName) {
        setShowAddPot(true)
      }
      if (!result.plant && !result.errorMessage) {
        setError('识别成功，但暂时没有该植物的养护卡')
      } else if (result.errorMessage) {
        setError(result.errorMessage)
      }
    } catch {
      setError('识别失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAddPot = useCallback(() => {
    const name = newPotName.trim() || `花盆 ${pots.length + 1}`
    if (pots.length >= MAX_POTS) return
    const newPot = createPot(name, plant, recognizedName ?? '', wateringInterval)
    setPots((prev) => [...prev, newPot])
    setShowAddPot(false)
    setNewPotName('')
  }, [newPotName, plant, recognizedName, wateringInterval, pots.length])

  const handleSkipAddPot = useCallback(() => {
    setShowAddPot(false)
    setNewPotName('')
  }, [])

  const updatePot = useCallback((id: string, updates: Partial<Pick<Pot, 'name' | 'city' | 'wateringInterval'>>) => {
    setPots((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    )
    if (updates.city !== undefined) {
      setWeatherInfo((t) => ({ ...t, [id]: null }))
    }
  }, [])

  const removePot = useCallback((id: string) => {
    setPots((prev) => prev.filter((p) => p.id !== id))
    setWeatherInfo((t) => {
      const next = { ...t }
      delete next[id]
      return next
    })
  }, [])

  const fetchWeatherForPot = useCallback(async (potId: string, city: string) => {
    if (!city.trim()) return
    setWeatherLoading((l) => ({ ...l, [potId]: true }))
    try {
      const info = await getWeatherForCity(city)
      setWeatherInfo((t) => ({ ...t, [potId]: info ?? null }))
    } finally {
      setWeatherLoading((l) => ({ ...l, [potId]: false }))
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title-row">
          <IconLeaf className="app-title-icon" />
          <h1 className="app-title">养花小助手</h1>
        </div>
        <p className="app-subtitle">拍一拍，看看你种的是谁</p>
      </header>

      <main className="app-main">
        <section className="upload-section">
          <label className="upload-card">
            <div className="upload-inner">
              <span className="upload-icon-wrap">
                <IconCamera className="upload-icon" />
              </span>
              <span className="upload-title">拍照 / 上传识花</span>
              <span className="upload-desc">
                支持相机和相册，清晰正面叶片或花朵更容易识别
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>

          {imageUrl && (
            <div className="preview-card">
              <img src={imageUrl} alt="待识别植物" className="preview-image" />
            </div>
          )}
          {loading && <p className="status-text">正在识别图片…</p>}
          {recognizedName && !loading && !error && (
            <p className="identified-text">
              <IconCheck className="identified-icon" />
              识别结果：<span className="identified-name">{recognizedName}</span>
            </p>
          )}
          {error && !loading && <p className="status-text error">{error}</p>}
        </section>

        {/* 新建花盆：识别成功后询问 */}
        {showAddPot && (plant || recognizedName) && (
          <section className="add-pot-card">
            <p className="add-pot-title">新建花盆</p>
            <p className="add-pot-desc">为这株植物建一个花盆，方便以后按城市看天气和单独加浇水提醒</p>
            <div className="add-pot-form">
              <label className="add-pot-field">
                <span className="add-pot-label">花盆名称</span>
                <input
                  type="text"
                  className="add-pot-input"
                  placeholder="例如：阳台绿萝"
                  value={newPotName}
                  onChange={(e) => setNewPotName(e.target.value)}
                />
              </label>
              <div className="add-pot-actions">
                <button type="button" className="add-pot-btn add-pot-btn-skip" onClick={handleSkipAddPot}>
                  跳过
                </button>
                <button
                  type="button"
                  className="add-pot-btn add-pot-btn-confirm"
                  onClick={handleConfirmAddPot}
                  disabled={pots.length >= MAX_POTS}
                >
                  确定
                </button>
              </div>
            </div>
            {pots.length >= MAX_POTS && (
              <p className="add-pot-hint">已达 {MAX_POTS} 个花盆上限，可删除不需要的再添加</p>
            )}
          </section>
        )}

        <section className="care-card">
          {plant ? (
            <>
              <h2 className="care-title">
                <IconCard className="care-title-icon" />
                养护卡 · {plant.cnName}
              </h2>
              <div className="care-tags">
                {plant.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <dl className="care-list">
                <div className="care-item">
                  <dt><IconSun className="care-item-icon" /> 光照</dt>
                  <dd>{plant.care.light}</dd>
                </div>
                <div className="care-item">
                  <dt><IconDroplet className="care-item-icon" /> 浇水</dt>
                  <dd>{plant.care.water}</dd>
                </div>
                <div className="care-item">
                  <dt><IconThermometer className="care-item-icon" /> 温度</dt>
                  <dd>{plant.care.temperature}</dd>
                </div>
                <div className="care-item">
                  <dt><IconSparkles className="care-item-icon" /> 小提示</dt>
                  <dd>{plant.care.tips}</dd>
                </div>
              </dl>
              <div className="watering-calendar">
                <p className="watering-calendar-title">
                  <IconCalendar className="watering-calendar-icon" />
                  浇水日历
                </p>
                <p className="watering-calendar-desc">按周期生成提醒，导入手机日历后到点会提醒你浇水</p>
                <div className="watering-calendar-options">
                  <label className="watering-option">
                    <span className="watering-option-label">提醒周期</span>
                    <select
                      className="watering-select"
                      value={wateringInterval}
                      onChange={(e) => setWateringInterval(Number(e.target.value))}
                    >
                      <option value={3}>每 3 天</option>
                      <option value={5}>每 5 天</option>
                      <option value={7}>每 7 天</option>
                      <option value={10}>每 10 天</option>
                      <option value={14}>每 2 周</option>
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="watering-add-btn"
                  onClick={() => downloadWateringCalendar(plant.cnName, wateringInterval)}
                >
                  <IconAddToCalendar className="watering-add-btn-icon" />
                  添加到手机日历
                </button>
              </div>
            </>
          ) : recognizedName ? (
            <>
              <h2 className="care-title">
                <IconCard className="care-title-icon" />
                养护卡
              </h2>
              <p className="status-text">
                已识别为「{recognizedName}」，暂时没有对应的养护卡。
              </p>
            </>
          ) : (
            <>
              <h2 className="care-title">
                <IconCard className="care-title-icon" />
                示例养护卡 · 龟背竹
              </h2>
              <div className="care-tags">
                <span className="tag">观叶植物</span>
                <span className="tag">室内</span>
              </div>
              <dl className="care-list">
                <div className="care-item">
                  <dt><IconSun className="care-item-icon" /> 光照</dt>
                  <dd>明亮散射光，避免长时间直射强光。</dd>
                </div>
                <div className="care-item">
                  <dt><IconDroplet className="care-item-icon" /> 浇水</dt>
                  <dd>见干见湿，土表 2–3cm 干再浇透，避免积水。</dd>
                </div>
                <div className="care-item">
                  <dt><IconThermometer className="care-item-icon" /> 温度</dt>
                  <dd>18–30℃，冬季不低于 10℃。</dd>
                </div>
                <div className="care-item">
                  <dt><IconSparkles className="care-item-icon" /> 小提示</dt>
                  <dd>喜欢较高空气湿度，可适当喷雾或放在加湿器附近。</dd>
                </div>
              </dl>
            </>
          )}
        </section>

        {/* 我的花盆 */}
        {pots.length > 0 && (
          <section className="pots-section">
            <h2 className="pots-section-title">我的花盆</h2>
            {pots.length >= 2 && (
              <button
                type="button"
                className="pots-group-calendar-btn"
                onClick={() => {
                  const items: PotCalendarItem[] = pots.map((p) => ({
                    potName: p.name,
                    plantName: p.plant?.cnName ?? p.recognizedName,
                    wateringInterval: p.wateringInterval,
                  }))
                  downloadGroupWateringCalendar(items)
                }}
              >
                <IconAddToCalendar className="pots-group-calendar-btn-icon" />
                相同养护的花盆一起加入日历
              </button>
            )}
            <ul className="pots-list">
              {pots.map((pot) => (
                <li key={pot.id} className="pot-card">
                  <div className="pot-card-header">
                    <span className="pot-card-name">{pot.name}</span>
                    <span className="pot-card-plant">
                      {pot.plant?.cnName ?? pot.recognizedName}
                    </span>
                    <button
                      type="button"
                      className="pot-card-delete"
                      onClick={() => removePot(pot.id)}
                      aria-label="删除"
                    >
                      <IconTrash className="pot-card-delete-icon" />
                    </button>
                  </div>
                  <div className="pot-card-city">
                    <IconLocation className="pot-card-city-icon" />
                    <input
                      type="text"
                      className="pot-card-city-input"
                      placeholder="输入城市（中文或英文）"
                      value={pot.city}
                      onChange={(e) => updatePot(pot.id, { city: e.target.value })}
                      onBlur={() => {
                        if (pot.city.trim()) fetchWeatherForPot(pot.id, pot.city)
                      }}
                    />
                    {pot.city.trim() && (
                      <button
                        type="button"
                        className="pot-card-weather-btn"
                        onClick={() => fetchWeatherForPot(pot.id, pot.city)}
                        disabled={weatherLoading[pot.id]}
                      >
                        {weatherLoading[pot.id] ? '获取中…' : '刷新天气'}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const info = weatherInfo[pot.id]
                    if (!info) return null
                    return (
                      <>
                        <div className="pot-current-weather">
                          <span className="pot-current-weather-label">{pot.city}</span>
                          <span className="pot-current-weather-now">
                            当前 {info.current.temp}°C {info.current.weatherDesc}
                            {info.current.humidity != null && (
                              <span className="pot-current-weather-humidity"> · 湿度 {info.current.humidity}%</span>
                            )}
                          </span>
                        </div>
                        <div className={`pot-weather-tip pot-weather-tip-${info.tip.type}`}>
                          {info.tip.type === 'rain' && (
                            <IconCloudRain className="pot-weather-tip-icon" />
                          )}
                          {info.tip.type === 'sun' && (
                            <IconCloudSun className="pot-weather-tip-icon" />
                          )}
                          <span>{info.tip.text}</span>
                        </div>
                      </>
                    )
                  })()}
                  <div className="pot-card-interval">
                    <span className="pot-card-interval-label">浇水周期</span>
                    <select
                      className="watering-select pot-card-interval-select"
                      value={pot.wateringInterval}
                      onChange={(e) =>
                        updatePot(pot.id, { wateringInterval: Number(e.target.value) })
                      }
                    >
                      <option value={3}>每 3 天</option>
                      <option value={5}>每 5 天</option>
                      <option value={7}>每 7 天</option>
                      <option value={10}>每 10 天</option>
                      <option value={14}>每 2 周</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="pot-card-calendar-btn"
                    onClick={() =>
                      downloadPotWateringCalendar(
                        pot.name,
                        pot.plant?.cnName ?? pot.recognizedName,
                        pot.wateringInterval,
                      )
                    }
                  >
                    <IconAddToCalendar className="watering-add-btn-icon" />
                    加入手机日历
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
