import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailAuditLogEntity, MailAuditStatus } from '../entities/mail-audit-log.entity';
import {
  MailRetryInvalidStatusException,
} from '../../../shared/exceptions';

/**
 * Manages mail retry/requeue operations.
 * Single responsibility: Handle state transitions for retry operations.
 */
@Injectable()
export class MailRetryService {
  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
  ) {}

  /**
   * Moves a failed mail back to pending state for retry
   * @throws {MailRetryInvalidStatusException} if mail is not in FAILED status
   */
  async requeue(id: string): Promise<MailAuditLogEntity> {
    const entity = await this.repo.findOneOrFail({ where: { id } });

    if (entity.status !== MailAuditStatus.FAILED) {
      throw new MailRetryInvalidStatusException(id, entity.status);
    }

    await this.repo.update(id, {
      status: MailAuditStatus.PENDING,
      maxAttempts: entity.attempts + 1,
      nextAttemptAt: new Date(),
      lockedAt: null,
      processingNode: null,
      lastError: null,
    });

    return this.repo.findOneOrFail({ where: { id } });
  }
}
