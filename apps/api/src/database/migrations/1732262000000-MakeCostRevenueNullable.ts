import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCostRevenueNullable1732262000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farm_activities" 
      ALTER COLUMN "cost" DROP NOT NULL,
      ALTER COLUMN "revenue" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "farm_activities" 
      ALTER COLUMN "cost" SET NOT NULL,
      ALTER COLUMN "revenue" SET NOT NULL
    `);
  }
}
