--
-- PostgreSQL database dump
--

\restrict clTCEjndlEzFFp8JyUrkwB1fotxreFxZulYPVSLDRa9ti5pV39zZCVhn4DXarsb

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg130+1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-2.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: approval_status_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.approval_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EXPIRED'
);


ALTER TYPE public.approval_status_enum OWNER TO enerlink_user;

--
-- Name: blacklist_reason_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.blacklist_reason_enum AS ENUM (
    'LOGOUT',
    'LOGOUT_ALL_DEVICES',
    'SECURITY_BREACH',
    'ADMIN_ACTION',
    'EXPIRED'
);


ALTER TYPE public.blacklist_reason_enum OWNER TO enerlink_user;

--
-- Name: blacklist_type_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.blacklist_type_enum AS ENUM (
    'TOKEN',
    'USER'
);


ALTER TYPE public.blacklist_type_enum OWNER TO enerlink_user;

--
-- Name: command_status_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.command_status_enum AS ENUM (
    'SENT',
    'ACKNOWLEDGED',
    'FAILED',
    'TIMEOUT'
);


ALTER TYPE public.command_status_enum OWNER TO enerlink_user;

--
-- Name: currency_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.currency_enum AS ENUM (
    'ETK',
    'IDRS',
    'IDR'
);


ALTER TYPE public.currency_enum OWNER TO enerlink_user;

--
-- Name: device_subsystem_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.device_subsystem_enum AS ENUM (
    'GRID_EXPORT',
    'GRID_IMPORT',
    'BATTERY',
    'SOLAR',
    'LOAD',
    'SYSTEM'
);


ALTER TYPE public.device_subsystem_enum OWNER TO enerlink_user;

--
-- Name: flow_direction_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.flow_direction_enum AS ENUM (
    'IMPORT',
    'EXPORT',
    'CONSUMPTION',
    'GENERATION'
);


ALTER TYPE public.flow_direction_enum OWNER TO enerlink_user;

--
-- Name: mqtt_direction_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.mqtt_direction_enum AS ENUM (
    'INBOUND',
    'OUTBOUND'
);


ALTER TYPE public.mqtt_direction_enum OWNER TO enerlink_user;

--
-- Name: mqtt_topic_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.mqtt_topic_enum AS ENUM (
    'SENSORS',
    'STATUS',
    'COMMAND',
    'SETTLEMENT'
);


ALTER TYPE public.mqtt_topic_enum OWNER TO enerlink_user;

--
-- Name: order_status_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.order_status_enum AS ENUM (
    'OPEN',
    'PARTIALLY_FILLED',
    'FILLED',
    'CANCELLED'
);


ALTER TYPE public.order_status_enum OWNER TO enerlink_user;

--
-- Name: order_type_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.order_type_enum AS ENUM (
    'BID',
    'ASK'
);


ALTER TYPE public.order_type_enum OWNER TO enerlink_user;

--
-- Name: settlement_trigger_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.settlement_trigger_enum AS ENUM (
    'PERIODIC',
    'MANUAL',
    'THRESHOLD'
);


ALTER TYPE public.settlement_trigger_enum OWNER TO enerlink_user;

--
-- Name: transaction_log_type_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.transaction_log_type_enum AS ENUM (
    'ENERGY_SETTLEMENT',
    'TOKEN_MINT',
    'TOKEN_BURN',
    'MARKET_ORDER',
    'ORDER_PLACED',
    'TRADE_EXECUTION',
    'WALLET_CREATED',
    'WALLET_IMPORTED',
    'IDRS_CONVERSION',
    'TOKEN_APPROVAL',
    'DEVICE_COMMAND',
    'ORDER_CANCELLED',
    'CONTRACT_INTERACTION',
    'SYSTEM_EVENT'
);


ALTER TYPE public.transaction_log_type_enum OWNER TO enerlink_user;

--
-- Name: transaction_status_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.transaction_status_enum AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);


ALTER TYPE public.transaction_status_enum OWNER TO enerlink_user;

--
-- Name: wallet_import_method_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.wallet_import_method_enum AS ENUM (
    'GENERATED',
    'IMPORTED'
);


ALTER TYPE public.wallet_import_method_enum OWNER TO enerlink_user;

