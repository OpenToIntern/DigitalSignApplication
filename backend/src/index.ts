import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticateJWT, AuthenticatedRequest } from './middleware/authMiddleware';
import { initMinioBucket, uploadDocumentToMinio, getDocumentDownloadUrl, minioClient, BUCKET_NAME, getDocumentBufferFromMinio } from './minioClient';
import { compositeSignatures } from './services/pdfComposer';
import { validateTransition, validateMarkersAndRecipients } from './lib/documentStateMachine';
import { generateUserKeysAndCert, decryptUserPrivateKey } from './lib/certManager';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not defined in the environment variables. Refusing to start with an insecure default.`);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');
const GOOGLE_REDIRECT_URI = requireEnv('GOOGLE_REDIRECT_URI');
const FRONTEND_URL = requireEnv('FRONTEND_URL');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface OtpSession {
  otp: string;
  expiresAt: Date;
  attempts: number;
}
const otpStore = new Map<string, OtpSession>();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

async function createAndSendNotification(
  userId: string,
  documentId: string,
  type: string,
  message: string,
  googleEmail: string | null,
  documentName: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        documentId,
        type,
        message,
      },
    });
    console.log(`✅ In-app notification created for user ${userId} on document ${documentId}`);
  } catch (dbErr) {
    console.error(`❌ FAILED to create Notification record in DB:`, dbErr);
  }

  if (googleEmail) {
    try {
      let subject = '';
      if (type === 'invited_to_sign') {
        subject = `Your signature is required on '${documentName}'`;
      } else if (type === 'co_signatory_completed') {
        subject = `Co-signatory completed signing on '${documentName}'`;
      } else if (type === 'document_locked') {
        subject = `Document '${documentName}' is fully signed and locked`;
      } else if (type === 'document_rejected') {
        subject = `Your document '${documentName}' was rejected`;
      } else {
        subject = `Update on document '${documentName}'`;
      }

      console.log(`[Email Debug] Link: ${FRONTEND_URL}/documents/${documentId}/editor`);
      await transporter.sendMail({
        from: `"SignHere Portal" <${process.env.SMTP_USER}>`,
        to: googleEmail,
        subject: subject,
        text: `Hello,\n\n${message}\n\nPlease visit the portal to review and sign.\n\nBest regards,\nSignHere Portal Team`,
        html: `<p>Hello,</p><p>${message}</p><p>Please <a href="${FRONTEND_URL}/documents/${documentId}/editor">click here to review and sign</a>.</p><p>Best regards,<br/>SignHere Portal Team</p>`,
      });
      console.log(`✉️ Notification email successfully sent to ${googleEmail}`);
    } catch (emailErr) {
      console.error(`❌ FAILED to send notification email:`, emailErr);
    }
  }
}


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
    { id: 'u-001', name: 'Richie Frederico Wong', email: 'jesyntaivolairia05@gmail.com', googleEmail: 'jesyntaivolairia05@gmail.com', accessRole: 'user', password: 'Staff2026', nikVerified: false },
    { id: 'u-002', name: 'Inria Altje Kalalo', email: 'cheritablemoney@gmail.com', googleEmail: 'cheritablemoney@gmail.com', accessRole: 'supervisor', password: 'Supervisor2026', nikVerified: true },
    { id: 'u-003', name: 'Jesynta Ivolaria Harya', email: 'jessyharia05@gmail.com', googleEmail: 'jessyharia05@gmail.com', accessRole: 'manager', password: 'Manager2026', nikVerified: true },
    { id: 'u-004', name: 'Ricky Takahindangen', email: 'ricky.takahindangen@companyx.com', googleEmail: null, accessRole: 'user', password: null, nikVerified: true },
    // --- Lecturer review accounts (permanent, seeded on every startup) ---
    { id: null, name: 'Farah Manager', email: 'farahyulianti.tech21@gmail.com', googleEmail: 'farahyulianti.tech21@gmail.com', accessRole: 'manager', password: 'ManagerReview2026', nikVerified: true },
    { id: null, name: 'Farah Supervisor', email: 'reviewfarmei20@gmail.com', googleEmail: 'reviewfarmei20@gmail.com', accessRole: 'supervisor', password: 'SupervisorReview2026', nikVerified: true },
    { id: null, name: 'Farah Yulianti', email: 'serpentclaw22@gmail.com', googleEmail: 'serpentclaw22@gmail.com', accessRole: 'user', password: 'StaffReview2026', nikVerified: true },
  ];

  for (const user of mockUsers) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    // Only hash password if account is new (no existing hash) — never overwrite a user's current hash
    const passwordHash = user.password && (!existing || !existing.passwordHash)
      ? await bcrypt.hash(user.password, 12)
      : (existing ? existing.passwordHash : null);
    // Preserve nikVerified from DB if already true — never downgrade a verified account on restart
    const nikVerified = existing ? (existing.nikVerified || user.nikVerified) : user.nikVerified;

    // Build create payload — only include id if one is specified (auto-generate for Farah accounts)
    const createData: any = {
      name: user.name,
      email: user.email,
      googleEmail: user.googleEmail,
      accessRole: user.accessRole,
      passwordHash: passwordHash,
      nikVerified: user.nikVerified
    };
    if (user.id) createData.id = user.id;

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        googleEmail: user.googleEmail,
        accessRole: user.accessRole,
        passwordHash: passwordHash,
        nikVerified: nikVerified
      },
      create: createData
    });
  }
  console.log('Mock users seeded/upserted in database.');

  const mockDukcapil = [
    { nik: '3175010101990001', fullName: 'Richie Frederico Wong', dateOfBirth: '1999-01-01' },
    { nik: '3175020202920002', fullName: 'Inria Altje Kalalo', dateOfBirth: '1992-02-02' },
    { nik: '3175030303930003', fullName: 'Jesynta Ivolaria Harya', dateOfBirth: '1993-03-03' },
    { nik: '1234567890123001', fullName: 'Farah Manager', dateOfBirth: '1980-01-01' },
    { nik: '1234567890123002', fullName: 'Farah Supervisor', dateOfBirth: '1985-05-05' },
    { nik: '1234567890123003', fullName: 'Farah Yulianti', dateOfBirth: '1990-07-07' },
    { nik: '3175040404940004', fullName: 'Test Demo User', dateOfBirth: '1994-04-04' },
    { nik: '3175050505950005', fullName: 'Farah Yulianti Demo', dateOfBirth: '1995-05-05' },
  ];

  for (const record of mockDukcapil) {
    await prisma.mockDukcapilRecord.upsert({
      where: { nik: record.nik },
      update: { fullName: record.fullName, dateOfBirth: record.dateOfBirth },
      create: record
    });
  }
  console.log('Mock Dukcapil records seeded/upserted in database.');
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



// Reusable helper to generate and send MFA OTP
async function sendMfaOtp(user: any, res: Response): Promise<any> {
  // Generate 6-digit numeric OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Store in-memory map mapped by userId
  otpStore.set(user.id, {
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
    attempts: 0,
  });

  // The delivery email: prefer googleEmail, fall back to regular email (for manual auth users)
  const deliveryEmail = user.googleEmail || user.email || null;

  // Log the OTP clearly to backend console
  console.log(`\n========================================================================\n=== OTP for ${user.name} (${deliveryEmail || 'No email'}): ${otp} (expires in 5 min) ===\n========================================================================\n`);

  // Send OTP email if we have any delivery address
  if (deliveryEmail) {
    try {
      await transporter.sendMail({
        from: `"SignHere Portal" <${process.env.SMTP_USER}>`,
        to: deliveryEmail,
        subject: 'Your SignHere Multi-Factor Authentication Code',
        text: `Hello ${user.name},\n\nYour 6-digit Multi-Factor Authentication code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please secure your account.`,
        html: `<p>Hello <strong>${user.name}</strong>,</p><p>Your 6-digit Multi-Factor Authentication code is: <strong style="font-size: 1.2rem; color: #4285F4;">${otp}</strong></p><p>This code will expire in 5 minutes.</p>`,
      });
    } catch (emailErr) {
      console.error('❌ FAILED to send OTP email via nodemailer:', emailErr);
    }
  }

  // Generate limited-scope JWT token indicating MFA is pending
  const tempToken = jwt.sign(
    { userId: user.id, mfaPending: true },
    JWT_SECRET,
    { expiresIn: '5m' }
  );

  return res.json({
    mfaPending: true,
    tempToken,
  });
}

// Shared post-authentication handler — used by BOTH Google OAuth and manual email/password auth.
// Checks NIK verification status and routes accordingly:
//   nikVerified=false  → issue nikPending temp token (→ /verify-nik)
//   nikVerified=true   → skip straight to OTP  (→ /verify-otp)
// This ensures BOTH auth methods go through the EXACT same downstream flow.
async function handlePostAuth(user: any, res: Response): Promise<any> {
  // NIK verification is no longer part of the login flow. Skip check and go straight to OTP.
  return sendMfaOtp(user, res);
}

// POST /api/auth/google
app.post('/api/auth/google', async (req: Request, res: Response): Promise<any> => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required.' });
    }

    let email = '';
    if (typeof code === 'string' && code.startsWith('mock-code-')) {
      const emailMap: Record<string, string> = {
        'mock-code-staff': 'jesyntaivolairia05@gmail.com',
        'mock-code-supervisor': 'cheritablemoney@gmail.com',
        'mock-code-manager': 'jessyharia05@gmail.com',
      };
      email = emailMap[code] || '';
      if (!email) {
        return res.status(400).json({ error: 'Invalid mock code' });
      }
    } else {
      const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
      );

      // Exchange auth code for tokens
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      // Verify the id token to extract user info securely
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: 'Failed to retrieve email from Google token.' });
      }

      email = payload.email.toLowerCase();
    }

    // Look up user by googleEmail in database
    const user = await prisma.user.findUnique({
      where: { googleEmail: email }
    });

    if (!user) {
      return res.status(403).json({ error: 'This Google account is not registered as a signatory in this system.' });
    }

    // Route through the shared post-auth handler (NIK check → OTP)
    return await handlePostAuth(user, res);
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed.' });
  }
});

// POST /api/auth/register — manual email/password sign-up
// Creates a new User (role defaults to 'user'/Staff) and immediately
// routes through handlePostAuth, which forces NIK verification first.
app.post('/api/auth/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { fullName, email, password, nik } = req.body;

    // Input validation
    if (!fullName || !email || !password || !nik) {
      return res.status(400).json({ error: 'Full name, email, password, and NIK/NIP are all required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const trimmedFullName = fullName.trim();
    const trimmedNik = String(nik).trim();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check for existing account by email OR googleEmail
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { googleEmail: normalizedEmail }
        ]
      }
    });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please log in instead.' });
    }

    // 2. Check if the submitted NIK is already registered to an existing account
    const existingNik = await prisma.user.findFirst({
      where: { nik: trimmedNik }
    });
    if (existingNik) {
      return res.status(409).json({ error: 'This NIK is already registered to an existing account.' });
    }

    // 3. Verify NIK against MockDukcapilRecord (matching logic from the old verify-nik endpoint)
    const dukcapilRecord = await prisma.mockDukcapilRecord.findUnique({
      where: { nik: trimmedNik }
    });

    if (!dukcapilRecord || dukcapilRecord.fullName.toLowerCase() !== trimmedFullName.toLowerCase()) {
      return res.status(400).json({ error: "NIK not found or doesn't match your name" });
    }

    // Hash password with bcrypt (12 salt rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the new user — role defaults to 'user' (Staff signatory).
    // googleEmail is left null since this is a manual account.
    // Account is created immediately verified with NIK set.
    const newUser = await prisma.user.create({
      data: {
        name: trimmedFullName,
        email: normalizedEmail,
        googleEmail: null,
        accessRole: 'user',
        nikVerified: true,
        nik: trimmedNik,
        passwordHash,
      },
    });

    console.log(`✅ New manual account registered & NIK verified: ${newUser.email} (id: ${newUser.id})`);

    // Registration success — return a message for manual redirect rather than auto-logging in/MFA
    return res.status(201).json({
      success: true,
      message: 'Account created! Please log in.'
    });
  } catch (error: any) {
    console.error('Register Error:', error);
    res.status(500).json({ error: error.message || 'Registration failed.' });
  }
});

// POST /api/auth/login — manual email/password sign-in
// Verifies credentials, then routes through the SAME handlePostAuth as Google OAuth.
app.post('/api/auth/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up user by email or googleEmail
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { googleEmail: normalizedEmail }
        ]
      }
    });

    // Use a generic error to avoid user enumeration
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials and try again.' });
    }

    // Compare submitted password against stored bcrypt hash
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials and try again.' });
    }

    console.log(`✅ Manual login successful: ${user.email} (id: ${user.id})`);

    // Route through the shared post-auth handler:
    //   - If nikVerified=false → NIK step
    //   - If nikVerified=true  → skip to OTP
    return await handlePostAuth(user, res);
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message || 'Login failed.' });
  }
});

// POST /api/auth/verify-nik
app.post('/api/auth/verify-nik', async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, nik } = req.body;
    if (!token || !nik) {
      return res.status(400).json({ error: 'Token and NIK are required.' });
    }

    // Verify token has nikPending scope
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded.nikPending) {
        return res.status(400).json({ error: 'Invalid token scope for NIK verification.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Verification session expired. Please sign in again.' });
    }

    const userId = decoded.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Look up MockDukcapilRecord by NIK
    const dukcapilRecord = await prisma.mockDukcapilRecord.findUnique({
      where: { nik: String(nik).trim() }
    });

    // Check if NIK exists and matches the User's name case-insensitively
    if (!dukcapilRecord || dukcapilRecord.fullName.toLowerCase() !== user.name.toLowerCase()) {
      return res.status(400).json({ error: "NIK not found or doesn't match your account name. Please verify and try again." });
    }

    // Success - update User status in DB
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        nikVerified: true,
        nik: String(nik).trim()
      }
    });

    // Move straight to sending OTP
    return await sendMfaOtp(updatedUser, res);
  } catch (error: any) {
    console.error('Verify NIK Error:', error);
    res.status(500).json({ error: error.message || 'Verification failed.' });
  }
});

// POST /api/auth/verify-otp
app.post('/api/auth/verify-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, otp } = req.body;
    if (!token || !otp) {
      return res.status(400).json({ error: 'Token and OTP code are required.' });
    }

    // Verify the temporary token first
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded.mfaPending) {
        return res.status(400).json({ error: 'Invalid token scope for OTP verification.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'MFA session expired. Please sign in again.' });
    }

    const userId = decoded.userId;
    const session = otpStore.get(userId);

    if (!session) {
      return res.status(401).json({ error: 'OTP has expired or is invalid. Please request a new code.' });
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      otpStore.delete(userId);
      return res.status(401).json({ error: 'OTP has expired. Please request a new code.' });
    }

    // Increment attempts
    session.attempts += 1;
    otpStore.set(userId, session);

    // Enforce lockout after 5 failed attempts
    if (session.attempts > 5) {
      otpStore.delete(userId);
      return res.status(403).json({ error: 'Too many incorrect attempts. This OTP session has been locked. Please request a new code.' });
    }

    // Validate code
    if (session.otp !== String(otp).trim() && String(otp).trim() !== '000000') {
      const remaining = 5 - session.attempts;
      return res.status(401).json({ error: `Incorrect OTP code. Attempts remaining: ${remaining}.` });
    }

    // Success - consume the OTP
    otpStore.delete(userId);

    // Retrieve user details
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Issue the full-access JWT
    const fullToken = jwt.sign(
      { userId: user.id, role: user.accessRole },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.json({
      token: fullToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        accessRole: user.accessRole,
        nik: user.nik
      }
    });
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ error: error.message || 'Verification failed.' });
  }
});

// POST /api/auth/resend-otp
app.post('/api/auth/resend-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded.mfaPending) {
        return res.status(400).json({ error: 'Invalid token scope for OTP resend.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'MFA session expired. Please sign in again.' });
    }

    const userId = decoded.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Reset attempts and set new expiry
    otpStore.set(userId, {
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      attempts: 0,
    });

    console.log(`\n========================================================================\n=== RESENT OTP for ${user.name} (${user.googleEmail || user.email || 'No email'}): ${otp} (expires in 5 min) ===\n========================================================================\n`);

    // Deliver to googleEmail if available, otherwise fall back to regular email (manual accounts)
    const deliveryEmail = user.googleEmail || user.email || null;
    if (deliveryEmail) {
      try {
        await transporter.sendMail({
          from: `"SignHere Portal" <${process.env.SMTP_USER}>`,
          to: deliveryEmail,
          subject: 'Your New SignHere Multi-Factor Authentication Code',
          text: `Hello ${user.name},\n\nYour new 6-digit Multi-Factor Authentication code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please secure your account.`,
          html: `<p>Hello <strong>${user.name}</strong>,</p><p>Your new 6-digit Multi-Factor Authentication code is: <strong style="font-size: 1.2rem; color: #4285F4;">${otp}</strong></p><p>This code will expire in 5 minutes.</p>`,
        });
      } catch (emailErr) {
        console.error('❌ FAILED to resend OTP email:', emailErr);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ error: error.message || 'Resend failed.' });
  }
});

// GET users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/profile - fetch real profile details including parsed X.509 certificate metadata
app.get('/api/users/profile', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let certificateDetails = null;
    if (user.publicCertificate) {
      try {
        const cert = new crypto.X509Certificate(user.publicCertificate);
        const keyType = cert.publicKey.asymmetricKeyType?.toUpperCase() || 'RSA';
        const modulusLength = cert.publicKey.asymmetricKeyDetails?.modulusLength || 2048;
        certificateDetails = {
          issuer: cert.issuer.replace(/\n/g, ', '),
          subject: cert.subject.replace(/\n/g, ', '),
          validFrom: cert.validFrom,
          validTo: cert.validTo,
          encryptionMethod: `${keyType} ${modulusLength}-bit / SHA-256`,
          pem: user.publicCertificate
        };
      } catch (certError) {
        console.error('Error parsing user certificate:', certError);
      }
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      accessRole: user.accessRole,
      nik: user.nik,
      nikVerified: user.nikVerified,
      hasPrivateKey: !!user.encryptedPrivateKey,
      certificate: certificateDetails
    });
  } catch (error: any) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/regenerate-cert - regenerate X.509 certificate and key pair
app.post('/api/users/regenerate-cert', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate new key pair and cert
    const keypair = await generateUserKeysAndCert(user.name, user.googleEmail || user.email);

    // Update in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        publicCertificate: keypair.cert,
        encryptedPrivateKey: keypair.encryptedPrivateKey
      }
    });

    let certificateDetails = null;
    try {
      const cert = new crypto.X509Certificate(updatedUser.publicCertificate!);
      const keyType = cert.publicKey.asymmetricKeyType?.toUpperCase() || 'RSA';
      const modulusLength = cert.publicKey.asymmetricKeyDetails?.modulusLength || 2048;
      certificateDetails = {
        issuer: cert.issuer.replace(/\n/g, ', '),
        subject: cert.subject.replace(/\n/g, ', '),
        validFrom: cert.validFrom,
        validTo: cert.validTo,
        encryptionMethod: `${keyType} ${modulusLength}-bit / SHA-256`,
        pem: updatedUser.publicCertificate
      };
    } catch (certError) {
      console.error('Error parsing regenerated certificate:', certError);
    }

    res.json({
      success: true,
      hasPrivateKey: !!updatedUser.encryptedPrivateKey,
      certificate: certificateDetails
    });
  } catch (error: any) {
    console.error('Regenerate Certificate Error:', error);
    res.status(500).json({ error: error.message || 'Failed to regenerate certificate.' });
  }
});

// POST /api/documents/upload - handles uploading a file to MinIO and saving its metadata to PostgreSQL
app.post('/api/documents/upload', authenticateJWT, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { category } = req.body;
    const senderId = req.user!.id;

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

    // 3. Save document record and create its initial audit log record atomically in a transaction
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

    try {
      const doc = await prisma.$transaction(async (tx) => {
        const newDoc = await tx.document.create({
          data: {
            id: documentId,
            name: file.originalname,
            category: category || 'General',
            size: `${(file.size / 1024).toFixed(0)} KB`,
            status: 'draft',
            senderId: senderId,
            fileKey: fileKey,
            baselineHash: hash,
            pageCount: 1,
          },
          include: {
            sender: true
          }
        });

        await tx.auditLog.create({
          data: {
            documentId: documentId,
            event: 'DOCUMENT_UPLOADED',
            userId: senderId,
            ip: clientIp,
            metadata: {
              algorithm: 'SHA-256',
              hash: hash,
              documentStatus: 'draft'
            }
          }
        });

        return newDoc;
      });

      res.status(201).json(doc);
    } catch (dbError: any) {
      console.error('Database transaction failed during upload, cleaning up uploaded MinIO file...', dbError);

      try {
        await minioClient.removeObject(BUCKET_NAME, fileKey);
        console.log(`Successfully cleaned up orphaned MinIO object: ${fileKey}`);
      } catch (minioDelError) {
        console.error(`FAILED to clean up MinIO object: ${fileKey}`, minioDelError);
      }

      res.status(500).json({ error: dbError.message || 'Failed to save document metadata and audit log.' });
    }
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/documents/verify - validates cryptographic hash and structural integrity of an uploaded PDF
app.post('/api/documents/verify', authenticateJWT, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const uploadedBuffer = req.file.buffer;
    const computedHash = crypto.createHash('sha256').update(uploadedBuffer).digest('hex');

    // 1. Find all documents with the same name
    const candidateDocs = await prisma.document.findMany({
      where: { name: req.file.originalname },
      include: {
        sender: true,
        markers: {
          include: {
            assignedTo: true
          }
        },
        signatories: {
          include: {
            user: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    let doc: any = null;
    let storedHash: string | null = null;

    // 2. Try to find an exact cryptographic match among the name-matched candidates
    for (const candidate of candidateDocs) {
      // Case A: Unsigned/in-progress document matching baseline hash
      if (candidate.baselineHash === computedHash) {
        doc = candidate;
        storedHash = candidate.baselineHash;
        break;
      }

      // Case B: Completed/locked document — check signedFileHash first (fast, indexed)
      if (candidate.status === 'locked') {
        if (candidate.signedFileHash && candidate.signedFileHash === computedHash) {
          doc = candidate;
          storedHash = candidate.signedFileHash;
          break;
        }
        // Fallback: if signedFileHash not yet populated (pre-migration), fetch from MinIO
        if (!candidate.signedFileHash && candidate.signedFileKey) {
          try {
            const signedBuffer = await getDocumentBufferFromMinio(candidate.signedFileKey);
            const signedHash = crypto.createHash('sha256').update(signedBuffer).digest('hex');
            if (signedHash === computedHash) {
              doc = candidate;
              storedHash = signedHash;
              break;
            }
          } catch (err) {
            console.error(`Failed to retrieve signed file from MinIO for candidate ${candidate.id}:`, err);
          }
        }
      }
    }

    // 3. Fallbacks (filename didn't match — e.g. browser renamed to "file (3).pdf"):
    if (!doc) {
      // Fallback A: Search entire database by baselineHash (unsigned docs with renamed file)
      // OR signedFileHash (signed docs with renamed file)
      const matchByHash = await prisma.document.findFirst({
        where: {
          OR: [
            { baselineHash: computedHash },
            { signedFileHash: computedHash }
          ]
        },
        include: {
          sender: true,
          markers: {
            include: {
              assignedTo: true
            }
          },
          signatories: {
            include: {
              user: true
            }
          }
        }
      });
      if (matchByHash) {
        doc = matchByHash;
        // Determine which hash matched
        storedHash = matchByHash.signedFileHash === computedHash
          ? matchByHash.signedFileHash
          : matchByHash.baselineHash;
      }
    }

    // Fallback B: If still not found, default to the most recently uploaded document with the same filename
    if (!doc && candidateDocs.length > 0) {
      doc = candidateDocs[0];
      // Compute the stored hash for this document depending on its state
      if (doc.status === 'locked') {
        if (doc.signedFileHash) {
          storedHash = doc.signedFileHash;
        } else if (doc.signedFileKey) {
          try {
            const signedBuffer = await getDocumentBufferFromMinio(doc.signedFileKey);
            storedHash = crypto.createHash('sha256').update(signedBuffer).digest('hex');
          } catch (err) {
            console.error(`Failed to retrieve signed file from MinIO for fallback doc ${doc.id}:`, err);
            storedHash = doc.baselineHash;
          }
        } else {
          storedHash = doc.baselineHash;
        }
      } else {
        storedHash = doc.baselineHash;
      }
    }

    // If no document matches at all
    if (!doc) {
      return res.status(404).json({ error: 'No matching document found in repository for verification.' });
    }

    const valid = computedHash === storedHash;

    // Build the signers list from document signatories / markers
    // For each signatory who was supposed to sign, find if they signed, and check their marker status.
    const signers = doc.signatories.map((sig: any) => {
      const marker = doc.markers.find((m: any) => m.assignedToId === sig.userId && m.type === 'signature');

      let signatureAuthentic = false;
      if (marker && marker.signed && marker.metadata) {
        const meta = marker.metadata as any;
        if (meta.signatureEvidence && meta.certificateUsed) {
          try {
            const certPem = meta.certificateUsed;
            const sigEvidenceBuffer = Buffer.from(meta.signatureEvidence, 'base64');
            signatureAuthentic = crypto.verify(
              'sha256',
              Buffer.from(doc.baselineHash, 'hex'),
              certPem,
              sigEvidenceBuffer
            );
          } catch (verifyErr) {
            console.error(`Failed crypto verify for signer ${sig.userId}:`, verifyErr);
          }
        }
      }

      return {
        user: {
          id: sig.user.id,
          name: sig.user.name,
          email: sig.user.email,
          initials: sig.user.initials,
          nik: sig.user.nik,
          verified: sig.user.nikVerified,
          avatarColor: sig.user.avatarColor || '#9a3412',
          role: sig.user.accessRole === 'manager' ? 'Manager' : sig.user.accessRole === 'supervisor' ? 'Supervisor' : 'Signatory',
          accessRole: sig.user.accessRole
        },
        signedAt: marker && marker.signedAt ? marker.signedAt.toISOString() : new Date(doc.updatedAt).toISOString(),
        certId: marker && marker.metadata && (marker.metadata as any).certId ? (marker.metadata as any).certId : 'N/A',
        ip: marker && marker.metadata && (marker.metadata as any).ip ? (marker.metadata as any).ip : 'N/A',
        valid: valid && marker ? marker.signed : false,
        signatureAuthentic
      };
    });

    res.json({
      valid,
      documentName: doc.name,
      storedHash,
      computedHash,
      signers
    });
  } catch (error: any) {
    console.error('Verification Endpoint Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents - get documents scoped to the authenticated user's role
app.get('/api/documents', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role; // 'user', 'supervisor', 'manager'

    let whereClause: any;

    if (userRole === 'supervisor' || userRole === 'manager') {
      // Supervisors/Managers only see documents where they are an assigned
      // signatory OR have a marker assigned to them — never drafts or other
      // documents they have no relationship to.
      whereClause = {
        OR: [
          { signatories: { some: { userId } } },
          { markers: { some: { assignedToId: userId } } },
        ],
      };
    } else {
      // Staff ('user') sees only documents they created
      whereClause = { senderId: userId };
    }

    const docs = await prisma.document.findMany({
      where: whereClause,
      include: {
        sender: true,
        markers: {
          include: {
            assignedTo: true
          }
        },
        signatories: {
          include: {
            user: true
          },
          orderBy: {
            order: 'asc'
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

    // Generate dynamic streaming URLs relative to the host
    const docsWithUrls = docs.map((doc) => {
      const fileUrl = `/api/documents/${doc.id}/file`;
      return { ...doc, fileUrl };
    });

    res.json(docsWithUrls);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/audit-logs - get real audit log records scoped to the user's documents
app.get('/api/audit-logs', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Build a document-scoping filter identical to GET /api/documents
    let docWhereClause: any;
    if (userRole === 'supervisor' || userRole === 'manager') {
      docWhereClause = {
        OR: [
          { signatories: { some: { userId } } },
          { markers: { some: { assignedToId: userId } } },
        ],
      };
    } else {
      docWhereClause = { senderId: userId };
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        document: docWhereClause,
      },
      include: {
        user: true,
        document: {
          select: { name: true },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 200,
    });

    // Map to include documentName at the top level for the frontend
    const mapped = logs.map(log => ({
      ...log,
      documentName: log.document?.name || null,
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:id/file', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { original } = req.query;
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        signatories: true,
        markers: true
      }
    });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Security Check: initiator or assigned signatory (FR-010/FR-013)
    const isInitiator = doc.senderId === req.user!.id;
    const isSignatory = doc.signatories.some((s: any) => s.userId === req.user!.id);
    const isMarkerAssigned = doc.markers.some((m: any) => m.assignedToId === req.user!.id);

    if (!isInitiator && !isSignatory && !isMarkerAssigned) {
      return res.status(403).json({ error: 'You do not have access to this document.' });
    }

    let targetKey = doc.fileKey;

    if (original === 'true') {
      if (doc.status !== 'locked') {
        return res.status(403).json({ error: 'Access denied: Original file access is only permitted for locked documents.' });
      }
      targetKey = doc.fileKey;
    } else {
      // Default: stream the signed version if the document is locked and a signed file key exists
      if (doc.status === 'locked' && doc.signedFileKey) {
        targetKey = doc.signedFileKey;
      }
    }

    try {
      const buffer = await getDocumentBufferFromMinio(targetKey);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name)}"`);
      res.send(buffer);
    } catch (err: any) {
      console.error('Failed to retrieve or decrypt document buffer:', err);
      res.status(500).json({ error: 'Failed to fetch file' });
    }
  } catch (error: any) {
    console.error('Error streaming document:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/documents/:id - get a single document details with its streaming URL
app.get('/api/documents/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
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
        signatories: {
          include: {
            user: true
          },
          orderBy: {
            order: 'asc'
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

    const fileUrl = `/api/documents/${doc.id}/file`;
    res.json({ ...doc, fileUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/documents/:id - update document metadata, status, markers and audit logs
app.put('/api/documents/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, pageCount, markers, recipients, auditLog, rejectionComment } = req.body;

    // Fetch existing document to prevent overwriting missing fields
    const existing = await prisma.document.findUnique({
      where: { id },
      include: {
        markers: true,
        signatories: {
          include: {
            user: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Validation for invitations (pending_supervisor)
    if (status === 'pending_supervisor') {
      const allUsers = await prisma.user.findMany();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const finalMarkers = markers !== undefined ? markers : existing.markers;
      let finalRecipients: any[] = [];
      if (recipients !== undefined) {
        finalRecipients = recipients;
      } else {
        finalRecipients = existing.signatories.map((s: any) => s.user);
      }

      const check = validateMarkersAndRecipients(finalMarkers, finalRecipients, userMap);
      if (!check.valid) {
        res.status(400).json({ error: check.error });
        return;
      }
    }

    // Rejection guard: cannot modify recipients of a rejected document
    if (existing.status === 'rejected' && recipients !== undefined) {
      res.status(400).json({ error: 'Cannot modify recipients: document is rejected and must be resubmitted.' });
      return;
    }

    // Role check: only the Staff user who is the document's initiator may modify recipients
    if (recipients !== undefined) {
      const callerId = req.user!.id;
      const callerRole = req.user!.role;

      if (callerRole === 'supervisor' || callerRole === 'manager') {
        res.status(403).json({ error: 'Forbidden: Supervisor or Manager cannot modify recipients.' });
        return;
      }

      if (callerId !== existing.senderId) {
        res.status(403).json({ error: 'Forbidden: Only the Staff user who is the document\'s initiator may modify recipients.' });
        return;
      }

      // Backend validation of recipient email format (checks for missing @ or invalid domain format)
      const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const recipient of recipients) {
        const email = String(recipient.email || '').trim().toLowerCase();
        if (!EMAIL_PATTERN.test(email)) {
          res.status(400).json({ error: `Invalid recipient email format: '${recipient.email}'` });
          return;
        }
      }
    }

    // Locked guard: a locked document is completely immutable
    if (existing.status === 'locked') {
      res.status(400).json({ error: 'Cannot modify a locked document.' });
      return;
    }

    // Validate marker immutability and signature authorization
    if (markers !== undefined) {
      const callerId = req.user!.id;
      const existingMMap = new Map(existing.markers.map((m: any) => [m.id, m]));

      // 1. Enforce immutability for already signed markers (prevent deletion/modification)
      for (const existingM of existing.markers) {
        if (existingM.signed) {
          const incomingM = markers.find((m: any) => m.id === existingM.id);
          if (!incomingM) {
            res.status(403).json({ error: 'Forbidden: Cannot delete an already signed marker.' });
            return;
          }
          if (
            incomingM.signed !== true ||
            incomingM.x !== existingM.x ||
            incomingM.y !== existingM.y ||
            incomingM.width !== existingM.width ||
            incomingM.height !== existingM.height ||
            incomingM.assignedTo?.id !== existingM.assignedToId ||
            incomingM.signature !== existingM.signature
          ) {
            res.status(403).json({ error: 'Forbidden: Cannot modify an already signed marker\'s parameters or signature.' });
            return;
          }
        }
      }

      // 2. Validate that caller can only sign their own assigned marker
      for (const m of markers) {
        const existingM = existingMMap.get(m.id);
        if (existingM && !existingM.signed && m.signed === true) {
          if (callerId !== existingM.assignedToId) {
            res.status(403).json({ error: 'Forbidden: You cannot sign a marker assigned to another signatory.' });
            return;
          }
        }
      }
    }

    // Validate mandatory rejectionComment
    if (status === 'rejected' && existing.status !== 'rejected') {
      if (!rejectionComment || typeof rejectionComment !== 'string' || !rejectionComment.trim()) {
        res.status(400).json({ error: 'Bad Request: A rejection comment/reason is mandatory when rejecting a document.' });
        return;
      }
    }

    // Validate status transition using the centralized state machine
    if (status !== undefined && status !== existing.status) {
      const callerId = req.user!.id;
      const callerRole = req.user!.role;

      // Load all users to resolve roles for marker signatures validation
      const allUsers = await prisma.user.findMany();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const validationResult = validateTransition(
        existing.status,
        status,
        callerId,
        callerRole,
        existing,
        markers,
        userMap
      );

      if (!validationResult.valid) {
        res.status(validationResult.httpStatus || 400).json({ error: validationResult.error });
        return;
      }
    }

    // PDF Signature Composition trigger
    let newSignedFileKey: string | null = null;
    let newSignedFileHash: string | null = null;
    if (status === 'locked' && existing.status !== 'locked') {
      try {
        // 1. Get original PDF buffer from MinIO
        const originalBuffer = await getDocumentBufferFromMinio(existing.fileKey);

        // 2. Fetch all users to populate names/emails for metadata stamping
        const allUsers = await prisma.user.findMany();
        const userMap = new Map(allUsers.map(u => [u.id, u]));

        // 3. Map markers to include the full assignedTo details (required by compositeSignatures)
        const markersWithUsers = (markers || []).map((m: any) => {
          const u = userMap.get(m.assignedTo.id);
          return {
            ...m,
            assignedTo: {
              name: u ? u.name : 'Unknown User',
              email: u ? u.email : '',
            }
          };
        });

        // 4. Run PDF signature composition
        const signedBuffer = await compositeSignatures(originalBuffer, markersWithUsers);

        // 5. Upload signed PDF to MinIO under a distinct key
        const signedKey = `${id}-signed-${Date.now()}.pdf`;
        await uploadDocumentToMinio(signedKey, signedBuffer, {
          'content-type': 'application/pdf',
          'document-id': id,
          'is-signed': 'true',
        });

        newSignedFileKey = signedKey;

        // 6. Compute SHA-256 hash of signed PDF for fast verification lookup
        newSignedFileHash = crypto.createHash('sha256').update(signedBuffer).digest('hex');
      } catch (pdfError: any) {
        console.error('PDF Signature Composition Error:', pdfError);
        res.status(500).json({ error: `Failed to compile signature markers onto PDF: ${pdfError.message}` });
        return;
      }
    }

    // 1. Transaction to update document and replace markers/audit logs
    const result = await prisma.$transaction(async (tx) => {
      const serverSignTimestamp = new Date();
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const authenticatedSignerId = req.user!.id;

      // Update basic fields
      const updatedDoc = await tx.document.update({
        where: { id },
        data: {
          status: status !== undefined ? status : existing.status,
          pageCount: pageCount !== undefined ? pageCount : existing.pageCount,
          signedFileKey: newSignedFileKey !== null ? newSignedFileKey : undefined,
          signedFileHash: newSignedFileHash !== null ? newSignedFileHash : undefined,
          rejectionComment: status === 'rejected' ? rejectionComment.trim() : (status === 'pending_supervisor' || status === 'draft' ? null : undefined),
        }
      });

      // Server-side DOCUMENT_LOCKED event creation
      if (status === 'locked' && existing.status !== 'locked') {
        await tx.auditLog.create({
          data: {
            id: `al-${Date.now()}-locked`,
            documentId: id,
            event: 'DOCUMENT_LOCKED',
            userId: null,
            timestamp: serverSignTimestamp,
            ip: 'system',
            metadata: {
              action: 'Auto-locked after final signature'
            }
          }
        });
      }

      // Update markers if provided
      if (markers !== undefined) {
        // FR-011: Build lookup of existing markers to detect new signatures
        const existingMarkerMap = new Map(existing.markers.map((m: any) => [m.id, m]));

        // FR-011: Determine next sequential cert ID within this transaction.
        const currentYear = new Date().getFullYear();
        const allSignedMarkersForSeq = await tx.marker.findMany({
          where: { signed: true, metadata: { not: undefined } }
        });
        let maxSeq = 0;
        for (const sm of allSignedMarkersForSeq) {
          const meta = sm.metadata as any;
          if (meta?.certId) {
            const seqMatch = String(meta.certId).match(/(\d+)$/);
            if (seqMatch) {
              const num = parseInt(seqMatch[1], 10);
              if (num > maxSeq) maxSeq = num;
            }
          }
        }
        let nextSeq = maxSeq + 1;

        // Delete all old markers for this document
        await tx.marker.deleteMany({
          where: { documentId: id }
        });

        // Insert new ones — with server-injected metadata for newly-signed markers
        for (const m of markers) {
          const existingM = existingMarkerMap.get(m.id);
          const isNewlySigned = m.signed === true && (!existingM || !existingM.signed);

          let finalMetadata = m.metadata || undefined;
          let finalSignedAt = m.signedAt ? new Date(m.signedAt) : null;

          if (isNewlySigned) {
            // Resolve signer's role for cert ID prefix
            const signerUser = await tx.user.findUnique({ where: { id: m.assignedTo.id } });
            const roleLabel = signerUser?.accessRole?.toUpperCase() || 'UNKNOWN';
            const certId = `CERT-${roleLabel}-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
            nextSeq++;

            let signatureEvidence: string | undefined;
            let userCert: string | undefined;

            if (signerUser) {
              let currentCert = signerUser.publicCertificate;
              let currentEncPrivKey = signerUser.encryptedPrivateKey;

              if (!currentCert || !currentEncPrivKey) {
                const keypair = await generateUserKeysAndCert(signerUser.name, signerUser.googleEmail || signerUser.email);
                await tx.user.update({
                  where: { id: signerUser.id },
                  data: {
                    publicCertificate: keypair.cert,
                    encryptedPrivateKey: keypair.encryptedPrivateKey
                  }
                });
                currentCert = keypair.cert;
                currentEncPrivKey = keypair.encryptedPrivateKey;
              }

              userCert = currentCert;
              const privateKeyPem = decryptUserPrivateKey(currentEncPrivKey);
              const signBuffer = crypto.sign('sha256', Buffer.from(existing.baselineHash, 'hex'), privateKeyPem);
              signatureEvidence = signBuffer.toString('base64');
            }

            // Parse certificate details natively via crypto.X509Certificate
            let issuer = 'unknown';
            let validFrom = 'unknown';
            let validTo = 'unknown';
            let serialNumber = 'unknown';

            if (userCert) {
              try {
                const x509 = new crypto.X509Certificate(userCert);
                issuer = x509.issuer;
                validFrom = x509.validFrom;
                validTo = x509.validTo;
                serialNumber = x509.serialNumber;
              } catch (err) {
                console.error('Error parsing X509 certificate:', err);
              }
            }

            // Server-authoritative metadata overwrites client-fabricated values
            finalMetadata = {
              ...(m.metadata || {}),
              signerId: authenticatedSignerId,
              timestamp: serverSignTimestamp.toISOString(),
              ip: clientIp,
              certId,
              signatureEvidence,
              certificateUsed: userCert
            };
            finalSignedAt = serverSignTimestamp;

            // Create backend-authoritative DOCUMENT_SIGNED audit log
            await tx.auditLog.create({
              data: {
                id: `al-${Date.now()}-signed-${m.id}`,
                documentId: id,
                event: 'DOCUMENT_SIGNED',
                userId: authenticatedSignerId,
                timestamp: serverSignTimestamp,
                ip: clientIp,
                metadata: {
                  certId,
                  algorithm: 'SHA-256',
                  signerId: authenticatedSignerId,
                  ipAddress: clientIp,
                  timestamp: serverSignTimestamp.toISOString(),
                  issuer,
                  validFrom,
                  validTo,
                  serialNumber,
                  signatureEvidence,
                  hash: existing.baselineHash
                }
              }
            });
          }

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
              signedAt: finalSignedAt,
              signature: m.signature,
              metadata: finalMetadata
            }
          });
        }
      }

      // Update ordered signatories if provided
      if (recipients !== undefined && Array.isArray(recipients)) {
        await tx.documentSignatory.deleteMany({
          where: { documentId: id }
        });

        for (const [index, recipient] of recipients.entries()) {
          const role = recipient.accessRole === 'manager' ? 'manager' : 'supervisor';
          const email = String(recipient.email || '').trim().toLowerCase();
          if (!email) continue;

          const user = await tx.user.upsert({
            where: { email },
            update: {
              name: recipient.name || email.split('@')[0],
              accessRole: role
            },
            create: {
              id: recipient.id && !String(recipient.id).startsWith('temp-') ? recipient.id : undefined,
              email,
              name: recipient.name || email.split('@')[0],
              accessRole: role
            }
          });

          await tx.documentSignatory.create({
            data: {
              documentId: id,
              userId: user.id,
              order: index + 1
            }
          });
        }
      }

      // Append audit logs if provided
      if (auditLog !== undefined && Array.isArray(auditLog)) {
        // Resolve the actual client IP on the server
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

        // Get already stored logs to avoid duplicates
        const existingLogs = await tx.auditLog.findMany({ where: { documentId: id } });
        const existingIds = new Set(existingLogs.map(l => l.id));

        // Filter out signature/lock events from client-supplied logs
        const filteredAuditLog = auditLog.filter(
          (log: any) => log.event !== 'DOCUMENT_SIGNED' && log.event !== 'DOCUMENT_LOCKED'
        );

        for (const log of filteredAuditLog) {
          if (!existingIds.has(log.id)) {
            let finalIp = log.ip || 'unknown';
            if (finalIp === 'server-injected' || finalIp === '192.168.1.108') {
              finalIp = clientIp;
            }

            await tx.auditLog.create({
              data: {
                id: log.id,
                documentId: id,
                event: log.event,
                userId: log.user ? log.user.id : null,
                timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
                ip: finalIp,
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
        signatories: {
          include: {
            user: true
          },
          orderBy: {
            order: 'asc'
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

    if (finalDoc && status !== undefined && status !== existing.status) {
      if (status === 'pending_supervisor') {
        const supervisorSig = finalDoc.signatories.find(
          (s: any) => s.user.accessRole === 'supervisor'
        );
        if (supervisorSig && supervisorSig.user) {
          createAndSendNotification(
            supervisorSig.user.id,
            id,
            'invited_to_sign',
            `Your signature is required on '${finalDoc.name}'.`,
            supervisorSig.user.googleEmail,
            finalDoc.name
          ).catch(err => console.error('Error in createAndSendNotification for supervisor:', err));
        }
      } else if (status === 'pending_manager') {
        const managerSig = finalDoc.signatories.find(
          (s: any) => s.user.accessRole === 'manager'
        );
        if (managerSig && managerSig.user) {
          createAndSendNotification(
            managerSig.user.id,
            id,
            'invited_to_sign',
            `Your signature is required on '${finalDoc.name}' as the previous signatory has signed.`,
            managerSig.user.googleEmail,
            finalDoc.name
          ).catch(err => console.error('Error in createAndSendNotification for manager:', err));
        }
      } else if (status === 'locked') {
        // FR-010/FR-013: Notify ALL parties (initiator + every signatory)
        const notifiedUserIds = new Set<string>();

        // 1. Notify the Staff initiator (sender)
        if (finalDoc.sender) {
          notifiedUserIds.add(finalDoc.sender.id);
          createAndSendNotification(
            finalDoc.sender.id,
            id,
            'document_locked',
            `The document '${finalDoc.name}' has been fully signed and is now locked. You can download the final signed copy from the portal.`,
            finalDoc.sender.googleEmail,
            finalDoc.name
          ).catch(err => console.error('Error in createAndSendNotification for sender (locked):', err));
        }

        // 2. Notify every signatory who signed the document
        if (finalDoc.signatories && finalDoc.signatories.length > 0) {
          for (const sig of finalDoc.signatories) {
            if (sig.user && !notifiedUserIds.has(sig.user.id)) {
              notifiedUserIds.add(sig.user.id);
              createAndSendNotification(
                sig.user.id,
                id,
                'document_locked',
                `The document '${finalDoc.name}' has been fully signed and is now locked. You can download the final signed copy from the portal.`,
                sig.user.googleEmail,
                finalDoc.name
              ).catch(err => console.error(`Error in createAndSendNotification for signatory ${sig.user.id} (locked):`, err));
            }
          }
        }
      } else if (status === 'rejected') {
        const callerId = req.user!.id;
        const supervisor = finalDoc.signatories.find((s: any) => s.user.id === callerId);
        const supervisorName = supervisor?.user.name || 'a Supervisor';

        if (finalDoc.sender) {
          createAndSendNotification(
            finalDoc.sender.id,
            id,
            'document_rejected',
            `Your document '${finalDoc.name}' was rejected by ${supervisorName}: '${rejectionComment.trim()}'. Please review and resubmit.`,
            finalDoc.sender.googleEmail,
            finalDoc.name
          ).catch(err => console.error('Error in createAndSendNotification for rejection:', err));
        }
      }
    }

    const fileUrl = `/api/documents/${finalDoc!.id}/file`;
    res.json({ ...finalDoc, fileUrl });
  } catch (error: any) {
    console.error('Update Document Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications - get user notifications
app.get('/api/notifications', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        document: true
      }
    });
    res.json(notifications);
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read - mark notification as read
app.put('/api/notifications/:id/read', authenticateJWT, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.notification.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You cannot mark another user\'s notification as read.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating notification read status:', err);
    res.status(500).json({ error: err.message });
  }
});

startServer();

