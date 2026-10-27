import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { RequestWithUser } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function authorize(...allowedRoles: Role[]) {
  return (req: RequestWithUser, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before authorization.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden. Role '${req.user.role}' is not authorized to perform this operation. Required: [${allowedRoles.join(
            ', '
          )}]`
        )
      );
    }

    next();
  };
}
