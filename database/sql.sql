-- Membuat Tipe ENUM Kustom (jika Anda memilih pendekatan ini)
CREATE TYPE flow_direction_enum AS ENUM ('IMPORT', 'EXPORT', 'CONSUMPTION', 'GENERATION');

CREATE TYPE transaction_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TYPE order_type_enum AS ENUM ('BID', 'ASK');

CREATE TYPE order_status_enum AS ENUM ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED');

CREATE TYPE transaction_log_type_enum AS ENUM ('TRADE', 'SETTLEMENT', 'CONVERSION_IDR_IDRS');

CREATE TYPE currency_enum AS ENUM ('ETK', 'IDRS', 'IDR');

-- Tambahan ENUM untuk status approval dan settlement types
CREATE TYPE approval_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

CREATE TYPE settlement_trigger_enum AS ENUM ('SCHEDULED', 'MANUAL', 'AUTOMATIC');

CREATE TYPE wallet_import_method_enum AS ENUM ('GENERATED', 'IMPORTED');

-- Additional ENUMs for MQTT message handling
CREATE TYPE mqtt_topic_enum AS ENUM ('SENSORS', 'HEARTBEAT', 'STATUS', 'COMMAND', 'SETTLEMENT');

CREATE TYPE mqtt_direction_enum AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TYPE command_status_enum AS ENUM ('SENT', 'ACKNOWLEDGED', 'FAILED', 'TIMEOUT');

CREATE TYPE device_subsystem_enum AS ENUM ('GRID', 'BATTERY', 'SOLAR', 'LOAD', 'SYSTEM');

-- Tabel PROSUMERS
CREATE TABLE PROSUMERS (
    prosumer_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL -- Biasanya diupdate via trigger
);

-- Tabel WALLETS
CREATE TABLE WALLETS (
    wallet_address VARCHAR(42) PRIMARY KEY, -- Alamat Ethereum biasanya 42 karakter (0x + 40 hex)
    prosumer_id VARCHAR(255) NOT NULL,
    wallet_name VARCHAR(255),
    encrypted_private_key TEXT, -- PERINGATAN: Sangat sensitif, pastikan enkripsi sangat kuat
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    import_method wallet_import_method_enum DEFAULT 'GENERATED' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_used_at TIMESTAMPTZ,
    CONSTRAINT fk_prosumer FOREIGN KEY (prosumer_id) REFERENCES PROSUMERS (prosumer_id) ON DELETE CASCADE -- Jika prosumer dihapus, walletnya juga terhapus
);

CREATE INDEX idx_wallets_prosumer_id ON WALLETS (prosumer_id);

-- Tabel SMART_METERS
CREATE TABLE SMART_METERS (
    meter_id VARCHAR(255) PRIMARY KEY,
    prosumer_id VARCHAR(255) NOT NULL,
    meter_blockchain_address VARCHAR(42) UNIQUE, -- Alamat wallet khusus meter jika ada
    location TEXT,
    status VARCHAR(50), -- Bisa juga ENUM jika statusnya terbatas
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Biasanya diupdate via trigger
    mqtt_topic_realtime VARCHAR(255),
    mqtt_topic_settlement VARCHAR(255),
    settlement_interval_minutes INTEGER DEFAULT 5,
    firmware_version VARCHAR(50),
    last_settlement_at TIMESTAMPTZ,
    device_configuration JSONB DEFAULT '{}',
    last_heartbeat_at TIMESTAMPTZ,
    device_model VARCHAR(100),
    device_version VARCHAR(50),
    capabilities JSONB DEFAULT '{}', -- stores device capabilities like {"has_battery": true, "has_solar": true}
    CONSTRAINT fk_prosumer_meter FOREIGN KEY (prosumer_id) REFERENCES PROSUMERS (prosumer_id) ON DELETE RESTRICT -- Cegah penghapusan prosumer jika masih punya meter terdaftar
);

CREATE INDEX idx_smart_meters_prosumer_id ON SMART_METERS (prosumer_id);

-- Tabel ENERGY_READINGS
CREATE TABLE ENERGY_READINGS (
    reading_id BIGSERIAL PRIMARY KEY,
    meter_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    voltage NUMERIC(8, 2), -- Presisi 8 digit, 2 di belakang koma
    current_amp NUMERIC(8, 3), -- Mengganti 'current' menjadi 'current_amp' agar lebih jelas
    power_kw NUMERIC(10, 4),
    flow_direction flow_direction_enum NOT NULL, -- Menggunakan tipe ENUM
    CONSTRAINT fk_meter_reading FOREIGN KEY (meter_id) REFERENCES SMART_METERS (meter_id) ON DELETE CASCADE -- Jika meter dihapus, readingnya juga terhapus
);

CREATE INDEX idx_energy_readings_meter_id_timestamp ON ENERGY_READINGS (meter_id, timestamp DESC);

-- Tabel ENERGY_SETTLEMENTS
CREATE TABLE ENERGY_SETTLEMENTS (
    settlement_id BIGSERIAL PRIMARY KEY,
    meter_id VARCHAR(255) NOT NULL,
    period_start_time TIMESTAMPTZ NOT NULL,
    period_end_time TIMESTAMPTZ NOT NULL,
    net_kwh_from_grid NUMERIC(12, 4) NOT NULL, -- Positif untuk Ekspor, Negatif untuk Impor
    etk_amount_credited NUMERIC(28, 18), -- Untuk mengakomodasi desimal token ETK (biasanya 18)
    blockchain_tx_hash VARCHAR(128) UNIQUE, -- Hash transaksi Ethereum (increased from 66 to 128)
    status transaction_status_enum DEFAULT 'PENDING' NOT NULL, -- Menggunakan tipe ENUM
    created_at_backend TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at_on_chain TIMESTAMPTZ,
    settlement_trigger settlement_trigger_enum DEFAULT 'AUTOMATIC' NOT NULL,
    raw_export_kwh NUMERIC(12, 4),
    raw_import_kwh NUMERIC(12, 4),
    validation_status VARCHAR(50) DEFAULT 'VALID',
    settlement_data_source VARCHAR(50) DEFAULT 'MQTT_SETTLEMENT',
    detailed_energy_breakdown JSONB, -- store breakdown by subsystem
    mqtt_message_id BIGINT,
    CONSTRAINT fk_meter_settlement FOREIGN KEY (meter_id) REFERENCES SMART_METERS (meter_id) ON DELETE RESTRICT -- Cegah penghapusan meter jika masih ada settlement terkait
);

CREATE INDEX idx_energy_settlements_meter_id ON ENERGY_SETTLEMENTS (meter_id);

CREATE INDEX idx_energy_settlements_status ON ENERGY_SETTLEMENTS (status);

