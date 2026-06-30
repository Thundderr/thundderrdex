// Guards against pushing an oversized payload to the cloud. Supabase rejects
// rows past a practical size ceiling, and a silent rejection looks exactly like
// a lost save — so the engine checks size up front and surfaces a clear error
// instead of retry-looping a write that can never succeed.

/** ~1 MB — a conservative ceiling under Supabase's row/RPC practical limit. */
export const MAX_PAYLOAD_BYTES = 1_000_000;

/** UTF-8 byte length of a value's JSON encoding (what actually gets uploaded). */
export function serializedByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/** Whether a value's JSON encoding exceeds the byte limit (boundary inclusive). */
export function exceedsPayloadLimit(
  value: unknown,
  maxBytes: number = MAX_PAYLOAD_BYTES
): boolean {
  return serializedByteLength(value) > maxBytes;
}
