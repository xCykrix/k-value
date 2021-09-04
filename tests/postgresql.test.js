const { expect } = require('chai')
const { PostgreSQLAdapter } = require('../dist/index')

describe('Adapter - PostgreSQLAdapter', function () {
  let kv = null
  const complex = {
    buffer: Buffer.from('son of a buffer'),
    date: new Date(),
    map: new Map([['world', 'hello'], ['hello', 'world']]),
    set: new Set(['world', 'hello'])
  }
  const table = `kv-store-${require('crypto').randomBytes(4).toString('hex')}`
  it('should-initialize [' + table + ']', async function () {
    this.timeout(10000)
    kv = new PostgreSQLAdapter({
      table: table,
      connection: 'postgres://nznewehe:R9cy22iJot824TxDdsMNPtJ1J6iFz9S3@kashin.db.elephantsql.com/nznewehe',
      encoder: {
        use: true,
        store: 'base64',
        parse: 'utf-8'
      }
    })
    await kv.configure()
    await kv.clear()
  })
  it('should-write-data', async function () {
    this.timeout(10000)
    await kv.set('write-test', complex)
    await kv.set('multi-test', { v: true })
    await kv.set('merge-test', { x: 1 })
    await kv.set('cache-test', { v: '1-valid' })
    await kv.set('overwrite-test', 'curr-val')
    await kv.set('delete-test', true)
    await kv.set('expire-test', true, { lifetime: 1 })
    await kv.set('has-test', true)
    await kv.set('clear-test', true)
  })
  it('should-read-data-and-default', async function () {
    await kv.set('write-test', { insertable: true }, { merge: true })
    const kvr = await kv.get('write-test')
    expect(kvr.buffer.toString('base64')).to.equal(complex.buffer.toString('base64'))
    expect(kvr.date.getUTCMilliseconds()).to.equal(complex.date.getUTCMilliseconds())
    expect(kvr.map).to.deep.equal(complex.map)
    expect(kvr.set).to.deep.equal(complex.set)
    expect(kvr.insertable).to.equal(true)
    expect((await kv.get('obviously-unknown-key-here', { default: { x: true } })).x).to.equal(true)
  })
  it('should-multi-read-data-and-default', async function () {
    const kvr = await kv.get(['delete-test', 'has-test', 'multi-test', 'unknown-key'], { default: { x: true } })
    expect(kvr).to.have.deep.members([
      { key: 'delete-test', value: true },
      { key: 'has-test', value: true },
      { key: 'multi-test', value: { v: true } },
      { key: 'unknown-key', value: { x: true } }
    ])
  })
  it('should-merge-data', async function () {
    await kv.set('merge-test', { y: 2 }, { merge: true})
    expect(await kv.get('merge-test')).to.deep.equal({ x: 1, y: 2 })
  })
  it('should-cache-data', async function () {
    await kv.set('cache-test', { v: '1-valid' })
    const v1 = await kv.get('cache-test', { cache: true })
    await kv.set('cache-test', { v: '2-respec' })
    const v2 = await kv.get('cache-test', { cache: false })
    const v3 = await kv.get('cache-test', { cache: true })
    expect(v1.v).to.equal('1-valid')
    expect(v2.v).to.equal('2-respec')
    expect(v3.v).to.equal('2-respec')
  })
  it('should-delete-data', async function () {
    expect(await kv.delete('delete-test')).to.equal(true)
    expect(await kv.keys()).to.not.include('delete-test')
    expect(await kv.get('expire-test')).to.equal(undefined)
  })
  it('should-resolve-key-existence-and-default', async function () {
    expect(await kv.has('has-test')).to.equal(true)
    expect(await kv.has('obviously-unknown-key-here')).to.equal(false)
    expect((await kv.get('obviously-unknown-key-here', { default: { x: true } })).x).to.equal(true)
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
    await kv._handler.knex.schema.dropTable(table)
    await kv.close()
  })
})