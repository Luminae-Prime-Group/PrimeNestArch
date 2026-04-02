import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailAuditLogEntity } from '../entities/mail-audit-log.entity';
import { MAIL_CONSTANTS } from '../../../shared/constants';

/**
 * Manages mail idempotency using cache and database fallback.
 * Ensures that duplicate requests with same idempotency key return existing mail record.
 */
@Injectable()
export class MailIdempotencyService {
  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Finds existing mail by idempotency key if it exists.
   * Checks cache first for performance, then database.
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<MailAuditLogEntity | null> {
    const cachedId = await this.cacheManager.get<string>(
      this.buildCacheKey(idempotencyKey),
    );

    if (cachedId) {
      const existing = await this.repo.findOne({ where: { id: cachedId } });
      if (existing) {
        return existing;
      }
    }

    return this.repo.findOne({ where: { idempotencyKey } });
  }

  /**
   * Caches idempotency key for quick future lookups
   */
  async cacheMail(idempotencyKey: string, mailId: string): Promise<void> {
    const ttlSec = this.configService.get(
      'mail.idempotencyTtlSec',
      MAIL_CONSTANTS.DEFAULTS.IDEMPOTENCY_TTL_SEC,
    );
    await this.cacheManager.set(this.buildCacheKey(idempotencyKey), mailId, ttlSec);
  }

  private buildCacheKey(idempotencyKey: string): string {
    return `${MAIL_CONSTANTS.CACHE_KEYS.IDEMPOTENCY_PREFIX}${idempotencyKey}`;
  }
}
