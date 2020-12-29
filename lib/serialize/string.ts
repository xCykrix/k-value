import { addDataType } from 'javascript-serializer'
import { escape } from 'sqlstring'

class SerializableString {
  constructor (public str: string) {}

  toJSON (): SerialString {
    return {
      i: escape(this.str)
    }
  }

  static fromJSON (str: SerialString): string {
    return str.i
  }
}

interface SerialString {
  i: string
}

export function hook (): void {
  addDataType(SerializableString, String)
}