-- Tabel TRADE_ORDERS_CACHE
-- Catatan: Menyimpan cache order book di DB bisa kompleks untuk disinkronkan dengan blockchain.
-- Pertimbangkan apakah ini benar-benar diperlukan atau data diambil langsung dari SC/event.
CREATE TABLE TRADE_ORDERS_CACHE (
    order_id VARCHAR(255) PRIMARY KEY, -- Bisa jadi ID dari event SC atau ID unik dari sistem
    prosumer_id VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    order_type order_type_enum NOT NULL, -- Menggunakan tipe ENUM
    pair VARCHAR(20) DEFAULT 'ETK/IDRS' NOT NULL, -- Misal ETK/IDRS
    amount_etk NUMERIC(28, 18) NOT NULL, -- Sesuai desimal token ETK
    price_idrs_per_etk NUMERIC(28, 18) NOT NULL, -- Harga per 1 ETK dalam IDRS (sesuai desimal IDRS)
    total_idrs_value NUMERIC(38, 18), -- Dihitung: amount_etk * price_idrs_per_etk (perlu penanganan desimal)
    status_on_chain order_status_enum DEFAULT 'OPEN' NOT NULL, -- Menggunakan tipe ENUM
    created_at_on_chain TIMESTAMPTZ NOT NULL,
    updated_at_cache TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Diupdate oleh backend saat sinkronisasi
    blockchain_tx_hash_placed VARCHAR(128), -- Hash transaksi saat order ditempatkan (increased from 66 to 128)
    blockchain_tx_hash_filled VARCHAR(128), -- Hash transaksi saat order terisi penuh (increased from 66 to 128)
    CONSTRAINT fk_prosumer_order FOREIGN KEY (prosumer_id) REFERENCES PROSUMERS (prosumer_id) ON DELETE CASCADE,
    CONSTRAINT fk_wallet_order FOREIGN KEY (wallet_address) REFERENCES WALLETS (wallet_address) ON DELETE CASCADE -- Jika wallet dihapus, order terkait juga
);

CREATE INDEX idx_trade_orders_prosumer_id ON TRADE_ORDERS_CACHE (prosumer_id);

CREATE INDEX idx_trade_orders_wallet_address ON TRADE_ORDERS_CACHE (wallet_address);

CREATE INDEX idx_trade_orders_status ON TRADE_ORDERS_CACHE (status_on_chain);

CREATE INDEX idx_trade_orders_pair_type_price ON TRADE_ORDERS_CACHE (
    pair,
    order_type,
    price_idrs_per_etk
);
-- Untuk matching order book

-- Tabel TRANSACTION_LOGS
CREATE TABLE TRANSACTION_LOGS (
    log_id BIGSERIAL PRIMARY KEY,
    prosumer_id VARCHAR(255) NOT NULL,
    related_order_id VARCHAR(255), -- Jika terkait order trading
    related_settlement_id BIGINT, -- Jika terkait settlement energi
    transaction_type transaction_log_type_enum NOT NULL, -- Menggunakan tipe ENUM
    description TEXT,
    amount_primary NUMERIC(38, 18) NOT NULL,
    currency_primary currency_enum NOT NULL, -- Menggunakan tipe ENUM
    amount_secondary NUMERIC(38, 18),
    currency_secondary currency_enum, -- Menggunakan tipe ENUM
    blockchain_tx_hash VARCHAR(128), -- Increased from 66 to 128
    transaction_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_prosumer_log FOREIGN KEY (prosumer_id) REFERENCES PROSUMERS (prosumer_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_log FOREIGN KEY (related_order_id) REFERENCES TRADE_ORDERS_CACHE (order_id) ON DELETE SET NULL, -- Jika order dihapus, log tetap ada tapi referensi order hilang
    CONSTRAINT fk_settlement_log FOREIGN KEY (related_settlement_id) REFERENCES ENERGY_SETTLEMENTS (settlement_id) ON DELETE SET NULL -- Jika settlement dihapus, log tetap ada
);

CREATE INDEX idx_transaction_logs_prosumer_id ON TRANSACTION_LOGS (prosumer_id);

CREATE INDEX idx_transaction_logs_type ON TRANSACTION_LOGS (transaction_type);

CREATE INDEX idx_transaction_logs_blockchain_tx_hash ON TRANSACTION_LOGS (blockchain_tx_hash);

-- Tabel untuk Blockchain Approvals (untuk tracking approve transactions)
CREATE TABLE BLOCKCHAIN_APPROVALS (
    approval_id BIGSERIAL PRIMARY KEY,
    prosumer_id VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    spender_contract_address VARCHAR(42) NOT NULL, -- Market.sol atau EnergyConverter.sol
    token_contract_address VARCHAR(42) NOT NULL, -- ETK atau IDRS contract
    approved_amount NUMERIC(38, 18) NOT NULL,
    approval_tx_hash VARCHAR(128),
    status approval_status_enum DEFAULT 'PENDING' NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMPTZ,
    CONSTRAINT fk_prosumer_approval FOREIGN KEY (prosumer_id) REFERENCES PROSUMERS (prosumer_id) ON DELETE CASCADE,
    CONSTRAINT fk_wallet_approval FOREIGN KEY (wallet_address) REFERENCES WALLETS (wallet_address) ON DELETE CASCADE
);

CREATE INDEX idx_blockchain_approvals_wallet ON BLOCKCHAIN_APPROVALS (wallet_address);

CREATE INDEX idx_blockchain_approvals_status ON BLOCKCHAIN_APPROVALS (status);

CREATE INDEX idx_blockchain_approvals_spender ON BLOCKCHAIN_APPROVALS (spender_contract_address);

-- Tabel untuk Market Trades (hasil dari order matching)
CREATE TABLE MARKET_TRADES (
    trade_id BIGSERIAL PRIMARY KEY,
    buyer_order_id VARCHAR(255) NOT NULL,
    seller_order_id VARCHAR(255) NOT NULL,
    buyer_prosumer_id VARCHAR(255) NOT NULL,
    seller_prosumer_id VARCHAR(255) NOT NULL,
    buyer_wallet_address VARCHAR(42) NOT NULL,
    seller_wallet_address VARCHAR(42) NOT NULL,
    traded_etk_amount NUMERIC(28, 18) NOT NULL,
    price_idrs_per_etk NUMERIC(28, 18) NOT NULL,
    total_idrs_value NUMERIC(38, 18) NOT NULL,
    blockchain_tx_hash VARCHAR(128),
    trade_timestamp TIMESTAMPTZ NOT NULL,
    gas_fee_wei NUMERIC(28, 0), -- Gas fee dalam Wei
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_buyer_prosumer FOREIGN KEY (buyer_prosumer_id) REFERENCES PROSUMERS (prosumer_id) ON DELETE RESTRICT,
    CONSTRAINT fk_seller_prosumer FOREIGN KEY (seller_prosumer_id) REFERENCES PROSUMERS (prosumer_id) ON DELETE RESTRICT,
    CONSTRAINT fk_buyer_wallet FOREIGN KEY (buyer_wallet_address) REFERENCES WALLETS (wallet_address) ON DELETE RESTRICT,
    CONSTRAINT fk_seller_wallet FOREIGN KEY (seller_wallet_address) REFERENCES WALLETS (wallet_address) ON DELETE RESTRICT
);

CREATE INDEX idx_market_trades_buyer ON MARKET_TRADES (buyer_prosumer_id);

CREATE INDEX idx_market_trades_seller ON MARKET_TRADES (seller_prosumer_id);

CREATE INDEX idx_market_trades_timestamp ON MARKET_TRADES (trade_timestamp DESC);

-- Tabel untuk IDRS On-Ramp/Off-Ramp Simulation
CREATE TABLE IDRS_CONVERSIONS (
    conversion_id BIGSERIAL PRIMARY KEY,
    prosumer_id VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    conversion_type VARCHAR(20) NOT NULL, -- 'ON_RAMP' atau 'OFF_RAMP'
    idr_amount NUMERIC(15, 2), -- Jumlah IDR fiat (simulasi)
    idrs_amount NUMERIC(28, 18) NOT NULL, -- Jumlah IDRS token
    exchange_rate NUMERIC(10, 6) DEFAULT 1.000000, -- Simulasi rate IDR:IDRS
    blockchain_tx_hash VARCHAR(128),
    status transaction_status_enum DEFAULT 'PENDING' NOT NULL,
    simulation_note TEXT, -- Catatan bahwa ini simulasi
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMPTZ,
    CONSTRAINT fk_prosumer_conversion FOREIGN KEY (prosumer_id) REFERENCES PROSUMERS (prosumer_id) ON DELETE CASCADE,
    CONSTRAINT fk_wallet_conversion FOREIGN KEY (wallet_address) REFERENCES WALLETS (wallet_address) ON DELETE CASCADE,
    CONSTRAINT chk_conversion_type CHECK (
        conversion_type IN ('ON_RAMP', 'OFF_RAMP')
    )
);

CREATE INDEX idx_idrs_conversions_prosumer ON IDRS_CONVERSIONS (prosumer_id);

CREATE INDEX idx_idrs_conversions_type ON IDRS_CONVERSIONS (conversion_type);

CREATE INDEX idx_idrs_conversions_status ON IDRS_CONVERSIONS (status);

-- Tabel untuk System Configuration
CREATE TABLE SYSTEM_CONFIG (
    config_key VARCHAR(255) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255)
);

