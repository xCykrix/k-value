const { MemoryAdapter } = require('../../dist/index')

async function main () {
  const kv = new MemoryAdapter()

  const map = new Map()
  map.set('key', true)
  map.set('value', false)

  const set = new Set()
  set.add('key')
  set.add('value')

  await kv.set('test', {
    buffer: Buffer.from('son of a buffer'),
    date: new Date(),
    map,
    set
  }, { lifetime: 1500 })

  setTimeout(async () => {
    console.info(2, await kv.get('test'))
  }, 3000)
  console.info(1, await kv.get('test'))
}

main()
