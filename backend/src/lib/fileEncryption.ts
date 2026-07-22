import crypto from 'crypto';

const MAGIC_HEADER = Buffer.from('SIGNHERE_ENC_GCM'); // 16 bytes
const ALGORITHM = 'aes-256-gcm';

// 32-byte (256-bit) encryption key from environment variable
const getEncryptionKey = (): Buffer => {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY is not defined in the environment variables.');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters).');
  }
  return key;
};

/**
 * Encrypts a buffer using AES-256-GCM.
 * Prepends a magic header and format metadata (IV/Tag lengths and values) to the ciphertext.
 */
export function encryptBuffer(plaintext: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard IV length is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag(); // GCM standard tag length is 16 bytes

  // Header metadata: Magic Header (16 bytes) | IV Length (1 byte) | Tag Length (1 byte)
  const meta = Buffer.alloc(18);
  MAGIC_HEADER.copy(meta, 0);
  meta.writeUInt8(iv.length, 16);
  meta.writeUInt8(authTag.length, 17);

  return Buffer.concat([meta, iv, authTag, ciphertext]);
}

/**
 * Decrypts a buffer if it starts with the custom encryption magic header.
 * Otherwise, returns the buffer as-is for backward compatibility.
 */
export function decryptBuffer(buffer: Buffer): Buffer {
  // If the buffer does not start with the magic header, it's plaintext
  if (buffer.length < MAGIC_HEADER.length || !buffer.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER)) {
    return buffer;
  }

  const key = getEncryptionKey();
  const ivLength = buffer.readUInt8(16);
  const tagLength = buffer.readUInt8(17);

  const ivStart = 18;
  const tagStart = ivStart + ivLength;
  const ciphertextStart = tagStart + tagLength;

  if (buffer.length < ciphertextStart) {
    throw new Error('Malformed encrypted buffer: size is too small.');
  }

  const iv = buffer.subarray(ivStart, tagStart);
  const authTag = buffer.subarray(tagStart, ciphertextStart);
  const ciphertext = buffer.subarray(ciphertextStart);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
