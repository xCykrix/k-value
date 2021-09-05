const { expect } = require('chai')
const { SQLiteAdapter } = require('../dist/index')

const complex = {
  buffer: Buffer.from('son of a buffer'),
  date: new Date(),
  map: new Map([['world', 'hello'], ['hello', 'world']]),
  set: new Set(['world', 'hello'])
}

describe('Adapter::SQLiteAdapter', function () {
  let kv = null

  // The adapter should construct successfully.
  it('SQLiteAdapter::construct()', async function () {
    this.timeout(10000)
    kv = new SQLiteAdapter({
      client: 'sqlite3',
      connection: {
        filename: ':memory:',
        table: 'kv_store',
      },
      encoder: {
        use: true,
        store: 'base64',
        parse: 'utf-8'
      }
    })
    await kv.configure()
    await kv.set('read-test-1', { read: true })
    await kv.set('read-test-2', { val: false })
    await kv.set('read-test-3', { val: true })
    await kv.set('read-test-4', { x: 1 })
    await kv.set('read-test-5', { y: 2 })
  })

  // The adapter should be able to read/write simple and complex values.
  it('SQLiteAdapter::set()->get()', async function () {
    // Basic set()
    await kv.set('write-test-1', 'hello world')
    expect(await kv.get('write-test-1')).to.equal('hello world')
    // Rewrite set()
    await kv.set('write-test-2', true)
    expect(await kv.get('write-test-2')).to.equal(true)
    await kv.set('write-test-2', false)
    expect(await kv.get('write-test-2')).to.equal(false)
    // Complex set()
    await kv.set('write-test-3', complex)
    expect(await kv.get('write-test-3')).to.deep.equal(complex)
  })

  // The adapter should be able to recursively merge objects, when flagged.
  it('SQLiteAdapter::set():USE_MERGE->get()', async function () {
    // Feature of set() { merge: true }
    await kv.set('write-test-4', { x: 1 })
    expect(await kv.get('write-test-4')).to.deep.equal({ x: 1 })
    await kv.set('write-test-4', { y: 2 }, { merge: true })
    expect(await kv.get('write-test-4')).to.deep.equal({ x: 1, y: 2 })
  })

  // The adapter should respect the lifetime of values.
  it('SQLiteAdapter::set():USE_LIFETIME->get()', async function () {
    // Feature of set() { lifetime: 1 }
    this.timeout(15000)
    await kv.set('write-test-4', 'hello world', { lifetime: 3000 })
    expect(await kv.get('write-test-4')).to.equal('hello world')
    await new Promise((r) => setTimeout(r, 3500))
    expect(await kv.get('write-test-4')).to.equal(undefined)
  })

  // The adapter should be able to fetch specified value(s) and default appropriately.
  it('SQLiteAdapter::get()', async function () {
    expect(await kv.get('read-test-1')).to.deep.equal({ read: true })
    expect(await kv.get('read-test-2')).to.deep.equal({ val: false })
    expect(await kv.get(['read-test-1', 'read-test-2'])).to.deep.equal([
      { key: "read-test-1", value: { read: true } },
      { key: "read-test-2", value: { val: false } }
    ])
  })

  // The adapter should be able to return a default value.
  it('SQLiteAdapter::get():USE_DEFAULT', async function () {
    // Feature of get() { default: 'some-value' }
    expect(await kv.get('read-test-default', { default: 'hello world' })).to.equal('hello world')
    expect(await kv.get(['read-test-def-1', 'read-test-def-2'], { default: 'hello-world' })).to.deep.equal([
      { key: "read-test-def-1", value: 'hello-world' },
      { key: "read-test-def-2", value: 'hello-world' },
    ])
  })

  // The adapter should be able to locally cache values.
  it('SQLiteAdapter::get():USE_CACHE', async function () {
    // Feature of get() { cache: true }
    expect(await kv.get('read-test-1', { cache: true })).to.deep.equal({ read: true })
    expect(await kv.get('read-test-2', { cache: true })).to.deep.equal({ val: false })
    expect(await kv.get('read-test-1', { cache: true })).to.deep.equal({ read: true })
    expect(await kv.get('read-test-2', { cache: true })).to.deep.equal({ val: false })
    expect(await kv.get(['read-test-1', 'read-test-2'], { cache: true })).to.deep.equal([
      { key: "read-test-1", value: { read: true } },
      { key: "read-test-2", value: { val: false } }
    ])
  })

  // The adapter should be able to resolve the existence of id(s).
  it('SQLiteAdapter::has()', async function() {
    expect(await kv.has('read-test-1')).to.equal(true)
    expect(await kv.has('read-test-unknown')).to.equal(false)
    expect(await kv.has(['read-test-1', 'read-test-unknown'])).to.deep.equal([{ key: "read-test-1", has: true }, {key: "read-test-unknown", has: false }])
  })

  // The adapter should be able to index existance of id(s).
  it('SQLiteAdapter::keys()', async function() {
    expect(await kv.keys()).to.deep.include('read-test-1')
  })

  // The adapter should be able to index existance of id(s) with limiter restrictions.
  it('SQLiteAdapter::keys():USE_LIMITER', async function() {
    const keys = await kv.keys()
    const rkeys = await kv.keys({ limit: 5, randomize: true })
    expect(await kv.keys({ randomize: true })).to.not.deep.equal(keys)
    expect(await kv.keys({ limit: 1 })).to.have.lengthOf(1)
    expect(await kv.keys({ limit: 5, randomize: true })).to.have.lengthOf(5).and.to.not.deep.equal(rkeys)
  })

  // The adapter should be able to delete specific id(s) and their value.
  it('SQLiteAdapter::delete()', async function() {
    await kv.delete('read-test-1')
    expect(await kv.get('read-test-1')).to.equal(undefined)
    await kv.delete(['read-test-2', 'read-test-3'])
    expect(await kv.get(['read-test-2', 'read-test-3'])).to.deep.equal([
      { key: "read-test-2", value: undefined },
      { key: "read-test-3", value: undefined },
    ])
  })

  // Error Checking
  it('SQLiteAdapter::state_diagnostics', async function() {
    const s1 = await kv.get(undefined).catch((err) => {
      expect(err.message).to.not.equal(undefined)
      return null
    })
    expect(s1).to.equal(null)
    const s2 = await kv.set(undefined, {}).catch((err) => {
      expect(err.message).to.not.equal(undefined)
      return null
    })
    expect(s2).to.equal(null)
    const s3 = await kv.has(undefined).catch((err) => {
      expect(err.message).to.not.equal(undefined)
      return null
    })
    expect(s3).to.equal(null)
    const s4 = await kv.delete(undefined).catch((err) => {
      expect(err.message).to.not.equal(undefined)
      return null
    })
    expect(s4).to.equal(null)
  })

  // The adapter should be able to delete all id(s) and value(s).
  it('SQLiteAdapter::clear()', async function() {
    await kv.clear()
    expect(await kv.has('read-test-1')).to.equal(false)
    expect(await kv.keys()).to.have.lengthOf(0)
  })

  // The adapter should be able to close the connection(s).
  it('SQLiteAdapter::close()', async function () {
    await kv.close()
  })

})
