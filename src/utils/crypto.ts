// ===================== DUCK DUCK YELLOW - Crypto Utilities =====================

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(uint8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(uint8.length);
  new Uint8Array(ab).set(uint8);
  return ab;
}

// Generate a Duck ID: DD-XXXX-XXXX
export function generateDuckId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const digits = Array.from(bytes)
    .map(b => (b % 10).toString())
    .join('');
  return `DD-${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
}

// SHA-256 password hashing
export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate a compact Yellow Code (64 base64 chars = 48 raw bytes)
// Format: [16 bytes room ID | 32 bytes AES secret]
export function generateYellowCode(): {
  code: string;
  roomId: string;
  secret: string;
} {
  const roomBytes = crypto.getRandomValues(new Uint8Array(16));
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));

  const combined = new Uint8Array(48);
  combined.set(roomBytes, 0);
  combined.set(secretBytes, 16);

  const code = bytesToBase64(combined);
  const roomId = Array.from(roomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const secret = bytesToBase64(secretBytes);

  return { code, roomId, secret };
}

// Parse a Yellow Code back into roomId + secret
export function parseYellowCode(
  code: string
): { roomId: string; secret: string } | null {
  try {
    const combined = base64ToUint8(code.trim());
    if (combined.length !== 48) return null;

    const roomBytes = combined.subarray(0, 16);
    const secretBytes = combined.subarray(16, 48);

    const roomId = Array.from(roomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const secret = bytesToBase64(secretBytes);

    return { roomId, secret };
  } catch {
    return null;
  }
}

// AES-256-GCM encrypt → base64( IV(12) + ciphertext )
export async function encryptMessage(
  plaintext: string,
  secretBase64: string
): Promise<string> {
  const secretBytes = base64ToUint8(secretBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(secretBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    new TextEncoder().encode(plaintext)
  );

  const encArr = new Uint8Array(encrypted);
  const combined = new Uint8Array(12 + encArr.length);
  combined.set(iv, 0);
  combined.set(encArr, 12);

  return bytesToBase64(combined);
}

// AES-256-GCM decrypt
export async function decryptMessage(
  encryptedBase64: string,
  secretBase64: string
): Promise<string> {
  const secretBytes = base64ToUint8(secretBase64);
  const combined = base64ToUint8(encryptedBase64);

  const iv = combined.subarray(0, 12);
  const ciphertext = combined.subarray(12);

  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(secretBytes),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext)
  );

  return new TextDecoder().decode(decrypted);
}
