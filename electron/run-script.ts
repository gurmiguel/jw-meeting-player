import path from 'node:path'

const [, , file, fn, ...args] = process.argv

import(path.join(process.cwd(), file)).then(async mod => {
  const result = await mod[fn](...args.map(arg => eval(arg)))

  console.log('Script Result:', result)

  return result
})
