import React, { useState } from 'react'
import './App.css'
import type { PlantCare } from './data/plants'
import { identifyPlant } from './services/identify'
import { downloadWateringCalendar } from './utils/calendar'
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
} from './components/Icons'

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plant, setPlant] = useState<PlantCare | null>(null)
  const [recognizedName, setRecognizedName] = useState<string | null>(null)
  const [wateringInterval, setWateringInterval] = useState(7)

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

    try {
      setLoading(true)
      const result = await identifyPlant(file)
      setPlant(result.plant ?? null)
      setRecognizedName(result.recognizedName ?? null)

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
      </main>
    </div>
  )
}

export default App
