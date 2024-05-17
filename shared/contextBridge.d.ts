import { type PlayerEvents } from '../electron/events/player'

declare global {
  interface IpcRendererCallback<T> {
    (payload: T): void
  }

  interface IpcRendererCallbackUnsubscriber {
    (): void
  }

  /**
   * Event listeners must follow the pattern `on{Capitalize(EventName)}`
   */
  interface PlayerBridge {
    start(payload: PlayerEvents.Start): void
    onStart(callback: IpcRendererCallback<PlayerEvents.Start>): IpcRendererCallbackUnsubscriber
    playerControl(payload: PlayerEvents.PlayerControl): void
    onPlayerControl(callback: IpcRendererCallback<PlayerEvents.PlayerControl>): IpcRendererCallbackUnsubscriber
    stop(payload: PlayerEvents.Stop): void
    onStop(callback: IpcRendererCallback<PlayerEvents.Stop>): IpcRendererCallbackUnsubscriber
    setSpeed(payload: PlayerEvents.SetSpeed): void
    onSetSpeed(callback: IpcRendererCallback<PlayerEvents.SetSpeed>): IpcRendererCallbackUnsubscriber
    time(payload: PlayerEvents.Time): void
    onTime(callback: IpcRendererCallback<PlayerEvents.Time>): IpcRendererCallbackUnsubscriber
    seek(payload: PlayerEvents.Seek): void
    onSeek(callback: IpcRendererCallback<PlayerEvents.Seek>): IpcRendererCallbackUnsubscriber
    zoom(payload: PlayerEvents.Zoom): void
    onZoom(callback: IpcRendererCallback<PlayerEvents.Zoom>): IpcRendererCallbackUnsubscriber
    toggleZoomScreen(): void
    onToggleZoomScreen(callback: IpcRendererCallback<void>): IpcRendererCallbackUnsubscriber
    zoomScreenNotFound(): void
    onZoomScreenNotFound(callback: IpcRendererCallback<void>): IpcRendererCallbackUnsubscriber
  }

  type EventHandlers = Exclude<{
    [K in keyof PlayerBridge]: K extends `on${string}` ? K : never
  }[keyof PlayerBridge], never>

  type EventNames = {
    [K in EventHandlers]: K extends `on${infer Ev}`
      ? Ev extends `${infer S1}${infer SRest}` ? `${Lowercase<S1>}${SRest}` : never
      : never
  }[EventHandlers]

  type EventHandlerFromName<N extends EventNames> = N extends `${infer S1}${infer SRest}`
    ? `on${Uppercase<S1>}${SRest}`
    : never

  const bridge: PlayerBridge

  interface CommonBridge {
    windowShow(): void
    requestPlayerWindow(): void
    platform: NodeJS.Platform
    storage: {
      get<T = unknown>(key: string): Promise<T>
      set<T = unknown>(key: string, value: T): Promise<void>
    }
  }

  const common: CommonBridge

  interface API {
    fetch<T = any>(endpoint: string, payload: any): Promise<T>
    listen<T = any>(topic: string, handler: (data: T) => void): IpcRendererCallbackUnsubscriber
  }

  const api: API
}

export { }