-- Insert konfigurasi default sistem
INSERT INTO
    SYSTEM_CONFIG (
        config_key,
        config_value,
        description
    )
VALUES (
        'ETK_TO_KWH_RATIO',
        '1.0',
        'Rasio konversi 1 kWh = berapa ETK'
    ),
    (
        'DEFAULT_SETTLEMENT_INTERVAL',
        '5',
        'Default interval settlement dalam menit'
    ),
    (
        'MARKET_CONTRACT_ADDRESS',
        '0x0000000000000000000000000000000000000000',
        'Alamat smart contract Market.sol'
    ),
    (
        'ETK_CONTRACT_ADDRESS',
        '0x0000000000000000000000000000000000000000',
        'Alamat smart contract ETK_Token.sol'
    ),
    (
        'IDRS_CONTRACT_ADDRESS',
        '0x0000000000000000000000000000000000000000',
        'Alamat smart contract IDRS_Token.sol'
    ),
    (
        'ENERGY_CONVERTER_ADDRESS',
        '0x0000000000000000000000000000000000000000',
        'Alamat smart contract EnergyConverter.sol'
    ),
    (
        'MQTT_BROKER_URL',
        'mqtt://localhost:1883',
        'URL MQTT Broker'
    ),
    (
        'BLOCKCHAIN_NETWORK_ID',
        '1337',
        'Network ID dari private Ethereum'
    ),
    (
        'MIN_SETTLEMENT_KWH',
        '0.001',
        'Minimum kWh untuk memicu settlement'
    );

-- Fungsi Trigger untuk updated_at (Contoh)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Menerapkan Trigger ke tabel yang memerlukan updated_at otomatis
CREATE TRIGGER set_timestamp_prosumers
BEFORE UPDATE ON PROSUMERS
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_smart_meters
BEFORE UPDATE ON SMART_METERS
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Anda bisa menambahkan trigger serupa untuk tabel lain jika diperlukan
-- atau biarkan ORM/aplikasi Anda yang menangani `updated_at`.

-- Tambahan constraint dan index untuk optimasi
ALTER TABLE ENERGY_READINGS
ADD CONSTRAINT chk_positive_power CHECK (power_kw >= 0);

ALTER TABLE ENERGY_READINGS
ADD CONSTRAINT chk_valid_voltage CHECK (voltage > 0);

ALTER TABLE ENERGY_READINGS
ADD CONSTRAINT chk_valid_current CHECK (current_amp >= 0);

-- Index tambahan untuk performa query
CREATE INDEX idx_energy_readings_timestamp ON ENERGY_READINGS (timestamp DESC);

CREATE INDEX idx_energy_settlements_period ON ENERGY_SETTLEMENTS (
    period_start_time,
    period_end_time
);

CREATE INDEX idx_transaction_logs_timestamp ON TRANSACTION_LOGS (transaction_timestamp DESC);

-- Constraint untuk validasi email
ALTER TABLE PROSUMERS
ADD CONSTRAINT chk_valid_email CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Constraint untuk wallet address format
ALTER TABLE WALLETS
ADD CONSTRAINT chk_wallet_address_format CHECK (
    wallet_address ~* '^0x[a-fA-F0-9]{40}$'
);

-- DATA DUMMY

-- Insert data dummy PROSUMERS
INSERT INTO
    PROSUMERS (
        prosumer_id,
        email,
        password_hash,
        name,
        created_at,
        updated_at
    )
VALUES (
        'PROS001',
        'john.doe@energy.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeChE.1J6.1J6.1J6',
        'John Doe',
        '2024-01-15 08:00:00+07',
        '2024-01-15 08:00:00+07'
    ),
    (
        'PROS002',
        'jane.smith@energy.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeChE.2J6.2J6.2J6',
        'Jane Smith',
        '2024-01-16 09:30:00+07',
        '2024-01-16 09:30:00+07'
    ),
    (
        'PROS003',
        'bob.wilson@energy.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeChE.3J6.3J6.3J6',
        'Bob Wilson',
        '2024-01-17 10:15:00+07',
        '2024-01-17 10:15:00+07'
    ),
    (
        'PROS004',
        'alice.brown@energy.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeChE.4J6.4J6.4J6',
        'Alice Brown',
        '2024-01-18 11:45:00+07',
        '2024-01-18 11:45:00+07'
    ),
    (
        'PROS005',
        'charlie.davis@energy.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeChE.5J6.5J6.5J6',
        'Charlie Davis',
        '2024-01-19 14:20:00+07',
        '2024-01-19 14:20:00+07'
    );

-- Insert data dummy WALLETS
INSERT INTO
    WALLETS (
        wallet_address,
        prosumer_id,
        wallet_name,
        encrypted_private_key,
        created_at
    )
