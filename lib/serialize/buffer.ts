import { addDataType } from 'javascript-serializer'

class SerializableBuffer {
  constructor (public buffer: Buffer) {}

  toJSON (): SerialBuffer {
    return {
      i: this.buffer.toString('base64')
    }
  }

  static fromJSON (buffer: SerialBuffer): Buffer {
    return Buffer.from(buffer.i, 'base64')
  }
}

interface SerialBuffer {
  i: string
}

export function hook (): void {
  addDataType(SerializableBuffer, Buffer)
}
