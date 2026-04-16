import { base64urlEncode, base64urlDecode } from './utils';

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return base64urlEncode(new Uint8Array(raw));
}

export async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = base64urlDecode(keyStr);
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

export async function encrypt(
  plaintext: string,
  passphrase?: string
): Promise<{
  encrypted_data: string;
  iv: string;
  salt?: string;
  key?: string;
}> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  let key: CryptoKey;
  let salt: Uint8Array | undefined;
  let exportedKey: string | undefined;

  if (passphrase) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    key = await deriveKeyFromPassphrase(passphrase, salt, ['encrypt']);
  } else {
    const aesKey = await generateKey();
    exportedKey = await exportKey(aesKey);
    key = aesKey;
  }

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    encrypted_data: base64urlEncode(new Uint8Array(encrypted)),
    iv: base64urlEncode(iv),
    salt: salt ? base64urlEncode(salt) : undefined,
    key: exportedKey,
  };
}

export async function decrypt(
  encryptedData: string,
  ivStr: string,
  keyOrPassphrase: string,
  saltStr?: string
): Promise<string> {
  const data = base64urlDecode(encryptedData);
  const iv = base64urlDecode(ivStr);

  let key: CryptoKey;

  if (saltStr) {
    const salt = base64urlDecode(saltStr);
    key = await deriveKeyFromPassphrase(keyOrPassphrase, salt, ['decrypt']);
  } else {
    key = await importKey(keyOrPassphrase);
  }

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
