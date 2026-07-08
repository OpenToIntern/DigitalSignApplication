import { Client } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = parseInt(process.env.MINIO_PORT || '9000', 10);
const useSSL = process.env.MINIO_USE_SSL === 'true';
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
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
  return new Promise((resolve, reject) => {
    minioClient.putObject(
      BUCKET_NAME,
      fileKey,
      fileBuffer,
      fileBuffer.length,
      metaData,
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

// Get readable stream for backend proxying (keeps MinIO private)
export async function getDocumentStream(fileKey: string): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    minioClient.getObject(BUCKET_NAME, fileKey, (err, dataStream) => {
      if (err) {
        reject(err);
      } else {
        resolve(dataStream);
      }
    });
  });
}
