import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropBlockchainApprovals1761477020000
  implements MigrationInterface
{
  name = 'DropBlockchainApprovals1761477020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop blockchain_approvals table (not used in the application)
    await queryRunner.query(
      `DROP TABLE IF EXISTS "blockchain_approvals" CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate blockchain_approvals table if needed
    await queryRunner.query(`
      CREATE TABLE "blockchain_approvals" (
        "approval_id" SERIAL NOT NULL,
        "prosumer_id" character varying NOT NULL,
        "wallet_address" character varying NOT NULL,
        "spender_contract_address" character varying NOT NULL,
        "token_contract_address" character varying NOT NULL,
        "approved_amount" numeric NOT NULL,
        "approval_tx_hash" character varying,
        "status" character varying NOT NULL,
        "expires_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL,
        "confirmed_at" TIMESTAMP,
        CONSTRAINT "PK_741485728924b6437cf6490774b" PRIMARY KEY ("approval_id")
      )
    `);

    // Recreate foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "blockchain_approvals"
      ADD CONSTRAINT "FK_8bd45445a1df1944c08307c53b5"
      FOREIGN KEY ("prosumer_id")
      REFERENCES "prosumers"("prosumer_id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "blockchain_approvals"
      ADD CONSTRAINT "FK_d8746984188b206031ef424c3a1"
      FOREIGN KEY ("wallet_address")
      REFERENCES "wallets"("wallet_address")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
  }
}
