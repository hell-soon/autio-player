/**
 * Диагностика: работает ли Яндекс Музыка с текущего сервера (локально / Vercel).
 * Проверяет аккаунт, поиск и получение ссылки на поток, включая доступность самой ссылки.
 */
export default defineEventHandler(async (event) => {
  const report: Record<string, unknown> = {
    serverRegion: process.env.VERCEL_REGION ?? 'local',
  }

  const step = async (name: string, fn: () => Promise<unknown>) => {
    const started = Date.now()
    try {
      report[name] = { ok: true, ms: Date.now() - started, data: await fn() }
    }
    catch (err: any) {
      report[name] = { ok: false, ms: Date.now() - started, error: err?.statusMessage || err?.message, status: err?.statusCode ?? err?.response?.status, body: err?.data }
    }
  }

  await step('account', () => yandexAccountStatus(event))

  let trackId: string | undefined
  await step('search', async () => {
    const res = await yandexSearch(event, 'Кино Группа крови')
    trackId = res.tracks[0]?.sourceId
    return { total: res.total, first: res.tracks[0] }
  })

  if (trackId) {
    await step('stream', async () => {
      const s = await yandexStreamUrl(event, trackId!)
      // Проверяем, что CDN действительно отдаёт аудио (первые байты).
      const head = await fetch(s.url, { headers: { Range: 'bytes=0-1023' } })
      return { method: s.method, codec: s.codec, bitrate: s.bitrate, cdnStatus: head.status, contentType: head.headers.get('content-type') }
    })
  }

  return report
})
