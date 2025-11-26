import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeleteToInstallationRequests1732604400000 implements MigrationInterface {
    name = 'AddCascadeDeleteToInstallationRequests1732604400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing foreign key constraints
        await queryRunner.query(`ALTER TABLE "installation_requests" DROP CONSTRAINT IF EXISTS "FK_8d8fa5048d619f59c17b7ad6b60"`);
        await queryRunner.query(`ALTER TABLE "installation_requests" DROP CONSTRAINT IF EXISTS "FK_bdcfff30cc893a356eb3f77ce80"`);
        await queryRunner.query(`ALTER TABLE "installation_requests" DROP CONSTRAINT IF EXISTS "FK_452b78df9a9745266730e81c375"`);
        
        // Add foreign key constraints with CASCADE delete
        await queryRunner.query(`ALTER TABLE "installation_requests" ADD CONSTRAINT "FK_8d8fa5048d619f59c17b7ad6b60" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "installation_requests" ADD CONSTRAINT "FK_bdcfff30cc893a356eb3f77ce80" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "installation_requests" ADD CONSTRAINT "FK_452b78df9a9745266730e81c375" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop CASCADE constraints
        await queryRunner.query(`ALTER TABLE "installation_requests" DROP CONSTRAINT "FK_452b78df9a9745266730e81c375"`);
        await queryRunner.query(`ALTER TABLE "installation_requests" DROP CONSTRAINT "FK_bdcfff30cc893a356eb3f77ce80"`);
        await queryRunner.query(`ALTER TABLE "installation_requests" DROP CONSTRAINT "FK_8d8fa5048d619f59c17b7ad6b60"`);
        
        // Restore original constraints without CASCADE
        await queryRunner.query(`ALTER TABLE "installation_requests" ADD CONSTRAINT "FK_8d8fa5048d619f59c17b7ad6b60" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "installation_requests" ADD CONSTRAINT "FK_bdcfff30cc893a356eb3f77ce80" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "installation_requests" ADD CONSTRAINT "FK_452b78df9a9745266730e81c375" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}