--
-- Name: cleanup_expired_blacklist(); Type: FUNCTION; Schema: public; Owner: enerlink_user
--

CREATE FUNCTION public.cleanup_expired_blacklist() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE TOKEN_BLACKLIST 
    SET is_active = FALSE
    WHERE expires_at < CURRENT_TIMESTAMP 
    AND is_active = TRUE;
END;
$$;


ALTER FUNCTION public.cleanup_expired_blacklist() OWNER TO enerlink_user;

--
-- Name: handle_command_timeouts(); Type: FUNCTION; Schema: public; Owner: enerlink_user
--

CREATE FUNCTION public.handle_command_timeouts() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE DEVICE_COMMANDS 
    SET status = 'TIMEOUT',
        error_details = 'Command timed out without acknowledgment'
    WHERE status = 'SENT' 
    AND timeout_at < CURRENT_TIMESTAMP;
END;
$$;


ALTER FUNCTION public.handle_command_timeouts() OWNER TO enerlink_user;

--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: enerlink_user
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_timestamp() OWNER TO enerlink_user;

--
-- Name: update_command_status_from_mqtt(); Type: FUNCTION; Schema: public; Owner: enerlink_user
--

CREATE FUNCTION public.update_command_status_from_mqtt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_command_status_from_mqtt() OWNER TO enerlink_user;

--
-- Name: update_meter_last_heartbeat(); Type: FUNCTION; Schema: public; Owner: enerlink_user
--

CREATE FUNCTION public.update_meter_last_heartbeat() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE SMART_METERS 
    SET last_heartbeat_at = NEW.timestamp,
        last_seen = NEW.timestamp
    WHERE meter_id = NEW.meter_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_meter_last_heartbeat() OWNER TO enerlink_user;

--
-- Name: update_wallet_last_used(); Type: FUNCTION; Schema: public; Owner: enerlink_user
--

CREATE FUNCTION public.update_wallet_last_used() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE WALLETS 
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE wallet_address = NEW.wallet_address;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_wallet_last_used() OWNER TO enerlink_user;

--
-- Name: update_wallet_last_used_from_orders(); Type: FUNCTION; Schema: public; Owner: enerlink_user
--

CREATE FUNCTION public.update_wallet_last_used_from_orders() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE WALLETS 
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE wallet_address = NEW.wallet_address;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_wallet_last_used_from_orders() OWNER TO enerlink_user;

--
-- Name: update_wallet_last_used_from_trades(); Type: FUNCTION; Schema: public; Owner: enerlink_user
--

CREATE FUNCTION public.update_wallet_last_used_from_trades() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update both buyer and seller wallets
    UPDATE WALLETS 
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE wallet_address IN (NEW.buyer_wallet_address, NEW.seller_wallet_address);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_wallet_last_used_from_trades() OWNER TO enerlink_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: device_commands; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.device_commands (
    command_id bigint NOT NULL,
    meter_id character varying(255) NOT NULL,
    command_type character varying(100) NOT NULL,
    command_payload jsonb NOT NULL,
    correlation_id character varying(255) NOT NULL,
    status public.command_status_enum DEFAULT 'SENT'::public.command_status_enum NOT NULL,
    sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    acknowledged_at timestamp with time zone,
    timeout_at timestamp with time zone,
    response_payload jsonb,
    error_details text,
    sent_by_user character varying(255)
);


ALTER TABLE public.device_commands OWNER TO enerlink_user;

--
-- Name: device_commands_command_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.device_commands_command_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_commands_command_id_seq OWNER TO enerlink_user;

--
-- Name: device_commands_command_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.device_commands_command_id_seq OWNED BY public.device_commands.command_id;


--
-- Name: device_status_snapshots; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.device_status_snapshots (
    snapshot_id bigint NOT NULL,
    meter_id character varying(255) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    wifi_status jsonb,
    mqtt_status jsonb,
    grid_mode character varying(50),
    system_status jsonb,
    component_status jsonb,
    raw_payload jsonb NOT NULL
);


ALTER TABLE public.device_status_snapshots OWNER TO enerlink_user;

--
-- Name: device_status_snapshots_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.device_status_snapshots_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_status_snapshots_snapshot_id_seq OWNER TO enerlink_user;

--
-- Name: device_status_snapshots_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.device_status_snapshots_snapshot_id_seq OWNED BY public.device_status_snapshots.snapshot_id;


