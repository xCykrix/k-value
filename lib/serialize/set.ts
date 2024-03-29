import { addDataType } from 'javascript-serializer';

/**
 * Transparent type-specific serialization kit.
 *
 * @category Serialization Utility
 * @internal
 */
class SerializableSet {
  public constructor(public set: Set<unknown>) {}

  public toJSON(): SerialSet {
    return {
      i: Array.from(this.set.values()),
    };
  }

  public static fromJSON(set: SerialSet): Set<unknown> {
    return new Set([...set.i]);
  }
}

interface SerialSet {
  i: Iterable<unknown>
}

export function hook(): void {
  addDataType(SerializableSet, Set);
}
