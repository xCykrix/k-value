import { addDataType } from 'javascript-serializer'

class SerializableSet {
  constructor (public set: Set<any>) {}

  toJSON (): SerialSet {
    return {
      i: JSON.stringify(Array.from(this.set.values()))
    }
  }

  static fromJSON (set: SerialSet): Set<any> {
    return new Set(JSON.parse(set.i))
  }
}

interface SerialSet {
  i: string
}

export function hook (): void {
  addDataType(SerializableSet, Set)
}
