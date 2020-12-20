import { addDataType } from 'javascript-serializer'

class SerializableMap {
  constructor (public map: Map<any, any>) {}

  toJSON (): SerialMap {
    return {
      i: JSON.stringify(Array.from(this.map.entries()))
    }
  }

  static fromJSON (map: SerialMap): Map<any, any> {
    return new Map(JSON.parse(map.i))
  }
}

interface SerialMap {
  i: string
}

export function hook (): void {
  addDataType(SerializableMap, Map)
}
