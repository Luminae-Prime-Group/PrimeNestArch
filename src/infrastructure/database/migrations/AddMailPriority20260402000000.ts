import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMailPriority20260402000000 implements MigrationInterface {
  name = 'AddMailPriority20260402000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."mail_priority_enum" AS ENUM('high', 'normal', 'low')`,
    );
    await queryRunner.query(
      `ALTER TABLE "mail_audit_logs" ADD COLUMN "priority" "public"."mail_priority_enum" NOT NULL DEFAULT 'normal'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_mail_audit_priority_claim" ON "mail_audit_logs" ("priority", "status", "nextAttemptAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_mail_audit_priority_claim"`);
    await queryRunner.query(`ALTER TABLE "mail_audit_logs" DROP COLUMN "priority"`);
    await queryRunner.query(`DROP TYPE "public"."mail_priority_enum"`);
  }
}
