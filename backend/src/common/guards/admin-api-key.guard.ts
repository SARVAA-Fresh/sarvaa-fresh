import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const validKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!apiKey || apiKey !== validKey) {
      throw new ForbiddenException(
        'Invalid or missing admin API key. Pass x-api-key header.',
      );
    }

    return true;
  }
}
