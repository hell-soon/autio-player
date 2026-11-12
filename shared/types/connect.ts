/** «Подключение устройств»: состояние плеера на устройстве и команды между устройствами. */

export type DeviceKind = 'computer' | 'phone' | 'tablet' | 'speaker' | 'tv'

export interface DeviceState {
  track: Track | null
  isPlaying: boolean
  positionMs: number
  durationMs: number
  /** Время снимка по часам сервера (ставит сервер) — для досчёта позиции */
  at: number
  volume: number
}

export interface DeviceInfo {
  /** Устройства Spotify Connect — с префиксом "sp:" */
  id: string
  name: string
  kind: DeviceKind
  lastSeen: number
  state: DeviceState | null
  /** Устройство Spotify Connect (колонка, приложение Spotify) — играет только треки Spotify */
  spotify?: boolean
}

export type DeviceRadio =
  | { station: 'wave' }
  | { station: 'id', id: string, name?: string }
  | { station: 'artist', name: string }

export type DeviceCommand =
  /** Начать играть очередь (перенос воспроизведения сюда или запуск с пульта) */
  | { type: 'play-queue', queue: Track[], index: number, positionMs: number, play: boolean, radio?: DeviceRadio | null }
  /** Передать своё воспроизведение устройству `to` и остановиться */
  | { type: 'handoff', to: string }
  | { type: 'enqueue', tracks: Track[], next: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'seek', ms: number }
  | { type: 'volume', value: number }

export interface DeviceSyncResponse {
  devices: DeviceInfo[]
  commands: DeviceCommand[]
  serverTime: number
}
