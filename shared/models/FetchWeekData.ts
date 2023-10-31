export interface FetchWeekDataRequest {
  isoDate: string
  type: FetchWeekType
}

export enum FetchWeekType {
  MIDWEEK,
  WEEKEND,
}