VALUES (
        '0x1234567890123456789012345678901234567890',
        'PROS001',
        'John Primary Wallet',
        'encrypted_key_1_very_long_encrypted_string',
        '2024-01-15 08:30:00+07'
    ),
    (
        '0x2345678901234567890123456789012345678901',
        'PROS002',
        'Jane Main Wallet',
        'encrypted_key_2_very_long_encrypted_string',
        '2024-01-16 10:00:00+07'
    ),
    (
        '0x3456789012345678901234567890123456789012',
        'PROS003',
        'Bob Energy Wallet',
        'encrypted_key_3_very_long_encrypted_string',
        '2024-01-17 10:45:00+07'
    ),
    (
        '0x4567890123456789012345678901234567890123',
        'PROS004',
        'Alice Trading Wallet',
        'encrypted_key_4_very_long_encrypted_string',
        '2024-01-18 12:15:00+07'
    ),
    (
        '0x5678901234567890123456789012345678901234',
        'PROS005',
        'Charlie Solar Wallet',
        'encrypted_key_5_very_long_encrypted_string',
        '2024-01-19 14:50:00+07'
    );

-- Insert data dummy SMART_METERS
INSERT INTO
    SMART_METERS (
        meter_id,
        prosumer_id,
        meter_blockchain_address,
        location,
        status,
        created_at,
        last_seen,
        updated_at
    )
VALUES (
        'METER001',
        'PROS001',
        '0x1111111111111111111111111111111111111111',
        'Jakarta Selatan, Indonesia',
        'ACTIVE',
        '2024-01-15 09:00:00+07',
        '2024-06-09 15:30:00+07',
        '2024-06-09 15:30:00+07'
    ),
    (
        'METER002',
        'PROS002',
        '0x2222222222222222222222222222222222222222',
        'Bandung, Indonesia',
        'ACTIVE',
        '2024-01-16 10:30:00+07',
        '2024-06-09 15:25:00+07',
        '2024-06-09 15:25:00+07'
    ),
    (
        'METER003',
        'PROS003',
        '0x3333333333333333333333333333333333333333',
        'Surabaya, Indonesia',
        'ACTIVE',
        '2024-01-17 11:15:00+07',
        '2024-06-09 15:20:00+07',
        '2024-06-09 15:20:00+07'
    ),
    (
        'METER004',
        'PROS004',
        '0x4444444444444444444444444444444444444444',
        'Medan, Indonesia',
        'MAINTENANCE',
        '2024-01-18 12:45:00+07',
        '2024-06-09 10:15:00+07',
        '2024-06-09 10:15:00+07'
    ),
    (
        'METER005',
        'PROS005',
        '0x5555555555555555555555555555555555555555',
        'Yogyakarta, Indonesia',
        'ACTIVE',
        '2024-01-19 15:20:00+07',
        '2024-06-09 15:35:00+07',
        '2024-06-09 15:35:00+07'
    );

-- Insert data dummy ENERGY_READINGS
INSERT INTO
    ENERGY_READINGS (
        meter_id,
        timestamp,
        voltage,
        current_amp,
        power_kw,
        flow_direction
    )
VALUES (
        'METER001',
        '2024-06-09 14:00:00+07',
        220.50,
        45.250,
        9.9563,
        'GENERATION'
    ),
    (
        'METER001',
        '2024-06-09 14:15:00+07',
        219.80,
        42.180,
        9.2717,
        'GENERATION'
    ),
    (
        'METER001',
        '2024-06-09 14:30:00+07',
        221.20,
        38.450,
        8.5022,
        'CONSUMPTION'
    ),
    (
        'METER002',
        '2024-06-09 14:00:00+07',
        218.90,
        52.340,
        11.4579,
        'GENERATION'
    ),
    (
        'METER002',
        '2024-06-09 14:15:00+07',
        220.10,
        48.920,
        10.7665,
        'GENERATION'
    ),
    (
        'METER003',
        '2024-06-09 14:00:00+07',
        219.50,
        35.670,
        7.8306,
        'CONSUMPTION'
    ),
    (
        'METER003',
        '2024-06-09 14:15:00+07',
        220.80,
        55.120,
        12.1705,
        'EXPORT'
    ),
    (
        'METER004',
        '2024-06-09 13:45:00+07',
        217.30,
        28.450,
        6.1832,
        'IMPORT'
    ),
    (
        'METER005',
        '2024-06-09 14:00:00+07',
        222.10,
        61.230,
        13.5972,
        'GENERATION'
    ),
    (
        'METER005',
        '2024-06-09 14:15:00+07',
        221.80,
        58.940,
        13.0738,
        'EXPORT'
    );

-- Insert data dummy ENERGY_SETTLEMENTS
INSERT INTO
    ENERGY_SETTLEMENTS (
        meter_id,
        period_start_time,
        period_end_time,
        net_kwh_from_grid,
        etk_amount_credited,
        blockchain_tx_hash,
        status,
        created_at_backend,
        confirmed_at_on_chain
    )
VALUES (
        'METER001',
        '2024-06-08 00:00:00+07',
        '2024-06-08 23:59:59+07',
        15.2450,
        152.450000000000000000,
        '0xabc123def456789012345678901234567890123456789012345678901234567890',
        'SUCCESS',
        '2024-06-09 01:00:00+07',
        '2024-06-09 01:15:00+07'
    ),
    (
        'METER002',
        '2024-06-08 00:00:00+07',
        '2024-06-08 23:59:59+07',
        22.3680,
        223.680000000000000000,
        '0xdef456abc789012345678901234567890123456789012345678901234567890123',
        'SUCCESS',
        '2024-06-09 01:05:00+07',
        '2024-06-09 01:20:00+07'
    ),
    (
        'METER003',
        '2024-06-08 00:00:00+07',
        '2024-06-08 23:59:59+07',
        -8.1250,
        0.000000000000000000,
        '0x789012345678901234567890123456789012345678901234567890123456789abc',
        'SUCCESS',
        '2024-06-09 01:10:00+07',
        '2024-06-09 01:25:00+07'
    ),
    (
        'METER004',
        '2024-06-08 00:00:00+07',
        '2024-06-08 23:59:59+07',
        5.9870,
        59.870000000000000000,
        '0x456789012345678901234567890123456789012345678901234567890123456def',
        'PENDING',
        '2024-06-09 01:15:00+07',
        NULL
    ),
    (
        'METER005',
        '2024-06-08 00:00:00+07',
        '2024-06-08 23:59:59+07',
        31.4920,
        314.920000000000000000,
        '0x123456789012345678901234567890123456789012345678901234567890abcdef',
        'SUCCESS',
        '2024-06-09 01:20:00+07',
        '2024-06-09 01:35:00+07'
    );

-- Insert data dummy TRADE_ORDERS_CACHE
INSERT INTO
    TRADE_ORDERS_CACHE (
        order_id,
        prosumer_id,
        wallet_address,
        order_type,
        pair,
        amount_etk,
        price_idrs_per_etk,
        total_idrs_value,
        status_on_chain,
        created_at_on_chain,
        updated_at_cache,
        blockchain_tx_hash_placed,
        blockchain_tx_hash_filled
    )
