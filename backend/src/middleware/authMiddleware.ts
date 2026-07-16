import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not defined in the environment variables. Refusing to start with an insecure default.`);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string; mfaPending?: boolean; nikPending?: boolean };
    if (decoded.mfaPending) {
      res.status(403).json({ error: 'Access denied: MFA verification pending.' });
      return;
    }
    if (decoded.nikPending) {
      res.status(403).json({ error: 'Access denied: NIK verification pending.' });
      return;
    }
    req.user = {
      id: decoded.userId,
      role: decoded.role || '',
    };
    next();
  } catch (error: any) {
    console.error('JWT Verification Error:', error);
    res.status(403).json({ error: 'Access denied: invalid or expired token.' });
  }
}
