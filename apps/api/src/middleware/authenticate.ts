import { Response, NextFunction } from 'express';
import { prisma } from '@dms/database';
import { RequestWithUser, UserStatus } from '../types';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { COOKIE_NAME } from '../config/constants';

export async function authenticate(req: RequestWithUser, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies[COOKIE_NAME]) {
      // Check HTTP-only cookie
      token = req.cookies[COOKIE_NAME];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No session or token provided.');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired authentication token.');
    }

    // Verify user in database to ensure account is still active and not deactivated/suspended
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('User account is currently inactive or suspended.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
