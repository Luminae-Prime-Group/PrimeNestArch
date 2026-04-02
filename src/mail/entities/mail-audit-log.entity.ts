import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MailAuditStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity({ name: 'mail_audit_logs' })
@Index('idx_mail_audit_status_next_attempt', ['status', 'nextAttemptAt'])
@Index('idx_mail_audit_correlation_id', ['correlationId'])
export class MailAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  correlationId?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  idempotencyKey?: string | null;

  @Column({ type: 'enum', enum: MailAuditStatus, default: MailAuditStatus.PENDING })
  status!: MailAuditStatus;

  @Column({ type: 'simple-json' })
  toRecipients!: string[];

  @Column({ type: 'simple-json', nullable: true })
  ccRecipients?: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  bccRecipients?: string[] | null;

  @Column({ type: 'varchar', length: 320 })
  fromAddress!: string;

  @Column({ type: 'varchar', length: 998 })
  subject!: string;

  @Column({ type: 'text', nullable: true })
  textBody?: string | null;

  @Column({ type: 'text', nullable: true })
  htmlBody?: string | null;

  @Column({ type: 'simple-json', nullable: true })
  attachments?: Array<{ filename: string; contentType?: string }> | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, string | number | boolean> | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  replyTo?: string | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextAttemptAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt?: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  processingNode?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerMessageId?: string | null;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  failedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