--
-- Name: energy_readings_detailed; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.energy_readings_detailed (
    reading_id bigint NOT NULL,
    meter_id character varying(255) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    subsystem public.device_subsystem_enum NOT NULL,
    daily_energy_wh numeric(15,4),
    total_energy_wh numeric(20,4),
    settlement_energy_wh numeric(15,4),
    current_power_w numeric(10,4),
    voltage numeric(8,2),
    current_amp numeric(8,3),
    subsystem_data jsonb,
    raw_payload jsonb NOT NULL
);


ALTER TABLE public.energy_readings_detailed OWNER TO enerlink_user;

--
-- Name: energy_readings_detailed_reading_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.energy_readings_detailed_reading_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.energy_readings_detailed_reading_id_seq OWNER TO enerlink_user;

--
-- Name: energy_readings_detailed_reading_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.energy_readings_detailed_reading_id_seq OWNED BY public.energy_readings_detailed.reading_id;


--
-- Name: energy_settlements; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.energy_settlements (
    settlement_id bigint NOT NULL,
    meter_id character varying(255) NOT NULL,
    period_start_time timestamp with time zone NOT NULL,
    period_end_time timestamp with time zone NOT NULL,
    net_kwh_from_grid numeric(12,4) NOT NULL,
    etk_amount_credited numeric(28,18),
    blockchain_tx_hash character varying(128),
    status public.transaction_status_enum DEFAULT 'PENDING'::public.transaction_status_enum NOT NULL,
    created_at_backend timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at_on_chain timestamp with time zone,
    settlement_trigger public.settlement_trigger_enum DEFAULT 'PERIODIC'::public.settlement_trigger_enum NOT NULL,
    raw_export_kwh numeric(12,4),
    raw_import_kwh numeric(12,4),
    validation_status character varying(50) DEFAULT 'VALID'::character varying,
    settlement_data_source character varying(50) DEFAULT 'MQTT_SETTLEMENT'::character varying,
    detailed_energy_breakdown jsonb,
    mqtt_message_id bigint,
    CONSTRAINT chk_settlement_interval CHECK ((EXTRACT(epoch FROM (period_end_time - period_start_time)) >= (60)::numeric))
);


ALTER TABLE public.energy_settlements OWNER TO enerlink_user;

--
-- Name: energy_settlements_settlement_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.energy_settlements_settlement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.energy_settlements_settlement_id_seq OWNER TO enerlink_user;

--
-- Name: energy_settlements_settlement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.energy_settlements_settlement_id_seq OWNED BY public.energy_settlements.settlement_id;


--
-- Name: idrs_conversions; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.idrs_conversions (
    conversion_id bigint NOT NULL,
    prosumer_id character varying(255) NOT NULL,
    wallet_address character varying(42) NOT NULL,
    conversion_type character varying(20) NOT NULL,
    idr_amount numeric(15,2),
    idrs_amount numeric(28,18) NOT NULL,
    exchange_rate numeric(10,6) DEFAULT 1.000000,
    blockchain_tx_hash character varying(128),
    status public.transaction_status_enum DEFAULT 'PENDING'::public.transaction_status_enum NOT NULL,
    simulation_note text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at timestamp with time zone,
    CONSTRAINT chk_conversion_type CHECK (((conversion_type)::text = ANY (ARRAY[('ON_RAMP'::character varying)::text, ('OFF_RAMP'::character varying)::text]))),
    CONSTRAINT chk_positive_amounts CHECK ((idrs_amount > (0)::numeric))
);


ALTER TABLE public.idrs_conversions OWNER TO enerlink_user;

--
-- Name: idrs_conversions_conversion_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.idrs_conversions_conversion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.idrs_conversions_conversion_id_seq OWNER TO enerlink_user;

--
-- Name: idrs_conversions_conversion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.idrs_conversions_conversion_id_seq OWNED BY public.idrs_conversions.conversion_id;


