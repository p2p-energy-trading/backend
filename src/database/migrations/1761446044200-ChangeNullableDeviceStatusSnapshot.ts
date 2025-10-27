import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeNullableDeviceStatusSnapshot1761446044200
  implements MigrationInterface
{
  name = 'ChangeNullableDeviceStatusSnapshot1761446044200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ALTER COLUMN "component_status" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ALTER COLUMN "component_status" DROP NOT NULL`,
    );
  }
}
