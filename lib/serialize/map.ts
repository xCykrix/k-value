import { addDataType } from 'javascript-serializer'

class SerializableMap {
  public constructor (public map: Map<unknown, unknown>) {}

  public toJSON (): SerialMap {
    return {
      i: Array.from(this.map.entries())
    }
  }

  public static fromJSON (map: SerialMap): Map<unknown, unknown> {
    return new Map([...map.i])
  }
}

interface SerialMap {
  i: Iterable<[unknown, unknown]>
}

export function hook (): void {
  addDataType(SerializableMap, Map)
}