--
-- Name: market_trades; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.market_trades (
    trade_id bigint NOT NULL,
    buyer_order_id character varying(255) NOT NULL,
    seller_order_id character varying(255) NOT NULL,
    buyer_prosumer_id character varying(255) NOT NULL,
    seller_prosumer_id character varying(255) NOT NULL,
    buyer_wallet_address character varying(42) NOT NULL,
    seller_wallet_address character varying(42) NOT NULL,
    traded_etk_amount numeric(28,18) NOT NULL,
    price_idrs_per_etk numeric(28,18) NOT NULL,
    total_idrs_value numeric(38,18) NOT NULL,
    blockchain_tx_hash character varying(128),
    trade_timestamp timestamp with time zone NOT NULL,
    gas_fee_wei numeric(28,0),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_positive_price CHECK ((price_idrs_per_etk > (0)::numeric)),
    CONSTRAINT chk_positive_trade_amount CHECK ((traded_etk_amount > (0)::numeric))
);


ALTER TABLE public.market_trades OWNER TO enerlink_user;

--
-- Name: market_trades_trade_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.market_trades_trade_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.market_trades_trade_id_seq OWNER TO enerlink_user;

--
-- Name: market_trades_trade_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.market_trades_trade_id_seq OWNED BY public.market_trades.trade_id;


--
-- Name: mqtt_message_logs; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.mqtt_message_logs (
    log_id bigint NOT NULL,
    meter_id character varying(255) NOT NULL,
    topic_type public.mqtt_topic_enum NOT NULL,
    direction public.mqtt_direction_enum NOT NULL,
    mqtt_topic character varying(255) NOT NULL,
    payload jsonb NOT NULL,
    raw_message text,
    message_timestamp timestamp with time zone NOT NULL,
    processed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processing_status character varying(50) DEFAULT 'SUCCESS'::character varying,
    error_message text,
    correlation_id character varying(255)
);


ALTER TABLE public.mqtt_message_logs OWNER TO enerlink_user;

--
-- Name: mqtt_message_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.mqtt_message_logs_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mqtt_message_logs_log_id_seq OWNER TO enerlink_user;

--
-- Name: mqtt_message_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.mqtt_message_logs_log_id_seq OWNED BY public.mqtt_message_logs.log_id;


--
-- Name: prosumers; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.prosumers (
    prosumer_id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    name character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    primary_wallet_address character varying(255),
    CONSTRAINT chk_valid_email CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);


ALTER TABLE public.prosumers OWNER TO enerlink_user;

