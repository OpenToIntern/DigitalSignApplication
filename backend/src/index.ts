import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { initMinioBucket, uploadDocumentToMinio, getDocumentDownloadUrl } from './minioClient';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Multer in-memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB limits
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Seed mock users into the database
async function seedMockUsers() {
  const mockUsers = [
    { id: 'usr-001', name: 'Jessy Harya', email: 'jessy@example.com', accessRole: 'user' },
    { id: 'usr-002', name: 'Ricky Wong', email: 'ricky@example.com', accessRole: 'supervisor' },
    { id: 'usr-003', name: 'Fred Johnson', email: 'fred@example.com', accessRole: 'manager' }
  ];

  for (const user of mockUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, accessRole: user.accessRole },
      create: user
    });
  }
  console.log('Mock users seeded/upserted in database.');
}

// Startup Initialization
async function startServer() {
  // Initialize MinIO Bucket
  await initMinioBucket();

  // Seed DB users (if DB is accessible)
  try {
    await seedMockUsers();
  } catch (error) {
    console.error('Warning: Failed to seed users. Ensure PostgreSQL is running and migrations are pushed.', error);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// GET users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/documents/upload - handles uploading a file to MinIO and saving its metadata to PostgreSQL
app.post('/api/documents/upload', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { category, senderId } = req.body;
    if (!senderId) {
      return res.status(400).json({ error: 'senderId is required.' });
    }

    const file = req.file;
    const documentId = `doc-${Date.now()}`;
    const fileKey = `docs/${documentId}-${file.originalname}`;

    // 1. Upload file binary to MinIO
    await uploadDocumentToMinio(fileKey, file.buffer, {
      'Content-Type': file.mimetype,
      'Original-Name': file.originalname
    });

    // 2. Generate initial SHA-256 hash for document integrity verification
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 3. Save document record in PostgreSQL
    const doc = await prisma.document.create({
      data: {
        id: documentId,
        name: file.originalname,
        category: category || 'General',
        size: `${(file.size / 1024).toFixed(0)} KB`,
        status: 'draft',
        senderId: senderId,
        fileKey: fileKey,
        baselineHash: hash,
        pageCount: 1, // Will be computed on client
      },
      include: {
        sender: true
      }
    });

    res.status(201).json(doc);
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents - get all documents
app.get('/api/documents', async (req: Request, res: Response) => {
  try {
    const docs = await prisma.document.findMany({
      include: {
        sender: true,
        markers: {
          include: {
            assignedTo: true
          }
        },
        auditLogs: {
          include: {
            user: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Generate transient presigned URL for each document
    const docsWithUrls = await Promise.all(docs.map(async (doc) => {
      let fileUrl = '';
      try {
        fileUrl = await getDocumentDownloadUrl(doc.fileKey);
      } catch (err) {
        console.error(`Failed to get presigned URL for document ${doc.id}:`, err);
      }
      return { ...doc, fileUrl };
    }));

    res.json(docsWithUrls);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents/:id - get a single document details with its presigned download URL
app.get('/api/documents/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        sender: true,
        markers: {
          include: {
            assignedTo: true
          }
        },
        auditLogs: {
          include: {
            user: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const fileUrl = await getDocumentDownloadUrl(doc.fileKey);
    res.json({ ...doc, fileUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/documents/:id - update document metadata, status, markers and audit logs
app.put('/api/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, pageCount, markers, auditLog } = req.body;

    // Fetch existing document to prevent overwriting missing fields
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // 1. Transaction to update document and replace markers/audit logs
    const result = await prisma.$transaction(async (tx) => {
      // Update basic fields
      const updatedDoc = await tx.document.update({
        where: { id },
        data: {
          status: status !== undefined ? status : existing.status,
          pageCount: pageCount !== undefined ? pageCount : existing.pageCount,
        }
      });

      // Update markers if provided
      if (markers !== undefined) {
        // Delete all old markers for this document
        await tx.marker.deleteMany({
          where: { documentId: id }
        });

        // Insert new ones
        for (const m of markers) {
          await tx.marker.create({
            data: {
              id: m.id,
              documentId: id,
              x: m.x,
              y: m.y,
              width: m.width,
              height: m.height,
              page: m.page,
              type: m.type,
              assignedToId: m.assignedTo.id,
              signed: m.signed,
              signedAt: m.signedAt ? new Date(m.signedAt) : null,
              signature: m.signature,
              metadata: m.metadata || undefined
            }
          });
        }
      }

      // Append audit logs if provided
      if (auditLog !== undefined && Array.isArray(auditLog)) {
        // Get already stored logs to avoid duplicates
        const existingLogs = await tx.auditLog.findMany({ where: { documentId: id } });
        const existingIds = new Set(existingLogs.map(l => l.id));

        for (const log of auditLog) {
          if (!existingIds.has(log.id)) {
            await tx.auditLog.create({
              data: {
                id: log.id,
                documentId: id,
                event: log.event,
                userId: log.user ? log.user.id : null,
                timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
                ip: log.ip || 'unknown',
                metadata: log.metadata || undefined
              }
            });
          }
        }
      }

      return updatedDoc;
    });

    // Fetch final result
    const finalDoc = await prisma.document.findUnique({
      where: { id },
      include: {
        sender: true,
        markers: {
          include: {
            assignedTo: true
          }
        },
        auditLogs: {
          include: {
            user: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    const fileUrl = await getDocumentDownloadUrl(finalDoc!.fileKey);
    res.json({ ...finalDoc, fileUrl });
  } catch (error: any) {
    console.error('Update Document Error:', error);
    res.status(500).json({ error: error.message });
  }
});

startServer();
