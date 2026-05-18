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

// Generate a visual key fingerprint (16-char code + 4 emojis)
export async function generateKeyFingerprint(
  secretBase64: string
): Promise<{ text: string; emojis: string[] }> {
  try {
    const bytes = base64ToUint8(secretBase64);
    const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Alphanumeric Fingerprint: e.g., A1B2-C3D4-E5F6-7F8A
    const hex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    const formattedText = `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;

    // Beautiful emojis to visually check matching fingerprint easily
    const emojiList = [
      '🦆', '🟡', '🔒', '🗝️', '🛡️', '💻', '🦊', '🚀', 
      '🌟', '💎', '🔥', '🌈', '🍕', '🎯', '🎸', '🎨', 
      '✈️', '🏝️', '🎈', '🎉', '🧸', '🔋', '🔮', '🍀', 
      '💡', '🔔', '🪐', '🦄', '🐳', '🥑', '🥨', '🍪'
    ];
    const emojis = [
      emojiList[hashArray[0] % emojiList.length],
      emojiList[hashArray[1] % emojiList.length],
      emojiList[hashArray[2] % emojiList.length],
      emojiList[hashArray[3] % emojiList.length]
    ];

    return { text: formattedText, emojis };
  } catch {
    return { text: 'ERROR', emojis: ['❌'] };
  }
}

// Derive dynamic PFS session key from base secret and dynamic peer salts
export async function derivePfsKey(
  baseSecretBase64: string,
  saltABase64: string,
  saltBBase64: string
): Promise<string> {
  const baseSecret = base64ToUint8(baseSecretBase64);
  const saltA = base64ToUint8(saltABase64);
  const saltB = base64ToUint8(saltBBase64);

  // Combine baseSecret, saltA, saltB
  const combined = new Uint8Array(baseSecret.length + saltA.length + saltB.length);
  combined.set(baseSecret, 0);
  combined.set(saltA, baseSecret.length);
  combined.set(saltB, baseSecret.length + saltA.length);

  // Hash the combination to derive a strong 32-byte dynamic session key
  const derivedBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(combined));
  return bytesToBase64(new Uint8Array(derivedBuffer));
}

