/**
 * 生成浇水提醒的 .ics 日历文件内容，可导入手机日历
 */
function formatICSDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}${m}${day}T${h}${min}${s}`
}

/**
 * @param plantName 植物中文名
 * @param intervalDays 每隔几天提醒一次（如 3 = 每 3 天）
 * @param startDate 首次提醒日期，默认从明天开始
 * @param durationMinutes 事件时长（分钟），默认 15
 */
export function buildWateringICS(
  plantName: string,
  intervalDays: number,
  startDate: Date = new Date(Date.now() + 24 * 60 * 60 * 1000),
  durationMinutes: number = 15,
): string {
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
  const summary = `给${plantName}浇水`
  const description = `养花小助手 · ${plantName} 浇水提醒，建议每 ${intervalDays} 天一次，具体请参考养护卡。`
  const escapeICS = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flower Care//Watering Reminder//ZH',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:watering-${plantName}-${Date.now()}@flower-care`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `RRULE:FREQ=DAILY;INTERVAL=${intervalDays}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${escapeICS(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return icsLines.join('\r\n')
}

/**
 * 触发下载 .ics 文件，手机打开后通常可「添加到日历」
 */
export function downloadWateringCalendar(
  plantName: string,
  intervalDays: number,
  startDate?: Date,
): void {
  const ics = buildWateringICS(plantName, intervalDays, startDate)
  const blob = new Blob(['\ufeff' + ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `浇水提醒-${plantName}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
