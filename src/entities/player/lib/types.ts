export type EngineKind = 'spotify' | 'yandex'

/** Движок сообщает плееру о своём состоянии через эти колбэки. */
export interface EngineCallbacks {
  onPlaying: (playing: boolean) => void
  onTime: (positionMs: number, durationMs: number) => void
  onBuffering: (buffering: boolean) => void
  onEnded: () => void
  /** skippable — трек не загрузился (нет в сервисе, нет доступа): можно перейти к следующему */
  onError: (message: string, skippable?: boolean) => void
  /** Состояние анализатора для визуализатора (только движок Яндекса) */
  onAnalyser?: (status: import('./analyser').AnalyserStatus) => void
}
