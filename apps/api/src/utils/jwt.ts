import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedUser } from '../types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  status: string;
  departmentId: string | null;
  firstName: string;
  lastName: string;
}

export function signToken(user: AuthenticatedUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    departmentId: user.departmentId,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
