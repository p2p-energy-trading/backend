import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelemetryData1761445648576 implements MigrationInterface {
  name = 'AddTelemetryData1761445648576';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP CONSTRAINT "fk_detailed_reading_meter"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP CONSTRAINT "fk_mqtt_meter"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP CONSTRAINT "fk_order_log"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP CONSTRAINT "fk_meter_settlement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP CONSTRAINT "fk_command_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP CONSTRAINT "fk_command_meter"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "fk_buyer_wallet"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "fk_buyer_prosumer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "fk_prosumer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" DROP CONSTRAINT "fk_blacklist_prosumer"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_trade_orders_pair_type_price"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_trade_orders_prosumer_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_trade_orders_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_trade_orders_wallet_address"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_transaction_logs_blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_transaction_logs_prosumer_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_transaction_logs_timestamp"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_transaction_logs_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_energy_settlements_meter_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_smart_meters_prosumer_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_device_commands_meter"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_device_commands_sent_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_device_commands_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_device_commands_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_idrs_conversions_prosumer"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_idrs_conversions_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_idrs_conversions_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_market_trades_buyer"`);
    await queryRunner.query(`DROP INDEX "public"."idx_market_trades_seller"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_market_trades_timestamp"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_wallets_prosumer_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_token_blacklist_active"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_token_blacklist_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_token_blacklist_expires"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_token_blacklist_prosumer"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_token_blacklist_token_hash"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_token_blacklist_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_token_blacklist_unique_token"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_token_blacklist_unique_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP CONSTRAINT "chk_settlement_interval"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP CONSTRAINT "chk_conversion_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP CONSTRAINT "chk_positive_amounts"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "chk_positive_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "chk_positive_trade_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP CONSTRAINT "chk_valid_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "chk_wallet_address_format"`,
    );
    await queryRunner.query(
      `CREATE TABLE "blockchain_approvals" ("approval_id" SERIAL NOT NULL, "prosumer_id" character varying NOT NULL, "wallet_address" character varying NOT NULL, "spender_contract_address" character varying NOT NULL, "token_contract_address" character varying NOT NULL, "approved_amount" numeric NOT NULL, "approval_tx_hash" character varying, "status" character varying NOT NULL, "expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL, "confirmed_at" TIMESTAMP, CONSTRAINT "PK_741485728924b6437cf6490774b" PRIMARY KEY ("approval_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "telemetry_data" ("id" SERIAL NOT NULL, "meterId" character varying NOT NULL, "datetime" TIMESTAMP NOT NULL, "data" jsonb NOT NULL, CONSTRAINT "PK_5869a8f8f281ae50220a1ffdb51" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP CONSTRAINT "device_status_snapshots_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "snapshot_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "snapshot_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD CONSTRAINT "PK_353279ff96832987de5c70e7a40" PRIMARY KEY ("snapshot_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "meter_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "timestamp" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "wifi_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "wifi_status" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "mqtt_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "mqtt_status" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "grid_mode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "grid_mode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "system_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "system_status" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "component_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "component_status" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "raw_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "raw_payload" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "reading_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "reading_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD CONSTRAINT "PK_184bdff2c99b8959c59d5f92daa" PRIMARY KEY ("reading_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "meter_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "timestamp" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "subsystem"`,
    );
    await queryRunner.query(`DROP TYPE "public"."device_subsystem_enum"`);
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "subsystem" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "daily_energy_wh" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "total_energy_wh" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "settlement_energy_wh" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "current_power_w" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "voltage" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "current_amp" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "subsystem_data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "subsystem_data" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "raw_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "raw_payload" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "log_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "log_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD CONSTRAINT "PK_592bdc31f112b04b16832a8c6ef" PRIMARY KEY ("log_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "meter_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "topic_type"`,
    );
    await queryRunner.query(`DROP TYPE "public"."mqtt_topic_enum"`);
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "topic_type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "direction"`,
    );
    await queryRunner.query(`DROP TYPE "public"."mqtt_direction_enum"`);
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "direction" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "mqtt_topic"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "mqtt_topic" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "payload" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "raw_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "raw_message" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "message_timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "message_timestamp" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "processed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "processed_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "processing_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "processing_status" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "error_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "error_message" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "correlation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "correlation_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP CONSTRAINT "trade_orders_cache_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "order_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD CONSTRAINT "PK_e6377a342a2a931eb4fb13e6df3" PRIMARY KEY ("order_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "prosumer_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "wallet_address" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "order_type"`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "order_type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "pair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "pair" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ALTER COLUMN "amount_etk" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ALTER COLUMN "price_idrs_per_etk" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ALTER COLUMN "total_idrs_value" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "status_on_chain"`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "status_on_chain" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "created_at_on_chain"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "created_at_on_chain" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "updated_at_cache"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "updated_at_cache" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "blockchain_tx_hash_placed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "blockchain_tx_hash_placed" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "blockchain_tx_hash_filled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "blockchain_tx_hash_filled" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "blockchain_tx_hash_cancelled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "blockchain_tx_hash_cancelled" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP CONSTRAINT "transaction_logs_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "log_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "log_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD CONSTRAINT "PK_77d7e09163aa1e895fc3c89546b" PRIMARY KEY ("log_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "prosumer_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "related_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "related_order_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "related_settlement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "related_settlement_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "transaction_type"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transaction_log_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "transaction_type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ALTER COLUMN "amount_primary" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "currency_primary"`,
    );
    // await queryRunner.query(`DROP TYPE "public"."currency_enum"`);
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "currency_primary" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ALTER COLUMN "amount_secondary" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "currency_secondary"`,
    );
    await queryRunner.query(`DROP TYPE "public"."currency_enum"`);
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "currency_secondary" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "blockchain_tx_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "transaction_timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "transaction_timestamp" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP CONSTRAINT "energy_settlements_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "settlement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "settlement_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD CONSTRAINT "PK_8b9a77f8528eecedcca0002af19" PRIMARY KEY ("settlement_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "meter_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "period_start_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "period_start_time" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "period_end_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "period_end_time" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ALTER COLUMN "net_kwh_from_grid" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ALTER COLUMN "etk_amount_credited" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP CONSTRAINT "energy_settlements_blockchain_tx_hash_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "blockchain_tx_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "status"`,
    );
    // await queryRunner.query(`DROP TYPE "public"."transaction_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "status" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "created_at_backend"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "created_at_backend" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "confirmed_at_on_chain"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "confirmed_at_on_chain" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "settlement_trigger"`,
    );
    await queryRunner.query(`DROP TYPE "public"."settlement_trigger_enum"`);
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "settlement_trigger" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ALTER COLUMN "raw_export_kwh" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ALTER COLUMN "raw_import_kwh" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "validation_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "validation_status" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "settlement_data_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "settlement_data_source" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "detailed_energy_breakdown"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "detailed_energy_breakdown" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "mqtt_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "mqtt_message_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP CONSTRAINT "smart_meters_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "meter_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD CONSTRAINT "PK_8ffed222126a4abb782dbbb98af" PRIMARY KEY ("meter_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "prosumer_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP CONSTRAINT "smart_meters_meter_blockchain_address_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "meter_blockchain_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "meter_blockchain_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "location" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "smart_meters" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "status" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "created_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "last_seen"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "last_seen" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "updated_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "mqtt_topic_realtime"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "mqtt_topic_realtime" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "mqtt_topic_settlement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "mqtt_topic_settlement" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ALTER COLUMN "settlement_interval_minutes" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "firmware_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "firmware_version" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "last_settlement_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "last_settlement_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "device_configuration"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "device_configuration" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "last_heartbeat_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "last_heartbeat_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "device_model"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "device_model" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "device_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "device_version" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "capabilities"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "capabilities" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP CONSTRAINT "device_commands_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "command_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "command_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD CONSTRAINT "PK_af4492046bfb9c6de03b314a773" PRIMARY KEY ("command_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "meter_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "command_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "command_type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "command_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "command_payload" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP CONSTRAINT "device_commands_correlation_id_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "correlation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "correlation_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."command_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "status" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "sent_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "sent_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "acknowledged_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "acknowledged_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "timeout_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "timeout_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "response_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "response_payload" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "error_details"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "error_details" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "sent_by_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "sent_by_user" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP CONSTRAINT "idrs_conversions_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "conversion_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "conversion_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD CONSTRAINT "PK_a606473dc71f7112a70df2592f5" PRIMARY KEY ("conversion_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "prosumer_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "wallet_address" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "conversion_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "conversion_type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ALTER COLUMN "idr_amount" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ALTER COLUMN "idrs_amount" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ALTER COLUMN "exchange_rate" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ALTER COLUMN "exchange_rate" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "blockchain_tx_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transaction_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "status" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "simulation_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "simulation_note" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "created_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "confirmed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "confirmed_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "market_trades_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "trade_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "trade_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "PK_5efaa55324c2b39ad84f6e02be4" PRIMARY KEY ("trade_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "buyer_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "buyer_order_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "seller_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "seller_order_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "buyer_prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "buyer_prosumer_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "seller_prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "seller_prosumer_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "buyer_wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "buyer_wallet_address" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "seller_wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "seller_wallet_address" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ALTER COLUMN "traded_etk_amount" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ALTER COLUMN "price_idrs_per_etk" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ALTER COLUMN "total_idrs_value" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "blockchain_tx_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "trade_timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "trade_timestamp" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ALTER COLUMN "gas_fee_wei" TYPE numeric`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "created_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP CONSTRAINT "prosumers_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "prosumer_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD CONSTRAINT "PK_3ae412f5b4dcb9072bc6fe6815d" PRIMARY KEY ("prosumer_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP CONSTRAINT "prosumers_email_key"`,
    );
    await queryRunner.query(`ALTER TABLE "prosumers" DROP COLUMN "email"`);
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "email" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP COLUMN "password_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "password_hash" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "prosumers" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "name" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "prosumers" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "created_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "prosumers" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "updated_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP COLUMN "primary_wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "primary_wallet_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "wallets_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN "wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "wallet_address" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "PK_bca8b30f6524979bf57a2b2c1be" PRIMARY KEY ("wallet_address")`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "prosumer_id"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "prosumer_id" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "wallet_name"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "wallet_name" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN "encrypted_private_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "encrypted_private_key" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "created_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN "import_method"`,
    );
    await queryRunner.query(`DROP TYPE "public"."wallet_import_method_enum"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "import_method" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ALTER COLUMN "is_active" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "last_used_at"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "last_used_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" DROP CONSTRAINT "token_blacklist_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" DROP COLUMN "blacklist_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ADD "blacklist_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ADD CONSTRAINT "PK_17b3902baa94df28557059b0ac8" PRIMARY KEY ("blacklist_id")`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."blacklist_type_enum" RENAME TO "blacklist_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."token_blacklist_blacklist_type_enum" AS ENUM('TOKEN', 'USER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ALTER COLUMN "blacklist_type" TYPE "public"."token_blacklist_blacklist_type_enum" USING "blacklist_type"::"text"::"public"."token_blacklist_blacklist_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."blacklist_type_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."blacklist_reason_enum" RENAME TO "blacklist_reason_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."token_blacklist_reason_enum" AS ENUM('LOGOUT', 'LOGOUT_ALL_DEVICES', 'SECURITY_BREACH', 'ADMIN_ACTION', 'EXPIRED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ALTER COLUMN "reason" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ALTER COLUMN "reason" TYPE "public"."token_blacklist_reason_enum" USING "reason"::"text"::"public"."token_blacklist_reason_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ALTER COLUMN "reason" SET DEFAULT 'LOGOUT'`,
    );
    await queryRunner.query(`DROP TYPE "public"."blacklist_reason_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP CONSTRAINT "system_config_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "config_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "config_key" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD CONSTRAINT "PK_c54d4e3d5a246ef29601e48d751" PRIMARY KEY ("config_key")`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "config_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "config_value" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "updated_at" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "updated_by" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8e7e938c9158e8f395442a031" ON "token_blacklist" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f843323a807f2db43c4d8ba888" ON "token_blacklist" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc93690d4ba3c359bfaaa99a7a" ON "token_blacklist" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b9a3b934060f946221d5396244" ON "token_blacklist" ("blacklist_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a320f4470d1b5517ee5553b66" ON "token_blacklist" ("prosumer_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD CONSTRAINT "FK_5294b62bff72d38f50a4d58c29c" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD CONSTRAINT "FK_29ae45290289b9e01641e35dda0" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD CONSTRAINT "FK_59b934594dbcc767a51676f2b9d" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD CONSTRAINT "FK_be4aaa31fac21ce88fa8748ee8a" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD CONSTRAINT "FK_e150b68ec4f6da6452e4857820e" FOREIGN KEY ("wallet_address") REFERENCES "wallets"("wallet_address") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD CONSTRAINT "FK_00ac8f05bd69b569cf6357ddec3" FOREIGN KEY ("related_order_id") REFERENCES "trade_orders_cache"("order_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD CONSTRAINT "FK_c610529db3b0d2fa571fcb32c0c" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD CONSTRAINT "FK_1421bcc06059512215276a952f1" FOREIGN KEY ("related_settlement_id") REFERENCES "energy_settlements"("settlement_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD CONSTRAINT "FK_8fb34800a672cd8396fba250d17" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD CONSTRAINT "FK_8d95b90755324e78d9db299a065" FOREIGN KEY ("mqtt_message_id") REFERENCES "mqtt_message_logs"("log_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD CONSTRAINT "FK_15c4c55f7a7ac1a93ae9a06a6c4" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD CONSTRAINT "FK_98f91fb3dcbc239e54b180a2664" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD CONSTRAINT "FK_3d8c04d6bc6be81bc7a052f9265" FOREIGN KEY ("sent_by_user") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD CONSTRAINT "FK_ca221ee5d35d43d27e8e2d0b799" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD CONSTRAINT "FK_0f0a685f411f15927376b85460d" FOREIGN KEY ("wallet_address") REFERENCES "wallets"("wallet_address") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "FK_e5d6128781fecd5e123649fd47b" FOREIGN KEY ("buyer_prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "FK_4a8e26f96115599aeb05e2fac3e" FOREIGN KEY ("buyer_wallet_address") REFERENCES "wallets"("wallet_address") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "FK_028c93bfb292f998635a701742d" FOREIGN KEY ("seller_prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "FK_ffe7be81bfeb35561ac25cff6b0" FOREIGN KEY ("seller_wallet_address") REFERENCES "wallets"("wallet_address") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blockchain_approvals" ADD CONSTRAINT "FK_8bd45445a1df1944c08307c53b5" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blockchain_approvals" ADD CONSTRAINT "FK_d8746984188b206031ef424c3a1" FOREIGN KEY ("wallet_address") REFERENCES "wallets"("wallet_address") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_62a1a16628b883318e6b443cf52" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ADD CONSTRAINT "FK_1a320f4470d1b5517ee5553b66b" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" DROP CONSTRAINT "FK_1a320f4470d1b5517ee5553b66b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_62a1a16628b883318e6b443cf52"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blockchain_approvals" DROP CONSTRAINT "FK_d8746984188b206031ef424c3a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blockchain_approvals" DROP CONSTRAINT "FK_8bd45445a1df1944c08307c53b5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "FK_ffe7be81bfeb35561ac25cff6b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "FK_028c93bfb292f998635a701742d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "FK_4a8e26f96115599aeb05e2fac3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "FK_e5d6128781fecd5e123649fd47b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP CONSTRAINT "FK_0f0a685f411f15927376b85460d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP CONSTRAINT "FK_ca221ee5d35d43d27e8e2d0b799"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP CONSTRAINT "FK_3d8c04d6bc6be81bc7a052f9265"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP CONSTRAINT "FK_98f91fb3dcbc239e54b180a2664"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP CONSTRAINT "FK_15c4c55f7a7ac1a93ae9a06a6c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP CONSTRAINT "FK_8d95b90755324e78d9db299a065"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP CONSTRAINT "FK_8fb34800a672cd8396fba250d17"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP CONSTRAINT "FK_1421bcc06059512215276a952f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP CONSTRAINT "FK_c610529db3b0d2fa571fcb32c0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP CONSTRAINT "FK_00ac8f05bd69b569cf6357ddec3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP CONSTRAINT "FK_e150b68ec4f6da6452e4857820e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP CONSTRAINT "FK_be4aaa31fac21ce88fa8748ee8a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP CONSTRAINT "FK_59b934594dbcc767a51676f2b9d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP CONSTRAINT "FK_29ae45290289b9e01641e35dda0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP CONSTRAINT "FK_5294b62bff72d38f50a4d58c29c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a320f4470d1b5517ee5553b66"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b9a3b934060f946221d5396244"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fc93690d4ba3c359bfaaa99a7a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f843323a807f2db43c4d8ba888"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8e7e938c9158e8f395442a031"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "updated_by" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "config_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "config_value" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP CONSTRAINT "PK_c54d4e3d5a246ef29601e48d751"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" DROP COLUMN "config_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD "config_key" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "system_config" ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("config_key")`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."blacklist_reason_enum_old" AS ENUM('LOGOUT', 'LOGOUT_ALL_DEVICES', 'SECURITY_BREACH', 'ADMIN_ACTION', 'EXPIRED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ALTER COLUMN "reason" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ALTER COLUMN "reason" TYPE "public"."blacklist_reason_enum_old" USING "reason"::"text"::"public"."blacklist_reason_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ALTER COLUMN "reason" SET DEFAULT 'LOGOUT'`,
    );
    await queryRunner.query(`DROP TYPE "public"."token_blacklist_reason_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."blacklist_reason_enum_old" RENAME TO "blacklist_reason_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."blacklist_type_enum_old" AS ENUM('TOKEN', 'USER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ALTER COLUMN "blacklist_type" TYPE "public"."blacklist_type_enum_old" USING "blacklist_type"::"text"::"public"."blacklist_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."token_blacklist_blacklist_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."blacklist_type_enum_old" RENAME TO "blacklist_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" DROP CONSTRAINT "PK_17b3902baa94df28557059b0ac8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" DROP COLUMN "blacklist_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ADD "blacklist_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ADD CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("blacklist_id")`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "last_used_at"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "last_used_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ALTER COLUMN "is_active" SET DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN "import_method"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_import_method_enum" AS ENUM('GENERATED', 'IMPORTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "import_method" "public"."wallet_import_method_enum" NOT NULL DEFAULT 'GENERATED'`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN "encrypted_private_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "encrypted_private_key" text`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "wallet_name"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "wallet_name" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "wallets" DROP COLUMN "prosumer_id"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "prosumer_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "PK_bca8b30f6524979bf57a2b2c1be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN "wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD "wallet_address" character varying(42) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("wallet_address")`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP COLUMN "primary_wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "primary_wallet_address" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "prosumers" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "prosumers" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "prosumers" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP COLUMN "password_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "password_hash" text NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "prosumers" DROP COLUMN "email"`);
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "email" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD CONSTRAINT "prosumers_email_key" UNIQUE ("email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP CONSTRAINT "PK_3ae412f5b4dcb9072bc6fe6815d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD "prosumer_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD CONSTRAINT "prosumers_pkey" PRIMARY KEY ("prosumer_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ALTER COLUMN "gas_fee_wei" TYPE numeric(28,0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "trade_timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "trade_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "blockchain_tx_hash" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ALTER COLUMN "total_idrs_value" TYPE numeric(38,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ALTER COLUMN "price_idrs_per_etk" TYPE numeric(28,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ALTER COLUMN "traded_etk_amount" TYPE numeric(28,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "seller_wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "seller_wallet_address" character varying(42) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "buyer_wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "buyer_wallet_address" character varying(42) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "seller_prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "seller_prosumer_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "buyer_prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "buyer_prosumer_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "seller_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "seller_order_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "buyer_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "buyer_order_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP CONSTRAINT "PK_5efaa55324c2b39ad84f6e02be4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" DROP COLUMN "trade_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD "trade_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_pkey" PRIMARY KEY ("trade_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "confirmed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "confirmed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "simulation_note"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "simulation_note" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transaction_status_enum" AS ENUM('PENDING', 'SUCCESS', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "status" "public"."transaction_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "blockchain_tx_hash" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ALTER COLUMN "exchange_rate" SET DEFAULT 1.000000`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ALTER COLUMN "exchange_rate" TYPE numeric(10,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ALTER COLUMN "idrs_amount" TYPE numeric(28,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ALTER COLUMN "idr_amount" TYPE numeric(15,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "conversion_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "conversion_type" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "wallet_address" character varying(42) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "prosumer_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP CONSTRAINT "PK_a606473dc71f7112a70df2592f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" DROP COLUMN "conversion_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD "conversion_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD CONSTRAINT "idrs_conversions_pkey" PRIMARY KEY ("conversion_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "sent_by_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "sent_by_user" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "error_details"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "error_details" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "response_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "response_payload" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "timeout_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "timeout_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "acknowledged_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "acknowledged_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "sent_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."command_status_enum" AS ENUM('SENT', 'ACKNOWLEDGED', 'FAILED', 'TIMEOUT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "status" "public"."command_status_enum" NOT NULL DEFAULT 'SENT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "correlation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "correlation_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_correlation_id_key" UNIQUE ("correlation_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "command_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "command_payload" jsonb NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "command_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "command_type" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "meter_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP CONSTRAINT "PK_af4492046bfb9c6de03b314a773"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" DROP COLUMN "command_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD "command_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_pkey" PRIMARY KEY ("command_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "capabilities"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "capabilities" jsonb DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "device_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "device_version" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "device_model"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "device_model" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "last_heartbeat_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "last_heartbeat_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "device_configuration"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "device_configuration" jsonb DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "last_settlement_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "last_settlement_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "firmware_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "firmware_version" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ALTER COLUMN "settlement_interval_minutes" SET DEFAULT '5'`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "mqtt_topic_settlement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "mqtt_topic_settlement" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "mqtt_topic_realtime"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "mqtt_topic_realtime" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "last_seen"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "last_seen" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "smart_meters" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "status" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "location"`,
    );
    await queryRunner.query(`ALTER TABLE "smart_meters" ADD "location" text`);
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "meter_blockchain_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "meter_blockchain_address" character varying(42)`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD CONSTRAINT "smart_meters_meter_blockchain_address_key" UNIQUE ("meter_blockchain_address")`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "prosumer_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP CONSTRAINT "PK_8ffed222126a4abb782dbbb98af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD "meter_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_meters" ADD CONSTRAINT "smart_meters_pkey" PRIMARY KEY ("meter_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "mqtt_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "mqtt_message_id" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "detailed_energy_breakdown"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "detailed_energy_breakdown" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "settlement_data_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "settlement_data_source" character varying(50) DEFAULT 'MQTT_SETTLEMENT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "validation_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "validation_status" character varying(50) DEFAULT 'VALID'`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ALTER COLUMN "raw_import_kwh" TYPE numeric(12,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ALTER COLUMN "raw_export_kwh" TYPE numeric(12,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "settlement_trigger"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."settlement_trigger_enum" AS ENUM('PERIODIC', 'MANUAL', 'THRESHOLD')`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "settlement_trigger" "public"."settlement_trigger_enum" NOT NULL DEFAULT 'PERIODIC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "confirmed_at_on_chain"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "confirmed_at_on_chain" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "created_at_backend"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "created_at_backend" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transaction_status_enum" AS ENUM('PENDING', 'SUCCESS', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "status" "public"."transaction_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "blockchain_tx_hash" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD CONSTRAINT "energy_settlements_blockchain_tx_hash_key" UNIQUE ("blockchain_tx_hash")`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ALTER COLUMN "etk_amount_credited" TYPE numeric(28,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ALTER COLUMN "net_kwh_from_grid" TYPE numeric(12,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "period_end_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "period_end_time" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "period_start_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "period_start_time" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "meter_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP CONSTRAINT "PK_8b9a77f8528eecedcca0002af19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" DROP COLUMN "settlement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD "settlement_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD CONSTRAINT "energy_settlements_pkey" PRIMARY KEY ("settlement_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "transaction_timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "transaction_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "blockchain_tx_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "blockchain_tx_hash" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "currency_secondary"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."currency_enum" AS ENUM('ETK', 'IDRS', 'IDR')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "currency_secondary" "public"."currency_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ALTER COLUMN "amount_secondary" TYPE numeric(38,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "currency_primary"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."currency_enum" AS ENUM('ETK', 'IDRS', 'IDR')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "currency_primary" "public"."currency_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ALTER COLUMN "amount_primary" TYPE numeric(38,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "transaction_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transaction_log_type_enum" AS ENUM('ENERGY_SETTLEMENT', 'TOKEN_MINT', 'TOKEN_BURN', 'MARKET_ORDER', 'ORDER_PLACED', 'TRADE_EXECUTION', 'WALLET_CREATED', 'WALLET_IMPORTED', 'IDRS_CONVERSION', 'TOKEN_APPROVAL', 'DEVICE_COMMAND', 'ORDER_CANCELLED', 'CONTRACT_INTERACTION', 'SYSTEM_EVENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "transaction_type" "public"."transaction_log_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "related_settlement_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "related_settlement_id" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "related_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "related_order_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "prosumer_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP CONSTRAINT "PK_77d7e09163aa1e895fc3c89546b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" DROP COLUMN "log_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD "log_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("log_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "blockchain_tx_hash_cancelled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "blockchain_tx_hash_cancelled" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "blockchain_tx_hash_filled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "blockchain_tx_hash_filled" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "blockchain_tx_hash_placed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "blockchain_tx_hash_placed" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "updated_at_cache"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "updated_at_cache" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "created_at_on_chain"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "created_at_on_chain" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "status_on_chain"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum" AS ENUM('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "status_on_chain" "public"."order_status_enum" NOT NULL DEFAULT 'OPEN'`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ALTER COLUMN "total_idrs_value" TYPE numeric(38,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ALTER COLUMN "price_idrs_per_etk" TYPE numeric(28,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ALTER COLUMN "amount_etk" TYPE numeric(28,18)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "pair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "pair" character varying(20) NOT NULL DEFAULT 'ETK/IDRS'`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "order_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_type_enum" AS ENUM('BID', 'ASK')`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "order_type" "public"."order_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "wallet_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "wallet_address" character varying(42) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "prosumer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "prosumer_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP CONSTRAINT "PK_e6377a342a2a931eb4fb13e6df3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" DROP COLUMN "order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD "order_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trade_orders_cache" ADD CONSTRAINT "trade_orders_cache_pkey" PRIMARY KEY ("order_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "correlation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "correlation_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "error_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "error_message" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "processing_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "processing_status" character varying(50) DEFAULT 'SUCCESS'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "processed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "processed_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "message_timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "message_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "raw_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "raw_message" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "payload" jsonb NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "mqtt_topic"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "mqtt_topic" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "direction"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."mqtt_direction_enum" AS ENUM('INBOUND', 'OUTBOUND')`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "direction" "public"."mqtt_direction_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "topic_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."mqtt_topic_enum" AS ENUM('SENSORS', 'STATUS', 'COMMAND', 'SETTLEMENT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "topic_type" "public"."mqtt_topic_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "meter_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP CONSTRAINT "PK_592bdc31f112b04b16832a8c6ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" DROP COLUMN "log_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD "log_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "raw_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "raw_payload" jsonb NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "subsystem_data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "subsystem_data" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "current_amp" TYPE numeric(8,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "voltage" TYPE numeric(8,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "current_power_w" TYPE numeric(10,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "settlement_energy_wh" TYPE numeric(15,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "total_energy_wh" TYPE numeric(20,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ALTER COLUMN "daily_energy_wh" TYPE numeric(15,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "subsystem"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."device_subsystem_enum" AS ENUM('GRID_EXPORT', 'GRID_IMPORT', 'BATTERY', 'SOLAR', 'LOAD', 'SYSTEM')`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "subsystem" "public"."device_subsystem_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "meter_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP CONSTRAINT "PK_184bdff2c99b8959c59d5f92daa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" DROP COLUMN "reading_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD "reading_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "raw_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "raw_payload" jsonb NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "component_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "component_status" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "system_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "system_status" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "grid_mode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "grid_mode" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "mqtt_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "mqtt_status" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "wifi_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "wifi_status" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "timestamp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "meter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "meter_id" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP CONSTRAINT "PK_353279ff96832987de5c70e7a40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" DROP COLUMN "snapshot_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD "snapshot_id" BIGSERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_status_snapshots" ADD CONSTRAINT "device_status_snapshots_pkey" PRIMARY KEY ("snapshot_id")`,
    );
    await queryRunner.query(`DROP TABLE "telemetry_data"`);
    await queryRunner.query(`DROP TABLE "blockchain_approvals"`);
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "chk_wallet_address_format" CHECK (((wallet_address)::text ~* '^0x[a-fA-F0-9]{40}$'::text))`,
    );
    await queryRunner.query(
      `ALTER TABLE "prosumers" ADD CONSTRAINT "chk_valid_email" CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "chk_positive_trade_amount" CHECK ((traded_etk_amount > (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "chk_positive_price" CHECK ((price_idrs_per_etk > (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD CONSTRAINT "chk_positive_amounts" CHECK ((idrs_amount > (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "idrs_conversions" ADD CONSTRAINT "chk_conversion_type" CHECK (((conversion_type)::text = ANY (ARRAY[('ON_RAMP'::character varying)::text, ('OFF_RAMP'::character varying)::text])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD CONSTRAINT "chk_settlement_interval" CHECK ((EXTRACT(epoch FROM (period_end_time - period_start_time)) >= (60)::numeric))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_token_blacklist_unique_user" ON "token_blacklist" ("prosumer_id") WHERE ((blacklist_type = 'USER'::blacklist_type_enum) AND (is_active = true))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_token_blacklist_unique_token" ON "token_blacklist" ("token_hash") WHERE ((blacklist_type = 'TOKEN'::blacklist_type_enum) AND (is_active = true))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_token_blacklist_type" ON "token_blacklist" ("blacklist_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_token_blacklist_token_hash" ON "token_blacklist" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_token_blacklist_prosumer" ON "token_blacklist" ("prosumer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_token_blacklist_expires" ON "token_blacklist" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_token_blacklist_created" ON "token_blacklist" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_token_blacklist_active" ON "token_blacklist" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wallets_prosumer_id" ON "wallets" ("prosumer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_market_trades_timestamp" ON "market_trades" ("trade_timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_market_trades_seller" ON "market_trades" ("seller_prosumer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_market_trades_buyer" ON "market_trades" ("buyer_prosumer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_idrs_conversions_type" ON "idrs_conversions" ("conversion_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_idrs_conversions_status" ON "idrs_conversions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_idrs_conversions_prosumer" ON "idrs_conversions" ("prosumer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_device_commands_type" ON "device_commands" ("command_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_device_commands_status" ON "device_commands" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_device_commands_sent_at" ON "device_commands" ("sent_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_device_commands_meter" ON "device_commands" ("meter_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_smart_meters_prosumer_id" ON "smart_meters" ("prosumer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_energy_settlements_meter_id" ON "energy_settlements" ("meter_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_transaction_logs_type" ON "transaction_logs" ("transaction_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_transaction_logs_timestamp" ON "transaction_logs" ("transaction_timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_transaction_logs_prosumer_id" ON "transaction_logs" ("prosumer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_transaction_logs_blockchain_tx_hash" ON "transaction_logs" ("blockchain_tx_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_trade_orders_wallet_address" ON "trade_orders_cache" ("wallet_address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_trade_orders_status" ON "trade_orders_cache" ("status_on_chain") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_trade_orders_prosumer_id" ON "trade_orders_cache" ("prosumer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_trade_orders_pair_type_price" ON "trade_orders_cache" ("order_type", "pair", "price_idrs_per_etk") `,
    );
    await queryRunner.query(
      `ALTER TABLE "token_blacklist" ADD CONSTRAINT "fk_blacklist_prosumer" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "fk_prosumer" FOREIGN KEY ("prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "fk_buyer_prosumer" FOREIGN KEY ("buyer_prosumer_id") REFERENCES "prosumers"("prosumer_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "market_trades" ADD CONSTRAINT "fk_buyer_wallet" FOREIGN KEY ("buyer_wallet_address") REFERENCES "wallets"("wallet_address") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD CONSTRAINT "fk_command_meter" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_commands" ADD CONSTRAINT "fk_command_user" FOREIGN KEY ("sent_by_user") REFERENCES "prosumers"("prosumer_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_settlements" ADD CONSTRAINT "fk_meter_settlement" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_logs" ADD CONSTRAINT "fk_order_log" FOREIGN KEY ("related_order_id") REFERENCES "trade_orders_cache"("order_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mqtt_message_logs" ADD CONSTRAINT "fk_mqtt_meter" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "energy_readings_detailed" ADD CONSTRAINT "fk_detailed_reading_meter" FOREIGN KEY ("meter_id") REFERENCES "smart_meters"("meter_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
