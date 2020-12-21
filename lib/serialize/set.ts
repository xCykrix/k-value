import { addDataType } from 'javascript-serializer'

class SerializableSet {
  constructor (public set: Set<any>) {}

  toJSON (): SerialSet {
    return {
      i: Array.from(this.set.values())
    }
  }

  static fromJSON (set: SerialSet): Set<any> {
    return new Set([...set.i])
  }
}

interface SerialSet {
  i: any[]
}

export function hook (): void {
  addDataType(SerializableSet, Set)
}
