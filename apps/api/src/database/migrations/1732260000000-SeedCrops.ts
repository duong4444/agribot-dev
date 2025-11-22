import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCrops1732260000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO crops (id, name, description, "createdAt", "updatedAt") VALUES
      (gen_random_uuid(), 'Cam sành', 'Cây ăn quả họ cam quýt, được trồng phổ biến ở miền Nam Việt Nam', NOW(), NOW()),
      (gen_random_uuid(), 'Lúa ST25', 'Giống lúa thơm đặc sản, đoạt giải lúa gạo ngon nhất thế giới năm 2019', NOW(), NOW()),
      (gen_random_uuid(), 'Xoài cát chu', 'Giống xoài nổi tiếng tại Đồng Tháp, có hương vị thơm ngọt', NOW(), NOW()),
      (gen_random_uuid(), 'Bưởi da xanh', 'Đặc sản miền Tây, thịt quả ngọt, ít chua', NOW(), NOW()),
      (gen_random_uuid(), 'Chanh không hạt', 'Cây gia vị phổ biến, dùng trong nấu ăn và làm đồ uống', NOW(), NOW()),
      (gen_random_uuid(), 'Cà phê robusta', 'Cây công nghiệp chủ lực tại Tây Nguyên', NOW(), NOW()),
      (gen_random_uuid(), 'Tiêu đen', 'Cây gia vị có giá trị kinh tế cao', NOW(), NOW()),
      (gen_random_uuid(), 'Sầu riêng Ri6', 'Giống sầu riêng cao cấp, thịt dày, béo, ít xơ', NOW(), NOW()),
      (gen_random_uuid(), 'Thanh long ruột đỏ', 'Trái cây ăn tươi, xuất khẩu nhiều', NOW(), NOW()),
      (gen_random_uuid(), 'Măng cụt', 'Trái cây quý, được mệnh danh là nữ hoàng trái cây', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM crops WHERE name IN (
        'Cam sành', 'Lúa ST25', 'Xoài cát chu', 'Bưởi da xanh', 'Chanh không hạt',
        'Cà phê robusta', 'Tiêu đen', 'Sầu riêng Ri6', 'Thanh long ruột đỏ', 'Măng cụt'
      );
    `);
  }
}
