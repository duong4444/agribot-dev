import { MigrationInterface, QueryRunner } from "typeorm";

export class IncreaseCostRevenuePrecision1732285000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "farm_activities" 
            ALTER COLUMN "cost" TYPE DECIMAL(15, 2)
        `);
        
        await queryRunner.query(`
            ALTER TABLE "farm_activities" 
            ALTER COLUMN "revenue" TYPE DECIMAL(15, 2)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "farm_activities" 
            ALTER COLUMN "cost" TYPE DECIMAL(10, 2)
        `);
        
        await queryRunner.query(`
            ALTER TABLE "farm_activities" 
            ALTER COLUMN "revenue" TYPE DECIMAL(10, 2)
        `);
    }
}
