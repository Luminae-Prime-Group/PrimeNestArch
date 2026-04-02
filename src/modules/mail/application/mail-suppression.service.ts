import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailSuppressionEntity } from '../entities/mail-suppression.entity';

@Injectable()
export class MailSuppressionService {
  constructor(
    @InjectRepository(MailSuppressionEntity)
    private readonly suppressionRepo: Repository<MailSuppressionEntity>,
  ) {}

  async ensureRecipientsAreAllowed(recipients: string[]): Promise<void> {
    if (recipients.length === 0) {
      return;
    }

    const normalized = recipients.map((email) => email.toLowerCase());
    const blocked = await this.suppressionRepo
      .createQueryBuilder('s')
      .where('LOWER(s.email) IN (:...emails)', { emails: normalized })
      .andWhere('s.active = true')
      .getMany();

    if (blocked.length > 0) {
      const blockedEmails = blocked.map((entry) => entry.email).join(', ');
      throw new BadRequestException(`Recipient is suppressed/unsubscribed: ${blockedEmails}`);
    }
  }

  async suppress(email: string, reason?: string, source = 'manual'): Promise<MailSuppressionEntity> {
    const normalized = email.toLowerCase();
    const existing = await this.suppressionRepo
      .createQueryBuilder('s')
      .where('LOWER(s.email) = :email', { email: normalized })
      .getOne();

    if (existing) {
      existing.active = true;
      existing.reason = reason ?? existing.reason ?? null;
      existing.source = source;
      return this.suppressionRepo.save(existing);
    }

    return this.suppressionRepo.save(
      this.suppressionRepo.create({
        email: normalized,
        reason: reason ?? null,
        source,
        active: true,
      }),
    );
  }

  async unsuppress(email: string): Promise<{ updated: boolean }> {
    const normalized = email.toLowerCase();
    const existing = await this.suppressionRepo
      .createQueryBuilder('s')
      .where('LOWER(s.email) = :email', { email: normalized })
      .getOne();

    if (!existing) {
      return { updated: false };
    }

    existing.active = false;
    await this.suppressionRepo.save(existing);
    return { updated: true };
  }

  async listActive(limit = 100): Promise<MailSuppressionEntity[]> {
    return this.suppressionRepo.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }
}