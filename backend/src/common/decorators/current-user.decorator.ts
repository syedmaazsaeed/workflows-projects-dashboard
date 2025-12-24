import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../modules/auth/entities/user.entity';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext): CurrentUserPayload | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (data) {
      return user[data];
    }

    return user;
  },
);

