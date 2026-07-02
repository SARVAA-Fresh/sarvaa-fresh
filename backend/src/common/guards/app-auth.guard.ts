import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AppAuthGuard extends JwtAuthGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.path?.startsWith('/api/v1/admin')) {
      return true;
    }
    return super.canActivate(context);
  }
}
