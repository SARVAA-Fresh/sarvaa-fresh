import { AuthGuard } from '@nestjs/passport';

export class AdminJwtGuard extends AuthGuard('admin-jwt') {
  canActivate(context: any) {
    return super.canActivate(context);
  }
}
