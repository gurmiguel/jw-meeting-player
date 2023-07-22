declare global {
  type PromiseType<P extends Promise<unknown>> = P extends Promise<infer T>
    ? T
    : never
}

export {}