import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCropNameToFarmActivity1732261000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farm_activities" 
      ADD COLUMN "cropName" VARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farm_activities" 
      DROP COLUMN "cropName"
    `);
  }
}
