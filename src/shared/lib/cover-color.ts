/**
 * Акцентный цвет из обложки: самый «заметный» оттенок (насыщенный и часто встречающийся),
 * а не средний цвет — средний почти всегда выходит грязно-серым.
 * Возвращает пару цветов: для тёмной темы (светлый пастельный) и для светлой (глубокий).
 * null — обложка почти без цвета (ч/б): тогда остаётся акцент по умолчанию.
 */

export interface CoverAccent { dark: string, light: string }

const cache = new Map<string, Promise<CoverAccent | null>>()
const SIZE = 32
const BUCKETS = 18

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function analyse(img: HTMLImageElement): CoverAccent | null {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const g = canvas.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  g.drawImage(img, 0, 0, SIZE, SIZE)
  const data = g.getImageData(0, 0, SIZE, SIZE).data

  // Гистограмма по оттенку: вес = насыщенность (серые пиксели почти не голосуют)
  const weight = Array.from({ length: BUCKETS }, () => 0)
  const sumX = Array.from({ length: BUCKETS }, () => 0)
  const sumY = Array.from({ length: BUCKETS }, () => 0)
  const sumS = Array.from({ length: BUCKETS }, () => 0)
  let colorful = 0
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i]!, data[i + 1]!, data[i + 2]!)
    if (s < 0.18 || l < 0.08 || l > 0.94) continue
    colorful++
    const w = s * (1 - Math.abs(l - 0.5))
    const b = Math.floor(h / (360 / BUCKETS)) % BUCKETS
    weight[b]! += w
    // Оттенок усредняем как угол (иначе красный 350° и 10° дадут бирюзовый)
    sumX[b]! += Math.cos((h * Math.PI) / 180) * w
    sumY[b]! += Math.sin((h * Math.PI) / 180) * w
    sumS[b]! += s * w
  }
  if (colorful < SIZE * SIZE * 0.04) return null

  // Соседние корзины голосуют вместе — оттенок на границе не дробится
  let best = 0
  let bestScore = -1
  for (let b = 0; b < BUCKETS; b++) {
    const score = weight[b]! + 0.5 * (weight[(b + 1) % BUCKETS]! + weight[(b + BUCKETS - 1) % BUCKETS]!)
    if (score > bestScore) {
      bestScore = score
      best = b
    }
  }
  const hue = ((Math.atan2(sumY[best]!, sumX[best]!) * 180) / Math.PI + 360) % 360
  const sat = sumS[best]! / weight[best]!
  const h = Math.round(hue)
  // Пастель для тёмной темы и глубокий тон для светлой — как у готовых акцентов
  return {
    dark: `hsl(${h} ${Math.round(clamp(sat, 0.45, 0.85) * 100)}% 76%)`,
    light: `hsl(${h} ${Math.round(clamp(sat, 0.4, 0.7) * 100)}% 40%)`,
  }
}

export function coverAccent(coverUrl: string): Promise<CoverAccent | null> {
  const hit = cache.get(coverUrl)
  if (hit) return hit
  const p = new Promise<CoverAccent | null>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      try {
        resolve(analyse(img))
      }
      catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = `/api/cover?url=${encodeURIComponent(coverUrl)}`
  })
  cache.set(coverUrl, p)
  if (cache.size > 300) cache.delete(cache.keys().next().value!)
  return p
}
