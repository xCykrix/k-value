import { addDataType } from 'javascript-serializer'

class SerializableMap {
  constructor (public map: Map<any, any>) {}

  toJSON (): SerialMap {
    return {
      i: Array.from(this.map.entries())
    }
  }

  static fromJSON (map: SerialMap): Map<any, any> {
    return new Map([...map.i])
  }
}

interface SerialMap {
  i: any[]
}

export function hook (): void {
  addDataType(SerializableMap, Map)
}