VALUES (
        'ORDER001',
        'PROS001',
        '0x1234567890123456789012345678901234567890',
        'ASK',
        'ETK/IDRS',
        100.000000000000000000,
        15000.000000000000000000,
        1500000.000000000000000000,
        'FILLED',
        '2024-06-09 10:00:00+07',
        '2024-06-09 10:30:00+07',
        '0xorder1placed123456789012345678901234567890123456789012345678901234',
        '0xorder1filled123456789012345678901234567890123456789012345678901234'
    ),
    (
        'ORDER002',
        'PROS002',
        '0x2345678901234567890123456789012345678901',
        'BID',
        'ETK/IDRS',
        150.000000000000000000,
        14800.000000000000000000,
        2220000.000000000000000000,
        'OPEN',
        '2024-06-09 11:15:00+07',
        '2024-06-09 11:15:00+07',
        '0xorder2placed123456789012345678901234567890123456789012345678901234',
        NULL
    ),
    (
        'ORDER003',
        'PROS003',
        '0x3456789012345678901234567890123456789012',
        'ASK',
        'ETK/IDRS',
        75.500000000000000000,
        15200.000000000000000000,
        1147600.000000000000000000,
        'PARTIALLY_FILLED',
        '2024-06-09 12:30:00+07',
        '2024-06-09 13:45:00+07',
        '0xorder3placed123456789012345678901234567890123456789012345678901234',
        NULL
    ),
    (
        'ORDER004',
        'PROS004',
        '0x4567890123456789012345678901234567890123',
        'BID',
        'ETK/IDRS',
        200.000000000000000000,
        14500.000000000000000000,
        2900000.000000000000000000,
        'CANCELLED',
        '2024-06-09 09:45:00+07',
        '2024-06-09 14:20:00+07',
        '0xorder4placed123456789012345678901234567890123456789012345678901234',
        NULL
    ),
    (
        'ORDER005',
        'PROS005',
        '0x5678901234567890123456789012345678901234',
        'ASK',
        'ETK/IDRS',
        300.000000000000000000,
        15100.000000000000000000,
        4530000.000000000000000000,
        'OPEN',
        '2024-06-09 13:20:00+07',
        '2024-06-09 13:20:00+07',
        '0xorder5placed123456789012345678901234567890123456789012345678901234',
        NULL
    );

-- Insert data dummy TRANSACTION_LOGS
INSERT INTO
    TRANSACTION_LOGS (
        prosumer_id,
        related_order_id,
        related_settlement_id,
        transaction_type,
        description,
        amount_primary,
        currency_primary,
        amount_secondary,
        currency_secondary,
        blockchain_tx_hash,
        transaction_timestamp
    )
VALUES (
        'PROS001',
        'ORDER001',
        NULL,
        'TRADE',
        'Sold 100 ETK at 15000 IDRS per ETK',
        100.000000000000000000,
        'ETK',
        1500000.000000000000000000,
        'IDRS',
        '0xorder1filled123456789012345678901234567890123456789012345678901234',
        '2024-06-09 10:30:00+07'
    ),
    (
        'PROS001',
        NULL,
        1,
        'SETTLEMENT',
        'Energy settlement for period 2024-06-08',
        152.450000000000000000,
        'ETK',
        NULL,
        NULL,
        '0xabc123def456789012345678901234567890123456789012345678901234567890',
        '2024-06-09 01:15:00+07'
    ),
    (
        'PROS002',
        NULL,
        2,
        'SETTLEMENT',
        'Energy settlement for period 2024-06-08',
        223.680000000000000000,
        'ETK',
        NULL,
        NULL,
        '0xdef456abc789012345678901234567890123456789012345678901234567890123',
        '2024-06-09 01:20:00+07'
    ),
    (
        'PROS003',
        NULL,
        3,
        'SETTLEMENT',
        'Energy consumption settlement for period 2024-06-08',
        8.125000000000000000,
        'ETK',
        NULL,
        NULL,
        '0x789012345678901234567890123456789012345678901234567890123456789abc',
        '2024-06-09 01:25:00+07'
    ),
    (
        'PROS005',
        NULL,
        5,
        'SETTLEMENT',
        'Energy settlement for period 2024-06-08',
        314.920000000000000000,
        'ETK',
        NULL,
        NULL,
        '0x123456789012345678901234567890123456789012345678901234567890abcdef',
        '2024-06-09 01:35:00+07'
    ),
    (
        'PROS002',
        NULL,
        NULL,
        'CONVERSION_IDR_IDRS',
        'Converted IDR to IDRS tokens',
        1000000.000000000000000000,
        'IDRS',
        1000000.000000000000000000,
        'IDR',
        '0xconversion123456789012345678901234567890123456789012345678901234567',
        '2024-06-09 09:00:00+07'
    );

-- Tambahan data dummy untuk tabel baru
INSERT INTO
    BLOCKCHAIN_APPROVALS (
        prosumer_id,
        wallet_address,
        spender_contract_address,
        token_contract_address,
        approved_amount,
        approval_tx_hash,
        status,
        created_at,
        confirmed_at
    )
VALUES (
        'PROS001',
        '0x1234567890123456789012345678901234567890',
        '0x9999999999999999999999999999999999999999',
        '0x8888888888888888888888888888888888888888',
        1000.000000000000000000,
        '0xapproval1hash123456789012345678901234567890123456789012345678901234',
        'APPROVED',
        '2024-06-09 09:30:00+07',
        '2024-06-09 09:35:00+07'
    ),
    (
        'PROS002',
        '0x2345678901234567890123456789012345678901',
        '0x9999999999999999999999999999999999999999',
        '0x7777777777777777777777777777777777777777',
        2000000.000000000000000000,
        '0xapproval2hash123456789012345678901234567890123456789012345678901234',
        'APPROVED',
        '2024-06-09 11:00:00+07',
        '2024-06-09 11:05:00+07'
    );

INSERT INTO
    MARKET_TRADES (
        buyer_order_id,
        seller_order_id,
        buyer_prosumer_id,
        seller_prosumer_id,
        buyer_wallet_address,
        seller_wallet_address,
        traded_etk_amount,
        price_idrs_per_etk,
        total_idrs_value,
        blockchain_tx_hash,
        trade_timestamp
    )
VALUES (
        'ORDER002',
        'ORDER001',
        'PROS002',
        'PROS001',
        '0x2345678901234567890123456789012345678901',
        '0x1234567890123456789012345678901234567890',
        100.000000000000000000,
        15000.000000000000000000,
        1500000.000000000000000000,
        '0xtrade1hash1234567890123456789012345678901234567890123456789012345678',
        '2024-06-09 10:30:00+07'
    );

INSERT INTO
    IDRS_CONVERSIONS (
        prosumer_id,
        wallet_address,
        conversion_type,
        idr_amount,
        idrs_amount,
        blockchain_tx_hash,
        status,
        simulation_note,
        created_at,
        confirmed_at
    )
