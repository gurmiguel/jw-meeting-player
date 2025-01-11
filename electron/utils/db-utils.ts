export function sqlParameters(size: number, amount = 1) {
  return new Array(size).fill(null).map(() => `(${new Array(amount).fill(null).map(() => '?').join(',')})`).join(', ')
}
