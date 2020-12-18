import { addDataType } from 'javascript-serializer'

export class SerializableBuffer {
  constructor (public buffer: Buffer) {}

  toJSON (): SerialBuffer {
    return {
      encoded: this.buffer.toString('base64')
    }
  }

  fromJSON (serialBuffer: SerialBuffer): Buffer {
    return Buffer.from(serialBuffer.encoded, 'base64')
  }
}

interface SerialBuffer {
  encoded: string
}

addDataType(SerializableBuffer, Buffer)
