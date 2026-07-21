import { Client } from 'minio';
import dotenv from 'dotenv';
import { encryptBuffer, decryptBuffer } from './lib/fileEncryption';

dotenv.config();

const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = parseInt(process.env.MINIO_PORT || '9000', 10);
const useSSL = process.env.MINIO_USE_SSL === 'true';
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not defined in the environment variables. Refusing to start with an insecure default.`);
  }
  return value;
}

const accessKey = requireEnv('MINIO_ACCESS_KEY');
const secretKey = requireEnv('MINIO_SECRET_KEY');
export const BUCKET_NAME = process.env.MINIO_BUCKET || 'documents';

export const minioClient = new Client({
  endPoint: endpoint,
  port: port,
  useSSL: useSSL,
  accessKey: accessKey,
  secretKey: secretKey,
});

// Initialize bucket on startup
export async function initMinioBucket() {
  try {
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!bucketExists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`MinIO bucket "${BUCKET_NAME}" created successfully.`);

      // Set public policy for easy reading of documents (optional, but convenient for PDFs)
      // Otherwise, we use presigned URLs. Presigned URLs are safer, so we will use them!
    } else {
      console.log(`MinIO bucket "${BUCKET_NAME}" already exists.`);
    }
  } catch (error) {
    console.error('Error connecting to MinIO / creating bucket:', error);
  }
}

// Upload file helper
export async function uploadDocumentToMinio(
  fileKey: string,
  fileBuffer: Buffer,
  metaData: Record<string, string>
): Promise<string> {
  const encrypted = encryptBuffer(fileBuffer);
  const uploadMetaData = {
    ...metaData,
    'X-Amz-Server-Side-Encryption': 'AES256'
  };
  return new Promise((resolve, reject) => {
    minioClient.putObject(
      BUCKET_NAME,
      fileKey,
      encrypted,
      encrypted.length,
      uploadMetaData,
      (err, objInfo) => {
        if (err) {
          reject(err);
        } else {
          resolve(fileKey);
        }
      }
    );
  });
}

// Get pre-signed URL (lasts 2 hours)
export async function getDocumentDownloadUrl(fileKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    minioClient.presignedGetObject(
      BUCKET_NAME,
      fileKey,
      2 * 60 * 60, // 2 hours
      (err, presignedUrl) => {
        if (err) {
          reject(err);
        } else {
          // If running in docker, we might get an internal docker address.
          // Since the user accesses it from their browser, localhost is correct.
          // Let's replace internal docker hostnames/IPs with localhost/127.0.0.1 if needed.
          resolve(presignedUrl);
        }
      }
    );
  });
}

// Get document as a Buffer helper
export async function getDocumentBufferFromMinio(fileKey: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    minioClient.getObject(BUCKET_NAME, fileKey, (err, stream) => {
      if (err) {
        return reject(err);
      }
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (streamErr) => reject(streamErr));
      stream.on('end', () => {
        try {
          const decrypted = decryptBuffer(Buffer.concat(chunks));
          resolve(decrypted);
        } catch (decryptErr) {
          reject(decryptErr);
        }
      });
    });
  });
}
