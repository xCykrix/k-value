import { addDataType } from 'javascript-serializer';

/**
 * Transparent type-specific serialization kit.
 *
 * @category Serialization Utility
 * @internal
 */
class SerializableBuffer {
  public constructor(public buffer: Buffer) {}

  public toJSON(): SerialBuffer {
    return {
      i: this.buffer.toString('base64'),
    };
  }

  public static fromJSON(buffer: SerialBuffer): Buffer {
    return Buffer.from(buffer.i, 'base64');
  }
}

interface SerialBuffer {
  i: string
}

export function hook(): void {
  addDataType(SerializableBuffer, Buffer);
}
