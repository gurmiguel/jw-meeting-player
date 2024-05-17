import 'electron'

declare global {
  type PromiseType<P extends Promise<unknown>> = P extends Promise<infer T>
    ? T
    : never

  type ArrayType<A extends Array> = A extends Array<infer T> ? T : never

  type NonNullableObject<T extends {}> = {
    [K in keyof T]: NonNullable<T[K]>
  }
}

export { }
