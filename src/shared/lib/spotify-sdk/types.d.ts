// Минимальные типы Spotify Web Playback SDK (https://sdk.scdn.co/spotify-player.js)
declare global {
  namespace Spotify {
    interface Image { url: string }
    interface SdkTrack {
      id: string | null
      uri: string
      name: string
      duration_ms: number
      artists: { name: string, uri: string }[]
      album: { name: string, images: Image[] }
      /** Если Spotify подменил трек на версию для вашего региона */
      linked_from?: { id: string | null, uri: string | null }
    }
    interface PlaybackState {
      paused: boolean
      loading?: boolean
      position: number
      duration: number
      timestamp: number
      track_window: { current_track: SdkTrack | null, previous_tracks: SdkTrack[], next_tracks: SdkTrack[] }
    }
    interface Error { message: string }
    type ErrorEvent = 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error' | 'autoplay_failed'

    class Player {
      constructor(options: { name: string, getOAuthToken: (cb: (token: string) => void) => void, volume?: number })
      connect(): Promise<boolean>
      disconnect(): void
      addListener(event: 'ready' | 'not_ready', cb: (d: { device_id: string }) => void): boolean
      addListener(event: 'player_state_changed', cb: (s: PlaybackState | null) => void): boolean
      addListener(event: ErrorEvent, cb: (e: Error) => void): boolean
      getCurrentState(): Promise<PlaybackState | null>
      setVolume(v: number): Promise<void>
      pause(): Promise<void>
      resume(): Promise<void>
      togglePlay(): Promise<void>
      seek(ms: number): Promise<void>
      activateElement(): Promise<void>
    }
  }

  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void
    Spotify?: typeof Spotify
  }
}

export {}
