import { prisma, UserStatus } from '@dms/database';
import { verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';
import { LoginInput } from '../schemas/auth.schema';
import { auditService } from './auditService';

export class AuthService {
  async login(input: LoginInput, meta?: { ip?: string; userAgent?: string }) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        department: true,
        studentProfile: true,
        facultyProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password combination.');
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password combination.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError(
        `Account access denied. Your account status is currently '${user.status}'. Please contact department administration.`
      );
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      departmentId: user.departmentId,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    await auditService.log({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      afterState: { role: user.role, email: user.email },
    });

    // Strip password hash from returned data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userProfile } = user;

    return {
      token,
      user: userProfile,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        studentProfile: true,
        facultyProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userProfile } = user;
    return userProfile;
  }
}

export const authService = new AuthService();
