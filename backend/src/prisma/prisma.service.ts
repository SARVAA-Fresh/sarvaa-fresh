import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'error' | 'warn'
  >
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const logConfig: Prisma.PrismaClientOptions['log'] = [
      ...(isProduction ? [] : [{ emit: 'event' as const, level: 'query' as const }]),
      { emit: 'event' as const, level: 'error' as const },
      { emit: 'event' as const, level: 'warn' as const },
    ];

    super({
      log: logConfig,
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Database connected successfully');

    if (process.env.NODE_ENV !== 'production') {
      this.$on('query', (event: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${event.query} — ${event.duration}ms`);
      });
    }

    this.$on('error', (event: Prisma.LogEvent) => {
      this.logger.error(`Prisma error: ${event.message}`);
    });

    this.$on('warn', (event: Prisma.LogEvent) => {
      this.logger.warn(`Prisma warning: ${event.message}`);
    });
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
