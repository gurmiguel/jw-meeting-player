const { disablePeek } = require('bindings')('disable_peek')

type DisablePeek = (win: Buffer) => void

export default disablePeek as DisablePeek
