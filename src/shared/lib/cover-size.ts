/**
 * Обложка нужного размера. У Яндекса размер — в конце адреса (…/600x600), и CDN отдаёт
 * любой из стандартных: в строке списка не нужно грузить 600×600 (≈60 КБ) ради 48 px.
 * Для других источников (Spotify — размер зашит в id картинки) адрес не меняется.
 */
const YANDEX_SIZES = [50, 100, 200, 300, 400, 600, 1000]

export function coverOfSize(url: string | undefined, cssPx: number): string | undefined {
  if (!url || !url.includes('avatars.yandex.net')) return url
  // Плотные экраны — вдвое больше пикселей (больше двух не нужно: разница не видна)
  const want = cssPx * 2
  const size = YANDEX_SIZES.find(s => s >= want) ?? 1000
  return url.replace(/\/\d+x\d+(?=$|[?#])/, `/${size}x${size}`)
}
