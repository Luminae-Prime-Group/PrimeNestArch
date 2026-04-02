import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { hostname } from 'node:os';
import { MailAuditLogEntity, MailAuditStatus } from '../entities/mail-audit-log.entity';
import { MAIL_CONSTANTS } from '../../../shared/constants';

/**
 * Handles claiming pending mail jobs for processing.
 * Uses database-level locking (pessimistic locking) to ensure
 * safe concurrent processing across multiple workers.
 */
@Injectable()
export class MailJobClaimService {
  private readonly logger = new Logger(MailJobClaimService.name);
  private readonly nodeName = hostname();

  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Claims a batch of pending jobs for processing.
   * Uses SELECT FOR UPDATE SKIP LOCKED for safe concurrent processing.
   * Jobs are ordered by priority (high -> low) and retry time.
   */
  async claimPending(batchSize: number): Promise<MailAuditLogEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const candidates = await this.fetchCandidates(queryRunner, batchSize);

      if (candidates.length === 0) {
        await queryRunner.rollbackTransaction();
        return [];
      }

      await this.markAsClaimed(queryRunner, candidates);
      await queryRunner.commitTransaction();

      this.updateLocalState(candidates);
      return candidates;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async fetchCandidates(queryRunner: any, batchSize: number) {
    return queryRunner.manager
      .createQueryBuilder(MailAuditLogEntity, 'audit')
      .where('audit.status = :status', { status: MailAuditStatus.PENDING })
      .andWhere(
        '(audit.nextAttemptAt IS NULL OR audit.nextAttemptAt <= :now)',
        { now: new Date() },
      )
      .orderBy(
        "CASE audit.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END",
        'ASC',
      )
      .addOrderBy('audit.nextAttemptAt', 'ASC')
      .take(batchSize)
      .setLock(MAIL_CONSTANTS.BATCH_PROCESSING.CLAIM_LOCK_TYPE)
      .getMany();
  }

  private async markAsClaimed(
    queryRunner: any,
    candidates: MailAuditLogEntity[],
  ) {
    const ids = candidates.map((c) => c.id);
    await queryRunner.manager
      .createQueryBuilder()
      .update(MailAuditLogEntity)
      .set({
        status: MailAuditStatus.PROCESSING,
        lockedAt: new Date(),
        processingNode: this.nodeName,
      })
      .where('id IN (:...ids)', { ids })
      .execute();
  }

  private updateLocalState(candidates: MailAuditLogEntity[]) {
    const now = new Date();
    for (const candidate of candidates) {
      candidate.status = MailAuditStatus.PROCESSING;
      candidate.lockedAt = now;
      candidate.processingNode = this.nodeName;
    }
  }
}