VALUES (
        'PROS002',
        '0x2345678901234567890123456789012345678901',
        'ON_RAMP',
        1000000.00,
        1000000.000000000000000000,
        '0xonramp1hash123456789012345678901234567890123456789012345678901234567',
        'SUCCESS',
        'Simulasi konversi IDR ke IDRS untuk testing',
        '2024-06-09 08:00:00+07',
        '2024-06-09 08:05:00+07'
    ),
    (
        'PROS003',
        '0x3456789012345678901234567890123456789012',
        'ON_RAMP',
        500000.00,
        500000.000000000000000000,
        '0xonramp2hash123456789012345678901234567890123456789012345678901234567',
        'SUCCESS',
        'Simulasi konversi IDR ke IDRS untuk testing',
        '2024-06-09 12:00:00+07',
        '2024-06-09 12:05:00+07'
    );

-- Update MQTT topics berdasarkan meter_id
UPDATE SMART_METERS
SET
    mqtt_topic_realtime = 'enerlink/meters/' || meter_id || '/realtime',
    mqtt_topic_settlement = 'enerlink/meters/' || meter_id || '/settlement';

-- Tambahan constraints untuk validasi bisnis
ALTER TABLE ENERGY_SETTLEMENTS
ADD CONSTRAINT chk_settlement_interval CHECK (
    EXTRACT(
        EPOCH
        FROM (
                period_end_time - period_start_time
            )
    ) >= 60
);
-- Minimum 1 menit interval

ALTER TABLE MARKET_TRADES
ADD CONSTRAINT chk_positive_trade_amount CHECK (traded_etk_amount > 0),
ADD CONSTRAINT chk_positive_price CHECK (price_idrs_per_etk > 0);

ALTER TABLE IDRS_CONVERSIONS
ADD CONSTRAINT chk_positive_amounts CHECK (idrs_amount > 0);

-- Trigger untuk update last_used_at pada wallets
CREATE OR REPLACE FUNCTION update_wallet_last_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE WALLETS 
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE wallet_address = NEW.wallet_address;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wallet_last_used_orders
    AFTER INSERT ON TRADE_ORDERS_CACHE
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_last_used();

CREATE TRIGGER trg_update_wallet_last_used_trades
    AFTER INSERT ON MARKET_TRADES
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_last_used();

-- Drop the problematic triggers first
DROP TRIGGER IF EXISTS trg_update_wallet_last_used_orders ON TRADE_ORDERS_CACHE;

DROP TRIGGER IF EXISTS trg_update_wallet_last_used_trades ON MARKET_TRADES;

-- Create separate trigger functions for different tables
CREATE OR REPLACE FUNCTION update_wallet_last_used_from_orders()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE WALLETS 
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE wallet_address = NEW.wallet_address;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_wallet_last_used_from_trades()
RETURNS TRIGGER AS $$
BEGIN
    -- Update both buyer and seller wallets
    UPDATE WALLETS 
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE wallet_address IN (NEW.buyer_wallet_address, NEW.seller_wallet_address);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers with the correct functions
CREATE TRIGGER trg_update_wallet_last_used_orders
    AFTER INSERT ON TRADE_ORDERS_CACHE
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_last_used_from_orders();

CREATE TRIGGER trg_update_wallet_last_used_trades
    AFTER INSERT ON MARKET_TRADES
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_last_used_from_trades();

-- Also add trigger for blockchain approvals and idrs conversions
CREATE TRIGGER trg_update_wallet_last_used_approvals
    AFTER INSERT ON BLOCKCHAIN_APPROVALS
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_last_used_from_orders();

CREATE TRIGGER trg_update_wallet_last_used_conversions
    AFTER INSERT ON IDRS_CONVERSIONS
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_last_used_from_orders();

-- Tabel untuk MQTT Message Logs (comprehensive logging)
CREATE TABLE MQTT_MESSAGE_LOGS (
    log_id BIGSERIAL PRIMARY KEY,
    meter_id VARCHAR(255) NOT NULL,
    topic_type mqtt_topic_enum NOT NULL,
    direction mqtt_direction_enum NOT NULL,
    mqtt_topic VARCHAR(255) NOT NULL, -- full topic path
    payload JSONB NOT NULL, -- store full JSON payload
    raw_message TEXT, -- store raw message if needed
    message_timestamp TIMESTAMPTZ NOT NULL, -- when message was sent/received
    processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'SUCCESS',
    error_message TEXT,
    correlation_id VARCHAR(255), -- for tracking command-response pairs
    CONSTRAINT fk_mqtt_meter FOREIGN KEY (meter_id) REFERENCES SMART_METERS (meter_id) ON DELETE CASCADE
);

CREATE INDEX idx_mqtt_logs_meter_id ON MQTT_MESSAGE_LOGS (meter_id);

CREATE INDEX idx_mqtt_logs_topic_type ON MQTT_MESSAGE_LOGS (topic_type);

CREATE INDEX idx_mqtt_logs_direction ON MQTT_MESSAGE_LOGS (direction);

CREATE INDEX idx_mqtt_logs_timestamp ON MQTT_MESSAGE_LOGS (message_timestamp DESC);

CREATE INDEX idx_mqtt_logs_correlation ON MQTT_MESSAGE_LOGS (correlation_id);

-- Tabel untuk Device Commands (tracking outbound commands)
CREATE TABLE DEVICE_COMMANDS (
    command_id BIGSERIAL PRIMARY KEY,
    meter_id VARCHAR(255) NOT NULL,
    command_type VARCHAR(100) NOT NULL, -- 'GRID_CONTROL', 'ENERGY_RESET', 'CONFIG_UPDATE', etc.
    command_payload JSONB NOT NULL,
    correlation_id VARCHAR(255) UNIQUE NOT NULL,
    status command_status_enum DEFAULT 'SENT' NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    response_payload JSONB,
    error_details TEXT,
    sent_by_user VARCHAR(255), -- prosumer_id who initiated the command
    CONSTRAINT fk_command_meter FOREIGN KEY (meter_id) REFERENCES SMART_METERS (meter_id) ON DELETE CASCADE,
    CONSTRAINT fk_command_user FOREIGN KEY (sent_by_user) REFERENCES PROSUMERS (prosumer_id) ON DELETE SET NULL
);

CREATE INDEX idx_device_commands_meter ON DEVICE_COMMANDS (meter_id);

CREATE INDEX idx_device_commands_status ON DEVICE_COMMANDS (status);

CREATE INDEX idx_device_commands_type ON DEVICE_COMMANDS (command_type);

CREATE INDEX idx_device_commands_sent_at ON DEVICE_COMMANDS (sent_at DESC);

