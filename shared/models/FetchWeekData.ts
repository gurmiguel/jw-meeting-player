export interface FetchWeekDataRequest {
  isoDate: string
  type: FetchWeekType
  forceSeed?: number
}

export enum FetchWeekType {
  MIDWEEK,
  WEEKEND,
}
