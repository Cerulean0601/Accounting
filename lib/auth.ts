import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const auth = {
  hashPassword: (password: string) => bcrypt.hash(password, 12),
  
  verifyPassword: (password: string, hash: string) => bcrypt.compare(password, hash),
  
  generateToken: (userId: string) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' }),
  
  verifyToken: (token: string) => {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return null;
    }
  },
  
  getUserFromRequest: (request: NextRequest) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;
    return auth.verifyToken(token);
  }
};
