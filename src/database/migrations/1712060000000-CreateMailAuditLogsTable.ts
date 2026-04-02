import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMailAuditLogsTable1712060000000 implements MigrationInterface {
  name = 'CreateMailAuditLogsTable1712060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "public"."mail_audit_logs_status_enum" AS ENUM('pending', 'processing', 'sent', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE "mail_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "correlationId" character varying(100),
        "idempotencyKey" character varying(120),
        "status" "public"."mail_audit_logs_status_enum" NOT NULL DEFAULT 'pending',
        "toRecipients" text NOT NULL,
        "ccRecipients" text,
        "bccRecipients" text,
        "fromAddress" character varying(320) NOT NULL,
        "subject" character varying(998) NOT NULL,
        "textBody" text,
        "htmlBody" text,
        "attachments" text,
        "metadata" text,
        "replyTo" character varying(320),
        "attempts" integer NOT NULL DEFAULT '0',
        "maxAttempts" integer NOT NULL DEFAULT '3',
        "nextAttemptAt" TIMESTAMP WITH TIME ZONE,
        "lockedAt" TIMESTAMP WITH TIME ZONE,
        "processingNode" character varying(128),
        "providerMessageId" character varying(255),
        "lastError" text,
        "sentAt" TIMESTAMP WITH TIME ZONE,
        "failedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mail_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mail_audit_logs_idempotencyKey" UNIQUE ("idempotencyKey")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_mail_audit_status_next_attempt" ON "mail_audit_logs" ("status", "nextAttemptAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_mail_audit_correlation_id" ON "mail_audit_logs" ("correlationId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_mail_audit_correlation_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_mail_audit_status_next_attempt"`);
    await queryRunner.query(`DROP TABLE "mail_audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."mail_audit_logs_status_enum"`);
  }
}
