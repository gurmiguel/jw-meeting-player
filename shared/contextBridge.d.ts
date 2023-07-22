import { IpcRendererEvent } from 'electron'
import { PlayerEvents } from '../electron/events/player'
import { APIEvents } from '../electron/events/api'

declare global {
  interface IpcRendererCallback<T> {
    (event: IpcRendererEvent, payload: T): void
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
    stop(): void
    onStop(callback: IpcRendererCallback): IpcRendererCallbackUnsubscriber
    setSpeed(payload: PlayerEvents.SetSpeed): void
    onSetSpeed(callback: IpcRendererCallback<PlayerEvents.SetSpeed>): IpcRendererCallbackUnsubscriber
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
  }

  const common: CommonBridge

  interface API {
    fetchWeekMedia(payload: APIEvents.FetchWeekMediaPayload): Promise<APIEvents.FetchWeekMediaResponse>
  }

  const api: API
}

export {}