-- Tabel untuk Device Status Snapshots (dari topic status)
CREATE TABLE DEVICE_STATUS_SNAPSHOTS (
    snapshot_id BIGSERIAL PRIMARY KEY,
    meter_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    wifi_status JSONB, -- {"connected": true, "rssi": -45, "ip": "192.168.1.100"}
    mqtt_status JSONB, -- {"connected": true, "broker": "...", "last_ping": "..."
    grid_mode VARCHAR(50), -- 'importing', 'exporting', 'off'
    system_status JSONB, -- {"uptime": 12345, "free_heap": 50000, "temperature": 45.2}
    component_status JSONB, -- {"motor": "active", "pwm": 75, "relay": "closed"}
    raw_payload JSONB NOT NULL,
    CONSTRAINT fk_status_meter FOREIGN KEY (meter_id) REFERENCES SMART_METERS (meter_id) ON DELETE CASCADE
);

CREATE INDEX idx_device_status_meter_timestamp ON DEVICE_STATUS_SNAPSHOTS (meter_id, timestamp DESC);

CREATE INDEX idx_device_status_grid_mode ON DEVICE_STATUS_SNAPSHOTS (grid_mode);

-- Tabel untuk Granular Energy Readings per Subsystem
CREATE TABLE ENERGY_READINGS_DETAILED (
    reading_id BIGSERIAL PRIMARY KEY,
    meter_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    subsystem device_subsystem_enum NOT NULL,
    -- Energy values
    daily_energy_wh NUMERIC(15, 4),
    total_energy_wh NUMERIC(20, 4),
    settlement_energy_wh NUMERIC(15, 4),
    -- Power values (instantaneous)
    current_power_w NUMERIC(10, 4),
    voltage NUMERIC(8, 2),
    current_amp NUMERIC(8, 3),
    -- Subsystem specific data
    subsystem_data JSONB, -- flexible storage for subsystem-specific metrics
    raw_payload JSONB NOT NULL,
    CONSTRAINT fk_detailed_reading_meter FOREIGN KEY (meter_id) REFERENCES SMART_METERS (meter_id) ON DELETE CASCADE
);

CREATE INDEX idx_energy_detailed_meter_time ON ENERGY_READINGS_DETAILED (meter_id, timestamp DESC);

CREATE INDEX idx_energy_detailed_subsystem ON ENERGY_READINGS_DETAILED (subsystem);

CREATE INDEX idx_energy_detailed_timestamp ON ENERGY_READINGS_DETAILED (timestamp DESC);

-- Tabel untuk Device Heartbeats
CREATE TABLE DEVICE_HEARTBEATS (
    heartbeat_id BIGSERIAL PRIMARY KEY,
    meter_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    uptime_seconds BIGINT,
    free_heap_bytes BIGINT,
    signal_strength INTEGER, -- WiFi RSSI
    additional_metrics JSONB, -- for future extensibility
    CONSTRAINT fk_heartbeat_meter FOREIGN KEY (meter_id) REFERENCES SMART_METERS (meter_id) ON DELETE CASCADE
);

CREATE INDEX idx_heartbeats_meter_timestamp ON DEVICE_HEARTBEATS (meter_id, timestamp DESC);

-- Add foreign key constraint to ENERGY_SETTLEMENTS for MQTT message tracking
ALTER TABLE ENERGY_SETTLEMENTS
ADD CONSTRAINT fk_settlement_mqtt FOREIGN KEY (mqtt_message_id) REFERENCES MQTT_MESSAGE_LOGS (log_id) ON DELETE SET NULL;

-- Enhanced dummy data for new IoT tables
INSERT INTO
    MQTT_MESSAGE_LOGS (
        meter_id,
        topic_type,
        direction,
        mqtt_topic,
        payload,
        message_timestamp,
        correlation_id
    )
VALUES (
        'METER001',
        'SENSORS',
        'INBOUND',
        'home/energy-monitor/sensors',
        '{
        "timestamp": "2024-06-09T14:00:00Z",
        "export": {"daily_energy_wh": 15240, "total_energy_wh": 487632, "settlement_energy_wh": 1524},
        "import": {"daily_energy_wh": 8760, "total_energy_wh": 298451, "settlement_energy_wh": 876},
        "battery": {"daily_energy_wh": 4200, "total_energy_wh": 128340, "settlement_energy_wh": 420, "soc": 85, "power": 250},
        "solar": {"daily_energy_wh": 12800, "total_energy_wh": 456789, "settlement_energy_wh": 1280, "power": 2500},
        "load": {"daily_energy_wh": 9800, "total_energy_wh": 342156, "settlement_energy_wh": 980, "power": 1250}
    }'::jsonb,
        '2024-06-09 14:00:00+07',
        NULL
    ),
    (
        'METER001',
        'HEARTBEAT',
        'INBOUND',
        'home/energy-monitor/heartbeat',
        '{"timestamp": "2024-06-09T14:00:30Z", "uptime": 86400, "free_heap": 45000}'::jsonb,
        '2024-06-09 14:00:30+07',
        NULL
    ),
    (
        'METER001',
        'COMMAND',
        'OUTBOUND',
        'home/energy-monitor/command',
        '{"grid": "export", "timestamp": "2024-06-09T14:01:00Z"}'::jsonb,
        '2024-06-09 14:01:00+07',
        'CMD-001-2024060914'
    ),
    (
        'METER002',
        'STATUS',
        'INBOUND',
        'home/energy-monitor/status',
        '{
        "timestamp": "2024-06-09T14:05:00Z",
        "wifi": {"connected": true, "rssi": -38, "ip": "192.168.1.101"},
        "mqtt": {"connected": true, "broker": "mqtt.enerlink.local"},
        "grid": "importing",
        "system": {"uptime": 172800, "free_heap": 42000, "temperature": 40.2},
        "components": {"motor": "idle", "pwm": 0, "relay": "open"}
    }'::jsonb,
        '2024-06-09 14:05:00+07',
        NULL
    );

INSERT INTO
    DEVICE_COMMANDS (
        meter_id,
        command_type,
        command_payload,
        correlation_id,
        sent_by_user,
        timeout_at
    )
VALUES (
        'METER001',
        'GRID_CONTROL',
        '{"grid": "export"}'::jsonb,
        'CMD-001-2024060914',
        'PROS001',
        '2024-06-09 14:06:00+07'
    ),
    (
        'METER002',
        'ENERGY_RESET',
        '{"energy": {"reset_settlement": "all"}}'::jsonb,
        'CMD-002-2024060914',
        'PROS002',
        '2024-06-09 14:11:00+07'
    ),
    (
        'METER003',
        'CONFIG_UPDATE',
        '{"mqtt": {"sensor_interval": 10000}}'::jsonb,
        'CMD-003-2024060914',
        'PROS003',
        '2024-06-09 14:16:00+07'
    );

INSERT INTO
    DEVICE_STATUS_SNAPSHOTS (
        meter_id,
        timestamp,
        wifi_status,
        mqtt_status,
        grid_mode,
        system_status,
        component_status,
        raw_payload
    )
VALUES (
        'METER001',
        '2024-06-09 14:00:00+07',
        '{"connected": true, "rssi": -45, "ip": "192.168.1.100"}'::jsonb,
        '{"connected": true, "broker": "mqtt.enerlink.local", "last_ping": "2024-06-09T14:00:00Z"}'::jsonb,
        'exporting',
        '{"uptime": 86400, "free_heap": 45000, "temperature": 42.5}'::jsonb,
        '{"motor": "active", "pwm": 75, "relay": "closed"}'::jsonb,
        '{"wifi": {"connected": true, "rssi": -45}, "mqtt": {"connected": true}, "grid": "exporting", "system": {"uptime": 86400}}'::jsonb
    ),
    (
        'METER002',
        '2024-06-09 14:05:00+07',
        '{"connected": true, "rssi": -38, "ip": "192.168.1.101"}'::jsonb,
        '{"connected": true, "broker": "mqtt.enerlink.local", "last_ping": "2024-06-09T14:05:00Z"}'::jsonb,
        'importing',
        '{"uptime": 172800, "free_heap": 42000, "temperature": 40.2}'::jsonb,
        '{"motor": "idle", "pwm": 0, "relay": "open"}'::jsonb,
        '{"wifi": {"connected": true, "rssi": -38}, "mqtt": {"connected": true}, "grid": "importing", "system": {"uptime": 172800}}'::jsonb
    );

