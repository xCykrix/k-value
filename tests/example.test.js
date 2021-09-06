const { MemoryAdapter } = require("../dist/index"); // require('kvalue')

async function example() {
  const kv = new MemoryAdapter();
  await kv.configure(); // This is needed for SQL-based, MongoDB, and Redis Adapters.
  await kv.set("key", "value");
  await kv.set("key2", { objKey: "value" });
  await kv.set(["key3", "key4"], { objKey: "multi-set" });
  await kv.set("key4", true);
  await kv.set("key5", { x: 1 });
  await kv.set("key5", { y: 2 }, { merge: true }); // { x: 1, y: 2 }
  await kv.set("key6", { x: 300 }, { lifetime: 10000 }); // Expires after 10s

  await kv.get("key"); // "value"
  await kv.get(["key2", "key3"]); // [ { key: 'key2', value: { objKey: "value" }}, { key: 'key3', value: { objKey: "multi-set" }} ]
  await kv.get("unknown", { defaultValue: "default" }); // "default"
  await kv.get(["unknown1", "unknown2"], { defaultValue: "default" }); // [ { key: 'unknown1', value: 'default' }, { key: 'unknown2', value: 'default' } ]

  // Caching not enabled on MemoryAdapter
  // Cache the value to memory, expiring after cacheExpire ms
  // Adapter#set() will invalidate the cached value.
  await kv.get("key4", { cache: true, cacheExpire: 1000 });

  await kv.has("key"); // true
  await kv.has("unknown"); // false
  await kv.has(["key", "key2", "unknown"]); // [ { key: 'key', has: true }, { key: 'key2', has: true }, { key: 'unknown', has: false } ]

  await kv.keys(); // [ 'key', 'key2', 'key3', 'key4', 'key5', 'key6' ]
  await kv.keys({ limit: 5 }); // [ 'key', 'key2', 'key3', 'key4', 'key5' ]
  await kv.keys({ limit: 3, randomize: true }); // [ 'key', 'key5', 'key2' ]

  await kv.delete("key");
  await kv.delete(["key2", "key3"]);
  await kv.delete("unknown");

  await kv.entries(); // [ [key, value], [key2, value], [key3, value], [key4, value], [key5, value], [key6, value] ]
  await kv.values(); // [ value, value, value, value, ... ]

  await kv.clear();
}

example();
