import path from 'node:path'

const [, , file, fn, ...args] = process.argv

import(path.join(process.cwd(), file)).then(mod => {
  return mod[fn](...args.map(arg => eval(arg)))
})
