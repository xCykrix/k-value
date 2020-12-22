const { expect } = require('chai')
const { MySQLAdapter } = require('../../dist/index')

describe('Adapter - MySQLAdapter', function () {
  let kv = null
  const state = {
    buffer: Buffer.from('son of a buffer'),
    date: new Date(),
    map: new Map([['world', 'hello'], ['hello', 'world']]),
    set: new Set(['world', 'hello'])
  }
  it('should-initialize', async function () {
    this.timeout(10000)
    kv = new MySQLAdapter({
      authentication: {
        host: 'eu-east.vsg.amethyst.live',
        username: 'kvalue',
        password: '52v6BAveLuvu122e1ApufAGi24bi4A',
        database: 'kvalue'
      },
      table: 'kv-store'
    })
    await kv.configure()
  })
  it('should-write-data', async function () {
    this.timeout(10000)
    await kv.set('clear-test', true)
    await kv.set('delete-test', true)
    await kv.set('expire-test', true, { lifetime: 1 })
    await kv.set('has-test', true)
    await kv.set('write-test', state)
  })
  it('should-read-data', async function () {
    const read = await kv.get('write-test')
    expect(read.buffer.toString('base64')).to.equal(state.buffer.toString('base64'))
    expect(read.date.getUTCMilliseconds()).to.equal(state.date.getUTCMilliseconds())
    expect(read.map).to.deep.equal(state.map)
    expect(read.set).to.deep.equal(state.set)
  })
  it('should-delete-data', async function () {
    expect(await kv.delete('delete-test')).to.equal(true)
    expect(await kv.keys()).to.not.include('delete-test')
    expect(await kv.get('expire-test')).to.equal(undefined)
  })
  it('should-resolve-key-existence', async function () {
    expect(await kv.has('has-test')).to.equal(true)
    expect(await kv.has('obviously-unknown-key-here')).to.equal(false)
  })
  it('should-index-keys', async function () {
    const keys = await kv.keys()
    expect(keys).to.include('clear-test')
    expect(keys).to.include('has-test')
    expect(keys).to.include('write-test')
  })
  it('should-clear-keys', async function () {
    await kv.clear()
    expect(await kv.has('clear-test')).to.equal(false)
    expect(await kv.keys()).to.have.lengthOf(0)
  })
  it('check-weird-states', async function () {
    const s1 = await kv.get(undefined).catch((err) => {
      expect(err.message).to.not.equal(undefined)
      return 'null-state'
    })
    expect(s1).to.equal('null-state')
    const s2 = await kv.set(undefined, {}).catch((err) => {
      expect(err.message).to.not.equal(undefined)
      return 'null-state'
    })
    expect(s2).to.equal('null-state')
    const s3 = await kv.has(undefined).catch((err) => {
      expect(err.message).to.not.equal(undefined)
      return 'null-state'
    })
    expect(s3).to.equal('null-state')
    const s4 = await kv.delete(undefined).catch((err) => {
      expect(err.message).to.not.equal(undefined)
      return 'null-state'
    })
    expect(s4).to.equal('null-state')
  })
  it('close-and-clean', async function () {
    await kv.close()
    await require('fs').rmSync(require('path').resolve(__dirname, './sqlite.db'), { force: true, recursive: false })
  })
})