INSERT INTO
    ENERGY_READINGS_DETAILED (
        meter_id,
        timestamp,
        subsystem,
        daily_energy_wh,
        total_energy_wh,
        settlement_energy_wh,
        current_power_w,
        subsystem_data,
        raw_payload
    )
VALUES (
        'METER001',
        '2024-06-09 14:00:00+07',
        'GRID',
        15240.0,
        487632.0,
        1524.0,
        2500.0,
        '{"direction": "export", "frequency": 50.1, "power_factor": 0.95}'::jsonb,
        '{"export": {"daily_energy_wh": 15240, "power": 2500}}'::jsonb
    ),
    (
        'METER001',
        '2024-06-09 14:00:00+07',
        'SOLAR',
        12800.0,
        456789.0,
        1280.0,
        2800.0,
        '{"irradiance": 850, "panel_temp": 45.2, "efficiency": 0.18}'::jsonb,
        '{"solar": {"daily_energy_wh": 12800, "power": 2800}}'::jsonb
    ),
    (
        'METER001',
        '2024-06-09 14:00:00+07',
        'BATTERY',
        4200.0,
        128340.0,
        420.0,
        250.0,
        '{"soc": 85, "voltage": 48.5, "temperature": 28.5, "charge_state": "charging"}'::jsonb,
        '{"battery": {"daily_energy_wh": 4200, "power": 250, "soc": 85}}'::jsonb
    ),
    (
        'METER001',
        '2024-06-09 14:00:00+07',
        'LOAD',
        9800.0,
        342156.0,
        980.0,
        1250.0,
        '{"power_factor": 0.92, "reactive_power": 150}'::jsonb,
        '{"load": {"daily_energy_wh": 9800, "power": 1250}}'::jsonb
    ),
    (
        'METER002',
        '2024-06-09 14:05:00+07',
        'GRID',
        22368.0,
        298451.0,
        2236.8,
        3500.0,
        '{"direction": "import", "frequency": 50.0, "power_factor": 0.90}'::jsonb,
        '{"import": {"daily_energy_wh": 22368, "power": 3500}}'::jsonb
    ),
    (
        'METER002',
        '2024-06-09 14:05:00+07',
        'SOLAR',
        0.0,
        0.0,
        0.0,
        0.0,
        '{}'::jsonb,
        '{"solar": {"daily_energy_wh": 0, "power": 0}}'::jsonb
    ),
    (
        'METER002',
        '2024-06-09 14:05:00+07',
        'BATTERY',
        0.0,
        0.0,
        0.0,
        0.0,
        '{}'::jsonb,
        '{"battery": {"daily_energy_wh": 0, "power": 0, "soc": 0}}'::jsonb
    ),
    (
        'METER002',
        '2024-06-09 14:05:00+07',
        'LOAD',
        22368.0,
        298451.0,
        2236.8,
        3500.0,
        '{"power_factor": 0.85, "reactive_power": 300}'::jsonb,
        '{"load": {"daily_energy_wh": 22368, "power": 3500}}'::jsonb
    );

INSERT INTO
    DEVICE_HEARTBEATS (
        meter_id,
        timestamp,
        uptime_seconds,
        free_heap_bytes,
        signal_strength,
        additional_metrics
    )
VALUES (
        'METER001',
        '2024-06-09 14:00:30+07',
        86400,
        45000,
        -45,
        '{"cpu_usage": 15.5, "memory_usage": 62.3, "temperature": 42.5}'::jsonb
    ),
    (
        'METER002',
        '2024-06-09 14:00:35+07',
        172800,
        42000,
        -38,
        '{"cpu_usage": 12.8, "memory_usage": 58.1, "temperature": 40.2}'::jsonb
    ),
    (
        'METER003',
        '2024-06-09 14:00:40+07',
        259200,
        38500,
        -52,
        '{"cpu_usage": 18.2, "memory_usage": 71.4, "temperature": 44.8}'::jsonb
    );

-- Update existing smart meters with enhanced IoT data
UPDATE SMART_METERS
SET
    device_configuration = '{"sensor_interval_ms": 5000, "heartbeat_interval_ms": 30000, "settlement_interval_minutes": 5}'::jsonb,
    device_model = 'EnerLink-SM-Pro',
    device_version = '2.1.4',
    capabilities = '{"has_battery": true, "has_solar": true, "has_motor": true, "has_pwm": true}'::jsonb,
    last_heartbeat_at = '2024-06-09 14:00:30+07'
WHERE
    meter_id = 'METER001';

UPDATE SMART_METERS
SET
    device_configuration = '{"sensor_interval_ms": 10000, "heartbeat_interval_ms": 60000, "settlement_interval_minutes": 5}'::jsonb,
    device_model = 'EnerLink-SM-Lite',
    device_version = '2.0.8',
    capabilities = '{"has_battery": false, "has_solar": true, "has_motor": false, "has_pwm": false}'::jsonb,
    last_heartbeat_at = '2024-06-09 14:00:35+07'
WHERE
    meter_id = 'METER002';

-- Function to update last_heartbeat_at when heartbeat is received
CREATE OR REPLACE FUNCTION update_meter_last_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE SMART_METERS 
    SET last_heartbeat_at = NEW.timestamp,
        last_seen = NEW.timestamp
    WHERE meter_id = NEW.meter_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_meter_heartbeat
    AFTER INSERT ON DEVICE_HEARTBEATS
    FOR EACH ROW
    EXECUTE FUNCTION update_meter_last_heartbeat();

-- Function to automatically update command status based on MQTT response
CREATE OR REPLACE FUNCTION update_command_status_from_mqtt()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an inbound message with correlation_id, update command status
    IF NEW.direction = 'INBOUND' AND NEW.correlation_id IS NOT NULL THEN
        UPDATE DEVICE_COMMANDS 
        SET status = 'ACKNOWLEDGED',
            acknowledged_at = NEW.message_timestamp,
            response_payload = NEW.payload
        WHERE correlation_id = NEW.correlation_id
        AND status = 'SENT';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_command_status
    AFTER INSERT ON MQTT_MESSAGE_LOGS
    FOR EACH ROW
    EXECUTE FUNCTION update_command_status_from_mqtt();

-- Function to handle command timeouts
CREATE OR REPLACE FUNCTION handle_command_timeouts()
RETURNS void AS $$
BEGIN
    UPDATE DEVICE_COMMANDS 
    SET status = 'TIMEOUT',
        error_details = 'Command timed out without acknowledgment'
    WHERE status = 'SENT' 
    AND timeout_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;