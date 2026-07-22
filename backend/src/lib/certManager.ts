import selfsigned from 'selfsigned';
import { encryptBuffer, decryptBuffer } from './fileEncryption';

interface UserKeysAndCert {
  cert: string;
  encryptedPrivateKey: string;
}

/**
 * Generates an RSA-2048 key pair and a self-signed X.509 certificate for a user.
 * Encrypts the private key using AES-256-GCM and encodes it to base64.
 */
export async function generateUserKeysAndCert(userName: string, userEmail: string): Promise<UserKeysAndCert> {
  console.log("=== generateUserKeysAndCert ===", { userName, userEmail });
  const attrs = [
    { name: 'commonName', value: userName },
    { name: 'organizationName', value: 'SignHere Enterprise' }
  ];

  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setFullYear(notAfter.getFullYear() + 10);

  const pems = await selfsigned.generate(attrs, {
    keySize: 2048,
    notBeforeDate: notBefore,
    notAfterDate: notAfter
  });

  // Encrypt the PEM private key using our standard AES-256-GCM buffer helper
  const plaintextPrivateKeyBuffer = Buffer.from(pems.private, 'utf8');
  const encryptedBuffer = encryptBuffer(plaintextPrivateKeyBuffer);

  return {
    cert: pems.cert,
    encryptedPrivateKey: encryptedBuffer.toString('base64')
  };
}

/**
 * Decrypts the stored encryptedPrivateKey base64 string back into a PEM private key string.
 */
export function decryptUserPrivateKey(encryptedBase64: string): string {
  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
  const decryptedBuffer = decryptBuffer(encryptedBuffer);
  return decryptedBuffer.toString('utf8');
}
