import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import {
  MailRateLimitExceededException,
} from '../../../shared/exceptions';
import type { MailDispatchOptions } from '../mail.types';
import { MAIL_CONSTANTS } from '../../../shared/constants';

/**
 * Enforces rate limiting on mail sends per recipient.
 * Uses sliding window counter pattern with cache.
 */
@Injectable()
export class MailRateLimitService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Checks and enforces rate limit for all recipients in dispatch options.
   * Increments counter for each recipient.
   * @throws {MailRateLimitExceededException} if any recipient exceeds limit
   */
  async enforceLimit(options: MailDispatchOptions, recipients: string[]): Promise<void> {
    const isEnabled = this.configService.get('mail.rateLimitEnabled', false);
    if (!isEnabled) {
      return;
    }

    const windowSec = this.configService.get(
      'mail.rateLimitWindowSec',
      MAIL_CONSTANTS.DEFAULTS.RATE_LIMIT_WINDOW_SEC,
    );
    const maxPerWindow = this.configService.get(
      'mail.rateLimitMax',
      MAIL_CONSTANTS.DEFAULTS.RATE_LIMIT_MAX,
    );

    for (const recipient of recipients) {
      await this.checkAndIncrementRecipientCounter(
        recipient,
        maxPerWindow,
        windowSec,
      );
    }
  }

  private async checkAndIncrementRecipientCounter(
    recipient: string,
    maxPerWindow: number,
    windowSec: number,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(recipient);
    const currentCount = (await this.cacheManager.get<number>(cacheKey)) ?? 0;

    if (currentCount >= maxPerWindow) {
      throw new MailRateLimitExceededException(recipient, currentCount, windowSec);
    }

    await this.cacheManager.set(cacheKey, currentCount + 1, windowSec);
  }

  private buildCacheKey(recipient: string): string {
    return `${MAIL_CONSTANTS.CACHE_KEYS.RATE_LIMIT_PREFIX}${recipient}`;
  }
}
