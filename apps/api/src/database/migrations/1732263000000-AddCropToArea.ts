import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCropToArea1732263000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "areas" 
      ADD COLUMN "crop" VARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "areas" 
      DROP COLUMN "crop"
    `);
  }
}
