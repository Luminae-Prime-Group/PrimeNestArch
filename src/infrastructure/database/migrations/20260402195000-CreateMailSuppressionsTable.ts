import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMailSuppressionsTable20260402195000 implements MigrationInterface {
  name = 'CreateMailSuppressionsTable20260402195000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'mail_suppressions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'email', type: 'varchar', length: '320', isNullable: false },
          { name: 'source', type: 'varchar', length: '120', isNullable: false, default: "'manual'" },
          { name: 'reason', type: 'varchar', length: '255', isNullable: true },
          { name: 'active', type: 'boolean', isNullable: false, default: 'true' },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'mail_suppressions',
      new TableIndex({
        name: 'idx_mail_suppression_email_unique',
        columnNames: ['email'],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('mail_suppressions', 'idx_mail_suppression_email_unique');
    await queryRunner.dropTable('mail_suppressions');
  }
}