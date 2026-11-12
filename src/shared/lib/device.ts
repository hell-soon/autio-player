/**
 * Мобильный браузер? Нужен, чтобы не грузить Spotify Web Playback SDK там,
 * где он официально не поддерживается (iOS/Android), и сразу играть через Яндекс.
 */
export function isMobileBrowser() {
  if (import.meta.server) return false
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  if (uaData?.mobile !== undefined) return uaData.mobile
  // iPadOS притворяется Mac'ом, но у него есть тач.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iPadOS || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}
