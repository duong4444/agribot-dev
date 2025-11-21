import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFarmsTables1763708468982 implements MigrationInterface {
    name = 'CreateFarmsTables1763708468982'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "crops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "technicalGuide" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_098dbeb7c803dc7c08a7f02b805" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."farm_activities_type_enum" AS ENUM('SEEDING', 'FERTILIZE', 'PESTICIDE', 'HARVEST', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "farm_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."farm_activities_type_enum" NOT NULL DEFAULT 'OTHER', "date" TIMESTAMP NOT NULL, "description" text, "cost" numeric(10,2) NOT NULL DEFAULT '0', "revenue" numeric(10,2) NOT NULL DEFAULT '0', "farmId" uuid NOT NULL, "areaId" uuid, "cropId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_89a685b0ac6b2d130cd43e98270" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "farms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "address" character varying, "description" text, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_39f1ebfd7501e560552cff6760" UNIQUE ("userId"), CONSTRAINT "PK_39aff9c35006b14025bba5a43d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "areas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" character varying, "description" text, "farmId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5110493f6342f34c978c084d0d6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "farm_activities" ADD CONSTRAINT "FK_99032ffa9946108ec2a1277d68b" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "farm_activities" ADD CONSTRAINT "FK_677cc77d7c82ec895747c01993b" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "farm_activities" ADD CONSTRAINT "FK_5df03134b75a26c469c51175cd9" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "farms" ADD CONSTRAINT "FK_39f1ebfd7501e560552cff6760a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "areas" ADD CONSTRAINT "FK_7c8696e384b0ad46cc009b276f1" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT "FK_7c8696e384b0ad46cc009b276f1"`);
        await queryRunner.query(`ALTER TABLE "farms" DROP CONSTRAINT "FK_39f1ebfd7501e560552cff6760a"`);
        await queryRunner.query(`ALTER TABLE "farm_activities" DROP CONSTRAINT "FK_5df03134b75a26c469c51175cd9"`);
        await queryRunner.query(`ALTER TABLE "farm_activities" DROP CONSTRAINT "FK_677cc77d7c82ec895747c01993b"`);
        await queryRunner.query(`ALTER TABLE "farm_activities" DROP CONSTRAINT "FK_99032ffa9946108ec2a1277d68b"`);
        await queryRunner.query(`DROP TABLE "areas"`);
        await queryRunner.query(`DROP TABLE "farms"`);
        await queryRunner.query(`DROP TABLE "farm_activities"`);
        await queryRunner.query(`DROP TYPE "public"."farm_activities_type_enum"`);
        await queryRunner.query(`DROP TABLE "crops"`);
    }

}