--
-- Name: smart_meters; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.smart_meters (
    meter_id character varying(255) NOT NULL,
    prosumer_id character varying(255) NOT NULL,
    meter_blockchain_address character varying(42),
    location text,
    status character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen timestamp with time zone,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    mqtt_topic_realtime character varying(255),
    mqtt_topic_settlement character varying(255),
    settlement_interval_minutes integer DEFAULT 5,
    firmware_version character varying(50),
    last_settlement_at timestamp with time zone,
    device_configuration jsonb DEFAULT '{}'::jsonb,
    last_heartbeat_at timestamp with time zone,
    device_model character varying(100),
    device_version character varying(50),
    capabilities jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.smart_meters OWNER TO enerlink_user;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.system_config (
    config_key character varying(255) NOT NULL,
    config_value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by character varying(255)
);


ALTER TABLE public.system_config OWNER TO enerlink_user;

--
-- Name: token_blacklist; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.token_blacklist (
    blacklist_id bigint NOT NULL,
    blacklist_type public.blacklist_type_enum NOT NULL,
    prosumer_id character varying(255) NOT NULL,
    token_hash character varying(255),
    reason public.blacklist_reason_enum DEFAULT 'LOGOUT'::public.blacklist_reason_enum NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying(255),
    notes text
);


ALTER TABLE public.token_blacklist OWNER TO enerlink_user;

--
-- Name: token_blacklist_blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.token_blacklist_blacklist_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.token_blacklist_blacklist_id_seq OWNER TO enerlink_user;

--
-- Name: token_blacklist_blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.token_blacklist_blacklist_id_seq OWNED BY public.token_blacklist.blacklist_id;


--
-- Name: trade_orders_cache; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.trade_orders_cache (
    order_id character varying(255) NOT NULL,
    prosumer_id character varying(255) NOT NULL,
    wallet_address character varying(42) NOT NULL,
    order_type public.order_type_enum NOT NULL,
    pair character varying(20) DEFAULT 'ETK/IDRS'::character varying NOT NULL,
    amount_etk numeric(28,18) NOT NULL,
    price_idrs_per_etk numeric(28,18) NOT NULL,
    total_idrs_value numeric(38,18),
    status_on_chain public.order_status_enum DEFAULT 'OPEN'::public.order_status_enum NOT NULL,
    created_at_on_chain timestamp with time zone NOT NULL,
    updated_at_cache timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    blockchain_tx_hash_placed character varying(128),
    blockchain_tx_hash_filled character varying(128),
    blockchain_tx_hash_cancelled character varying(128)
);


ALTER TABLE public.trade_orders_cache OWNER TO enerlink_user;

--
-- Name: transaction_logs; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.transaction_logs (
    log_id bigint NOT NULL,
    prosumer_id character varying(255) NOT NULL,
    related_order_id character varying(255),
    related_settlement_id bigint,
    transaction_type public.transaction_log_type_enum NOT NULL,
    description text,
    amount_primary numeric(38,18) NOT NULL,
    currency_primary public.currency_enum NOT NULL,
    amount_secondary numeric(38,18),
    currency_secondary public.currency_enum,
    blockchain_tx_hash character varying(128),
    transaction_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.transaction_logs OWNER TO enerlink_user;

--
-- Name: transaction_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.transaction_logs_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_logs_log_id_seq OWNER TO enerlink_user;

--
-- Name: transaction_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.transaction_logs_log_id_seq OWNED BY public.transaction_logs.log_id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.wallets (
    wallet_address character varying(42) NOT NULL,
    prosumer_id character varying(255) NOT NULL,
    wallet_name character varying(255),
    encrypted_private_key text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    import_method public.wallet_import_method_enum DEFAULT 'GENERATED'::public.wallet_import_method_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp with time zone,
    CONSTRAINT chk_wallet_address_format CHECK (((wallet_address)::text ~* '^0x[a-fA-F0-9]{40}$'::text))
);


ALTER TABLE public.wallets OWNER TO enerlink_user;

--
-- Name: device_commands command_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.device_commands ALTER COLUMN command_id SET DEFAULT nextval('public.device_commands_command_id_seq'::regclass);


--
-- Name: device_status_snapshots snapshot_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.device_status_snapshots ALTER COLUMN snapshot_id SET DEFAULT nextval('public.device_status_snapshots_snapshot_id_seq'::regclass);


--
-- Name: energy_readings_detailed reading_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.energy_readings_detailed ALTER COLUMN reading_id SET DEFAULT nextval('public.energy_readings_detailed_reading_id_seq'::regclass);


--
-- Name: energy_settlements settlement_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.energy_settlements ALTER COLUMN settlement_id SET DEFAULT nextval('public.energy_settlements_settlement_id_seq'::regclass);


--
-- Name: idrs_conversions conversion_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.idrs_conversions ALTER COLUMN conversion_id SET DEFAULT nextval('public.idrs_conversions_conversion_id_seq'::regclass);


--
-- Name: market_trades trade_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades ALTER COLUMN trade_id SET DEFAULT nextval('public.market_trades_trade_id_seq'::regclass);


--
-- Name: mqtt_message_logs log_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.mqtt_message_logs ALTER COLUMN log_id SET DEFAULT nextval('public.mqtt_message_logs_log_id_seq'::regclass);


--
-- Name: token_blacklist blacklist_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.token_blacklist ALTER COLUMN blacklist_id SET DEFAULT nextval('public.token_blacklist_blacklist_id_seq'::regclass);


--
-- Name: transaction_logs log_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.transaction_logs ALTER COLUMN log_id SET DEFAULT nextval('public.transaction_logs_log_id_seq'::regclass);


--
-- Name: device_commands device_commands_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT device_commands_correlation_id_key UNIQUE (correlation_id);


--
-- Name: device_commands device_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT device_commands_pkey PRIMARY KEY (command_id);


--
-- Name: device_status_snapshots device_status_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.device_status_snapshots
    ADD CONSTRAINT device_status_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: energy_settlements energy_settlements_blockchain_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT energy_settlements_blockchain_tx_hash_key UNIQUE (blockchain_tx_hash);


--
-- Name: energy_settlements energy_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT energy_settlements_pkey PRIMARY KEY (settlement_id);


--
-- Name: idrs_conversions idrs_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.idrs_conversions
    ADD CONSTRAINT idrs_conversions_pkey PRIMARY KEY (conversion_id);


--
-- Name: market_trades market_trades_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT market_trades_pkey PRIMARY KEY (trade_id);


--
-- Name: prosumers prosumers_email_key; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.prosumers
    ADD CONSTRAINT prosumers_email_key UNIQUE (email);


--
-- Name: prosumers prosumers_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.prosumers
    ADD CONSTRAINT prosumers_pkey PRIMARY KEY (prosumer_id);


--
-- Name: smart_meters smart_meters_meter_blockchain_address_key; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.smart_meters
    ADD CONSTRAINT smart_meters_meter_blockchain_address_key UNIQUE (meter_blockchain_address);


--
-- Name: smart_meters smart_meters_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.smart_meters
    ADD CONSTRAINT smart_meters_pkey PRIMARY KEY (meter_id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (config_key);


--
-- Name: token_blacklist token_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_pkey PRIMARY KEY (blacklist_id);


--
-- Name: trade_orders_cache trade_orders_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.trade_orders_cache
    ADD CONSTRAINT trade_orders_cache_pkey PRIMARY KEY (order_id);


--
-- Name: transaction_logs transaction_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT transaction_logs_pkey PRIMARY KEY (log_id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (wallet_address);


--
-- Name: idx_device_commands_meter; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_device_commands_meter ON public.device_commands USING btree (meter_id);


--
-- Name: idx_device_commands_sent_at; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_device_commands_sent_at ON public.device_commands USING btree (sent_at DESC);


--
-- Name: idx_device_commands_status; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_device_commands_status ON public.device_commands USING btree (status);


--
-- Name: idx_device_commands_type; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_device_commands_type ON public.device_commands USING btree (command_type);


--
-- Name: idx_energy_settlements_meter_id; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_energy_settlements_meter_id ON public.energy_settlements USING btree (meter_id);


--
-- Name: idx_idrs_conversions_prosumer; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_idrs_conversions_prosumer ON public.idrs_conversions USING btree (prosumer_id);


--
-- Name: idx_idrs_conversions_status; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_idrs_conversions_status ON public.idrs_conversions USING btree (status);


--
-- Name: idx_idrs_conversions_type; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_idrs_conversions_type ON public.idrs_conversions USING btree (conversion_type);


--
-- Name: idx_market_trades_buyer; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_market_trades_buyer ON public.market_trades USING btree (buyer_prosumer_id);


--
-- Name: idx_market_trades_seller; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_market_trades_seller ON public.market_trades USING btree (seller_prosumer_id);


--
-- Name: idx_market_trades_timestamp; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_market_trades_timestamp ON public.market_trades USING btree (trade_timestamp DESC);


--
-- Name: idx_smart_meters_prosumer_id; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_smart_meters_prosumer_id ON public.smart_meters USING btree (prosumer_id);


--
-- Name: idx_token_blacklist_active; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_token_blacklist_active ON public.token_blacklist USING btree (is_active);


--
-- Name: idx_token_blacklist_created; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_token_blacklist_created ON public.token_blacklist USING btree (created_at DESC);


--
-- Name: idx_token_blacklist_expires; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_token_blacklist_expires ON public.token_blacklist USING btree (expires_at);


--
-- Name: idx_token_blacklist_prosumer; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_token_blacklist_prosumer ON public.token_blacklist USING btree (prosumer_id);


--
-- Name: idx_token_blacklist_token_hash; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_token_blacklist_token_hash ON public.token_blacklist USING btree (token_hash);


--
-- Name: idx_token_blacklist_type; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_token_blacklist_type ON public.token_blacklist USING btree (blacklist_type);


--
-- Name: idx_token_blacklist_unique_token; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE UNIQUE INDEX idx_token_blacklist_unique_token ON public.token_blacklist USING btree (token_hash) WHERE ((blacklist_type = 'TOKEN'::public.blacklist_type_enum) AND (is_active = true));


--
-- Name: idx_token_blacklist_unique_user; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE UNIQUE INDEX idx_token_blacklist_unique_user ON public.token_blacklist USING btree (prosumer_id) WHERE ((blacklist_type = 'USER'::public.blacklist_type_enum) AND (is_active = true));


--
-- Name: idx_trade_orders_pair_type_price; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_trade_orders_pair_type_price ON public.trade_orders_cache USING btree (pair, order_type, price_idrs_per_etk);


--
-- Name: idx_trade_orders_prosumer_id; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_trade_orders_prosumer_id ON public.trade_orders_cache USING btree (prosumer_id);


--
-- Name: idx_trade_orders_status; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_trade_orders_status ON public.trade_orders_cache USING btree (status_on_chain);


--
-- Name: idx_trade_orders_wallet_address; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_trade_orders_wallet_address ON public.trade_orders_cache USING btree (wallet_address);


--
-- Name: idx_transaction_logs_blockchain_tx_hash; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_transaction_logs_blockchain_tx_hash ON public.transaction_logs USING btree (blockchain_tx_hash);


--
-- Name: idx_transaction_logs_prosumer_id; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_transaction_logs_prosumer_id ON public.transaction_logs USING btree (prosumer_id);


--
-- Name: idx_transaction_logs_timestamp; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_transaction_logs_timestamp ON public.transaction_logs USING btree (transaction_timestamp DESC);


--
-- Name: idx_transaction_logs_type; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_transaction_logs_type ON public.transaction_logs USING btree (transaction_type);


--
-- Name: idx_wallets_prosumer_id; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX idx_wallets_prosumer_id ON public.wallets USING btree (prosumer_id);


--
-- Name: prosumers set_timestamp_prosumers; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER set_timestamp_prosumers BEFORE UPDATE ON public.prosumers FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: smart_meters set_timestamp_smart_meters; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER set_timestamp_smart_meters BEFORE UPDATE ON public.smart_meters FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: mqtt_message_logs trg_update_command_status; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER trg_update_command_status AFTER INSERT ON public.mqtt_message_logs FOR EACH ROW EXECUTE FUNCTION public.update_command_status_from_mqtt();


--
-- Name: idrs_conversions trg_update_wallet_last_used_conversions; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER trg_update_wallet_last_used_conversions AFTER INSERT ON public.idrs_conversions FOR EACH ROW EXECUTE FUNCTION public.update_wallet_last_used_from_orders();


--
-- Name: trade_orders_cache trg_update_wallet_last_used_orders; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER trg_update_wallet_last_used_orders AFTER INSERT ON public.trade_orders_cache FOR EACH ROW EXECUTE FUNCTION public.update_wallet_last_used_from_orders();


--
-- Name: market_trades trg_update_wallet_last_used_trades; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER trg_update_wallet_last_used_trades AFTER INSERT ON public.market_trades FOR EACH ROW EXECUTE FUNCTION public.update_wallet_last_used_from_trades();


--
-- Name: token_blacklist fk_blacklist_prosumer; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT fk_blacklist_prosumer FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE CASCADE;


--
-- Name: market_trades fk_buyer_prosumer; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT fk_buyer_prosumer FOREIGN KEY (buyer_prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE RESTRICT;


--
-- Name: market_trades fk_buyer_wallet; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT fk_buyer_wallet FOREIGN KEY (buyer_wallet_address) REFERENCES public.wallets(wallet_address) ON DELETE RESTRICT;


--
-- Name: device_commands fk_command_meter; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT fk_command_meter FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE CASCADE;


--
-- Name: device_commands fk_command_user; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT fk_command_user FOREIGN KEY (sent_by_user) REFERENCES public.prosumers(prosumer_id) ON DELETE SET NULL;


--
-- Name: energy_readings_detailed fk_detailed_reading_meter; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.energy_readings_detailed
    ADD CONSTRAINT fk_detailed_reading_meter FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE CASCADE;


--
-- Name: energy_settlements fk_meter_settlement; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT fk_meter_settlement FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE RESTRICT;


--
-- Name: mqtt_message_logs fk_mqtt_meter; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.mqtt_message_logs
    ADD CONSTRAINT fk_mqtt_meter FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE CASCADE;


--
-- Name: transaction_logs fk_order_log; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT fk_order_log FOREIGN KEY (related_order_id) REFERENCES public.trade_orders_cache(order_id) ON DELETE SET NULL;


--
-- Name: wallets fk_prosumer; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT fk_prosumer FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict clTCEjndlEzFFp8JyUrkwB1fotxreFxZulYPVSLDRa9ti5pV39zZCVhn4DXarsb

