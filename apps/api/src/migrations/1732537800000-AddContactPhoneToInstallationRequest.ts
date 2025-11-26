import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactPhoneToInstallationRequest1732537800000 implements MigrationInterface {
  name = 'AddContactPhoneToInstallationRequest1732537800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "installation_requests" 
      ADD COLUMN "contactPhone" varchar(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "installation_requests" 
      DROP COLUMN "contactPhone"
    `);
  }
}
