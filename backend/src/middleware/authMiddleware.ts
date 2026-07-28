import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the environment variables. Refusing to start with an insecure default.');
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export async function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required: missing Authorization header.' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Authentication required: invalid Authorization header format. Expected Bearer <token>.' });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: string; role?: string; mfaPending?: boolean; nikPending?: boolean };
    if (decoded.mfaPending) {
      res.status(403).json({ error: 'Access denied: MFA verification pending.' });
      return;
    }
    if (decoded.nikPending) {
      res.status(403).json({ error: 'Access denied: NIK verification pending.' });
      return;
    }

    // Always fetch fresh user role from Database so role changes take effect immediately on next request
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, accessRole: true }
    });

    if (!dbUser) {
      res.status(401).json({ error: 'Authentication failed: User account no longer exists.' });
      return;
    }

    req.user = {
      id: dbUser.id,
      role: dbUser.accessRole,
    };
    next();
  } catch (error: any) {
    console.error('JWT Verification Error:', error);
    res.status(403).json({ error: 'Access denied: invalid or expired token.' });
  }
}
