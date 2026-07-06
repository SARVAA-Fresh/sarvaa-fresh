import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminJwtGuard } from './admin-jwt.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AppAuthGuard extends JwtAuthGuard {
  constructor(private readonly appReflector: Reflector) {
    super(appReflector);
  }

  canActivate(context: ExecutionContext) {
    // 1. Public routes stay public.
    const isPublic = this.appReflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. Yield to the explicit admin guard when it is attached to the
    //    handler or controller. This prevents the global customer guard
    //    from rejecting a valid admin JWT before the admin guard runs.
    const guards = this.appReflector.getAllAndMerge<any[]>(GUARDS_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (guards?.some((guard) => guard === AdminJwtGuard)) {
      return true;
    }

    // 3. Otherwise enforce the normal customer JWT.
    return super.canActivate(context);
  }
}
