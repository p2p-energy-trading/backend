--
-- PostgreSQL database dump
--

\restrict 5HptZosBe0Ukfp2w8LY16AjvY3Vtw6tAXkJ4NX2VVIdAS2jg8f7cRyXXxmrOUXR

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg120+1)
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
-- Name: approval_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.approval_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EXPIRED'
);


ALTER TYPE public.approval_status_enum OWNER TO postgres;

--
-- Name: blacklist_reason_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.blacklist_reason_enum AS ENUM (
    'LOGOUT',
    'LOGOUT_ALL_DEVICES',
    'SECURITY_BREACH',
    'ADMIN_ACTION',
    'EXPIRED'
);


ALTER TYPE public.blacklist_reason_enum OWNER TO postgres;

--
-- Name: blacklist_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.blacklist_type_enum AS ENUM (
    'TOKEN',
    'USER'
);


ALTER TYPE public.blacklist_type_enum OWNER TO postgres;

--
-- Name: command_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.command_status_enum AS ENUM (
    'SENT',
    'ACKNOWLEDGED',
    'FAILED',
    'TIMEOUT'
);


ALTER TYPE public.command_status_enum OWNER TO postgres;

--
-- Name: currency_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.currency_enum AS ENUM (
    'ETK',
    'IDRS',
    'IDR'
);


ALTER TYPE public.currency_enum OWNER TO postgres;

--
-- Name: device_subsystem_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.device_subsystem_enum AS ENUM (
    'GRID_EXPORT',
    'GRID_IMPORT',
    'BATTERY',
    'SOLAR',
    'LOAD',
    'SYSTEM'
);


ALTER TYPE public.device_subsystem_enum OWNER TO postgres;

--
-- Name: flow_direction_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.flow_direction_enum AS ENUM (
    'IMPORT',
    'EXPORT',
    'CONSUMPTION',
    'GENERATION'
);


ALTER TYPE public.flow_direction_enum OWNER TO postgres;

--
-- Name: mqtt_direction_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mqtt_direction_enum AS ENUM (
    'INBOUND',
    'OUTBOUND'
);


ALTER TYPE public.mqtt_direction_enum OWNER TO postgres;

--
-- Name: mqtt_topic_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mqtt_topic_enum AS ENUM (
    'SENSORS',
    'STATUS',
    'COMMAND',
    'SETTLEMENT'
);


ALTER TYPE public.mqtt_topic_enum OWNER TO postgres;

--
-- Name: order_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status_enum AS ENUM (
    'OPEN',
    'PARTIALLY_FILLED',
    'FILLED',
    'CANCELLED'
);


ALTER TYPE public.order_status_enum OWNER TO postgres;

--
-- Name: order_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_type_enum AS ENUM (
    'BID',
    'ASK'
);


ALTER TYPE public.order_type_enum OWNER TO postgres;

--
-- Name: settlement_trigger_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.settlement_trigger_enum AS ENUM (
    'PERIODIC',
    'MANUAL',
    'THRESHOLD'
);


ALTER TYPE public.settlement_trigger_enum OWNER TO postgres;

--
-- Name: transaction_log_type_enum; Type: TYPE; Schema: public; Owner: postgres
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
    'CONTRACT_INTERACTION'
);


ALTER TYPE public.transaction_log_type_enum OWNER TO postgres;

--
-- Name: transaction_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transaction_status_enum AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);


ALTER TYPE public.transaction_status_enum OWNER TO postgres;

--
-- Name: wallet_import_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.wallet_import_method_enum AS ENUM (
    'GENERATED',
    'IMPORTED'
);


ALTER TYPE public.wallet_import_method_enum OWNER TO postgres;

--
-- Name: cleanup_expired_blacklist(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.cleanup_expired_blacklist() OWNER TO postgres;

--
-- Name: handle_command_timeouts(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.handle_command_timeouts() OWNER TO postgres;

--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_timestamp() OWNER TO postgres;

--
-- Name: update_command_status_from_mqtt(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_command_status_from_mqtt() OWNER TO postgres;

--
-- Name: update_meter_last_heartbeat(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_meter_last_heartbeat() OWNER TO postgres;

--
-- Name: update_wallet_last_used(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_wallet_last_used() OWNER TO postgres;

--
-- Name: update_wallet_last_used_from_orders(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_wallet_last_used_from_orders() OWNER TO postgres;

--
-- Name: update_wallet_last_used_from_trades(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_wallet_last_used_from_trades() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: device_commands; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.device_commands OWNER TO postgres;

--
-- Name: device_commands_command_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_commands_command_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_commands_command_id_seq OWNER TO postgres;

--
-- Name: device_commands_command_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_commands_command_id_seq OWNED BY public.device_commands.command_id;


--
-- Name: device_status_snapshots; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.device_status_snapshots OWNER TO postgres;

--
-- Name: device_status_snapshots_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_status_snapshots_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_status_snapshots_snapshot_id_seq OWNER TO postgres;

--
-- Name: device_status_snapshots_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_status_snapshots_snapshot_id_seq OWNED BY public.device_status_snapshots.snapshot_id;


--
-- Name: energy_readings_detailed; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.energy_readings_detailed OWNER TO postgres;

--
-- Name: energy_readings_detailed_reading_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.energy_readings_detailed_reading_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.energy_readings_detailed_reading_id_seq OWNER TO postgres;

--
-- Name: energy_readings_detailed_reading_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.energy_readings_detailed_reading_id_seq OWNED BY public.energy_readings_detailed.reading_id;


--
-- Name: energy_settlements; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.energy_settlements OWNER TO postgres;

--
-- Name: energy_settlements_settlement_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.energy_settlements_settlement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.energy_settlements_settlement_id_seq OWNER TO postgres;

--
-- Name: energy_settlements_settlement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.energy_settlements_settlement_id_seq OWNED BY public.energy_settlements.settlement_id;


--
-- Name: idrs_conversions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.idrs_conversions OWNER TO postgres;

--
-- Name: idrs_conversions_conversion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.idrs_conversions_conversion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.idrs_conversions_conversion_id_seq OWNER TO postgres;

--
-- Name: idrs_conversions_conversion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.idrs_conversions_conversion_id_seq OWNED BY public.idrs_conversions.conversion_id;


--
-- Name: market_trades; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.market_trades OWNER TO postgres;

--
-- Name: market_trades_trade_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.market_trades_trade_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.market_trades_trade_id_seq OWNER TO postgres;

--
-- Name: market_trades_trade_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.market_trades_trade_id_seq OWNED BY public.market_trades.trade_id;


--
-- Name: mqtt_message_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.mqtt_message_logs OWNER TO postgres;

--
-- Name: mqtt_message_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mqtt_message_logs_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mqtt_message_logs_log_id_seq OWNER TO postgres;

--
-- Name: mqtt_message_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mqtt_message_logs_log_id_seq OWNED BY public.mqtt_message_logs.log_id;


--
-- Name: prosumers; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.prosumers OWNER TO postgres;

--
-- Name: smart_meters; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.smart_meters OWNER TO postgres;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    config_key character varying(255) NOT NULL,
    config_value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by character varying(255)
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- Name: token_blacklist; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.token_blacklist OWNER TO postgres;

--
-- Name: token_blacklist_blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.token_blacklist_blacklist_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.token_blacklist_blacklist_id_seq OWNER TO postgres;

--
-- Name: token_blacklist_blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.token_blacklist_blacklist_id_seq OWNED BY public.token_blacklist.blacklist_id;


--
-- Name: trade_orders_cache; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.trade_orders_cache OWNER TO postgres;

--
-- Name: transaction_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.transaction_logs OWNER TO postgres;

--
-- Name: transaction_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transaction_logs_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_logs_log_id_seq OWNER TO postgres;

--
-- Name: transaction_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transaction_logs_log_id_seq OWNED BY public.transaction_logs.log_id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.wallets OWNER TO postgres;

--
-- Name: device_commands command_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands ALTER COLUMN command_id SET DEFAULT nextval('public.device_commands_command_id_seq'::regclass);


--
-- Name: device_status_snapshots snapshot_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_status_snapshots ALTER COLUMN snapshot_id SET DEFAULT nextval('public.device_status_snapshots_snapshot_id_seq'::regclass);


--
-- Name: energy_readings_detailed reading_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_readings_detailed ALTER COLUMN reading_id SET DEFAULT nextval('public.energy_readings_detailed_reading_id_seq'::regclass);


--
-- Name: energy_settlements settlement_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_settlements ALTER COLUMN settlement_id SET DEFAULT nextval('public.energy_settlements_settlement_id_seq'::regclass);


--
-- Name: idrs_conversions conversion_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idrs_conversions ALTER COLUMN conversion_id SET DEFAULT nextval('public.idrs_conversions_conversion_id_seq'::regclass);


--
-- Name: market_trades trade_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_trades ALTER COLUMN trade_id SET DEFAULT nextval('public.market_trades_trade_id_seq'::regclass);


--
-- Name: mqtt_message_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mqtt_message_logs ALTER COLUMN log_id SET DEFAULT nextval('public.mqtt_message_logs_log_id_seq'::regclass);


--
-- Name: token_blacklist blacklist_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist ALTER COLUMN blacklist_id SET DEFAULT nextval('public.token_blacklist_blacklist_id_seq'::regclass);


--
-- Name: transaction_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_logs ALTER COLUMN log_id SET DEFAULT nextval('public.transaction_logs_log_id_seq'::regclass);


--
-- Data for Name: device_commands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.device_commands (command_id, meter_id, command_type, command_payload, correlation_id, status, sent_at, acknowledged_at, timeout_at, response_payload, error_details, sent_by_user) FROM stdin;
38	METER001	GRID_CONTROL	{"grid": "export", "timestamp": "2025-07-16T04:47:22.732Z", "correlation_id": "1458a1d1-6f3d-4381-b58e-cf3f1c3ef9ed"}	1458a1d1-6f3d-4381-b58e-cf3f1c3ef9ed	TIMEOUT	2025-07-16 04:47:22.732+00	2025-07-16 04:53:00.024+00	\N	{"error": "Command timeout"}	\N	\N
40	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 70, "direction": "forward"}, "timestamp": "2025-07-16T04:54:10.421Z", "correlation_id": "0a5dc5e0-3c6e-40e2-9d35-145439691fd1"}	0a5dc5e0-3c6e-40e2-9d35-145439691fd1	TIMEOUT	2025-07-16 04:54:10.421+00	2025-07-16 05:00:00.405+00	\N	{"error": "Command timeout"}	\N	\N
17	METER001	GRID_CONTROL	{"grid": "import", "timestamp": "2025-07-15T08:26:10.753Z", "correlation_id": "a06c42d7-8df6-4666-be9d-cf08b7dfab35"}	a06c42d7-8df6-4666-be9d-cf08b7dfab35	TIMEOUT	2025-07-15 08:26:10.753+00	2025-07-15 08:32:00.007+00	\N	{"error": "Command timeout"}	\N	\N
18	METER001	GRID_CONTROL	{"grid": "off", "timestamp": "2025-07-15T08:26:12.012Z", "correlation_id": "ef4c8838-b9f4-4b7e-a8c0-1d7bfd1b7fee"}	ef4c8838-b9f4-4b7e-a8c0-1d7bfd1b7fee	TIMEOUT	2025-07-15 08:26:12.012+00	2025-07-15 08:32:00.02+00	\N	{"error": "Command timeout"}	\N	\N
19	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T08:30:00.349Z", "correlation_id": "5ab8df2b-d41a-4e6c-a12f-5ba2890282d0"}	5ab8df2b-d41a-4e6c-a12f-5ba2890282d0	TIMEOUT	2025-07-15 08:30:00.349+00	2025-07-15 08:36:00.01+00	\N	{"error": "Command timeout"}	\N	\N
20	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T10:20:00.456Z", "correlation_id": "beaa1970-98e5-49b1-8b2b-2836edff6b5a"}	beaa1970-98e5-49b1-8b2b-2836edff6b5a	TIMEOUT	2025-07-15 10:20:00.456+00	2025-07-15 10:26:00.009+00	\N	{"error": "Command timeout"}	\N	\N
21	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 75, "direction": "forward"}, "timestamp": "2025-07-15T10:52:09.777Z", "correlation_id": "2502d808-985f-4b01-acff-797890ab81c5"}	2502d808-985f-4b01-acff-797890ab81c5	TIMEOUT	2025-07-15 10:52:09.777+00	2025-07-15 10:58:00.01+00	\N	{"error": "Command timeout"}	\N	\N
22	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 0, "direction": "stop"}, "timestamp": "2025-07-15T10:52:12.280Z", "correlation_id": "9aaad6c5-030e-4fe8-8619-34974f75aa86"}	9aaad6c5-030e-4fe8-8619-34974f75aa86	TIMEOUT	2025-07-15 10:52:12.28+00	2025-07-15 10:58:00.024+00	\N	{"error": "Command timeout"}	\N	\N
23	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 75, "direction": "forward"}, "timestamp": "2025-07-15T11:01:37.797Z", "correlation_id": "118f1afa-7e39-4ae4-bec1-1187d6ef00d2"}	118f1afa-7e39-4ae4-bec1-1187d6ef00d2	TIMEOUT	2025-07-15 11:01:37.797+00	2025-07-15 11:07:00.014+00	\N	{"error": "Command timeout"}	\N	\N
24	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 60, "direction": "forward"}, "timestamp": "2025-07-15T11:01:56.303Z", "correlation_id": "a34c3cc8-657b-47e4-95f9-6010413e1bed"}	a34c3cc8-657b-47e4-95f9-6010413e1bed	TIMEOUT	2025-07-15 11:01:56.303+00	2025-07-15 11:07:00.029+00	\N	{"error": "Command timeout"}	\N	\N
25	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 55, "direction": "forward"}, "timestamp": "2025-07-15T11:02:16.318Z", "correlation_id": "237d26c9-9349-448f-829d-9218fb20d707"}	237d26c9-9349-448f-829d-9218fb20d707	TIMEOUT	2025-07-15 11:02:16.318+00	2025-07-15 11:08:00.009+00	\N	{"error": "Command timeout"}	\N	\N
26	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 0, "direction": "stop"}, "timestamp": "2025-07-15T11:07:10.832Z", "correlation_id": "e7f8da53-33c1-499a-8cef-841a8ae8b05c"}	e7f8da53-33c1-499a-8cef-841a8ae8b05c	TIMEOUT	2025-07-15 11:07:10.833+00	2025-07-15 11:13:00.009+00	\N	{"error": "Command timeout"}	\N	\N
27	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T12:05:00.524Z", "correlation_id": "ad31b9ad-4b51-4f28-b349-79acec0e618f"}	ad31b9ad-4b51-4f28-b349-79acec0e618f	TIMEOUT	2025-07-15 12:05:00.524+00	2025-07-15 12:11:00.012+00	\N	{"error": "Command timeout"}	\N	\N
28	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T13:55:00.756Z", "correlation_id": "d108821f-4087-4c61-a6ff-96639e6292c6"}	d108821f-4087-4c61-a6ff-96639e6292c6	TIMEOUT	2025-07-15 13:55:00.756+00	2025-07-15 14:01:00.017+00	\N	{"error": "Command timeout"}	\N	\N
29	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T15:50:00.887Z", "correlation_id": "c839ccaf-b4f2-4935-a255-678f3134ac45"}	c839ccaf-b4f2-4935-a255-678f3134ac45	TIMEOUT	2025-07-15 15:50:00.887+00	2025-07-15 15:56:00.014+00	\N	{"error": "Command timeout"}	\N	\N
30	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T17:40:00.927Z", "correlation_id": "8134b216-0cc9-443f-abf9-b4fdd37fdc23"}	8134b216-0cc9-443f-abf9-b4fdd37fdc23	TIMEOUT	2025-07-15 17:40:00.927+00	2025-07-15 17:46:00.016+00	\N	{"error": "Command timeout"}	\N	\N
31	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T19:35:01.101Z", "correlation_id": "0f94c0dc-5926-469d-883b-7414a23788a8"}	0f94c0dc-5926-469d-883b-7414a23788a8	TIMEOUT	2025-07-15 19:35:01.101+00	2025-07-15 19:41:00.016+00	\N	{"error": "Command timeout"}	\N	\N
32	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T21:25:01.347Z", "correlation_id": "9724fa11-0fd5-43a0-82ef-2b0e3be6222e"}	9724fa11-0fd5-43a0-82ef-2b0e3be6222e	TIMEOUT	2025-07-15 21:25:01.347+00	2025-07-15 21:31:00.021+00	\N	{"error": "Command timeout"}	\N	\N
33	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-15T23:20:01.424Z", "correlation_id": "36593238-ee87-407e-948a-17c8ad5d9a82"}	36593238-ee87-407e-948a-17c8ad5d9a82	TIMEOUT	2025-07-15 23:20:01.424+00	2025-07-15 23:26:00.019+00	\N	{"error": "Command timeout"}	\N	\N
34	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T01:10:01.437Z", "correlation_id": "8f8e00bc-bffd-4cd5-817c-7084f2c5f12b"}	8f8e00bc-bffd-4cd5-817c-7084f2c5f12b	TIMEOUT	2025-07-16 01:10:01.437+00	2025-07-16 01:16:00.024+00	\N	{"error": "Command timeout"}	\N	\N
35	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T03:05:01.587Z", "correlation_id": "69c5a51c-ab0f-452c-89d1-6cf4ec5cdfb1"}	69c5a51c-ab0f-452c-89d1-6cf4ec5cdfb1	TIMEOUT	2025-07-16 03:05:01.587+00	2025-07-16 03:11:00.021+00	\N	{"error": "Command timeout"}	\N	\N
36	METER001	GRID_CONTROL	{"grid": "export", "timestamp": "2025-07-16T04:40:44.457Z", "correlation_id": "409ca8e7-8d6d-4d38-961b-24e0b11a93c1"}	409ca8e7-8d6d-4d38-961b-24e0b11a93c1	TIMEOUT	2025-07-16 04:40:44.457+00	2025-07-16 04:46:00.021+00	\N	{"error": "Command timeout"}	\N	\N
37	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 75, "direction": "forward"}, "timestamp": "2025-07-16T04:45:54.943Z", "correlation_id": "63889b46-0543-4c5a-bdc4-0ad05ce9cd9e"}	63889b46-0543-4c5a-bdc4-0ad05ce9cd9e	TIMEOUT	2025-07-16 04:45:54.943+00	2025-07-16 04:51:00.022+00	\N	{"error": "Command timeout"}	\N	\N
39	METER001	GRID_CONTROL	{"grid": "import", "timestamp": "2025-07-16T04:53:59.434Z", "correlation_id": "f3eb4430-a135-4026-8f13-4f6ed618064c"}	f3eb4430-a135-4026-8f13-4f6ed618064c	TIMEOUT	2025-07-16 04:53:59.434+00	2025-07-16 04:59:00.026+00	\N	{"error": "Command timeout"}	\N	\N
100	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T15:30:02.673Z", "correlation_id": "e4176542-074b-4822-a3ae-ffb3d98d0276"}	e4176542-074b-4822-a3ae-ffb3d98d0276	TIMEOUT	2025-07-21 15:30:02.673+00	2025-07-21 15:36:00.026+00	\N	{"error": "Command timeout"}	\N	\N
41	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T06:50:01.759Z", "correlation_id": "71560fd8-078e-4d58-8fed-11ffa995cb9b"}	71560fd8-078e-4d58-8fed-11ffa995cb9b	TIMEOUT	2025-07-16 06:50:01.759+00	2025-07-16 06:56:00.024+00	\N	{"error": "Command timeout"}	\N	\N
42	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T08:40:02.133Z", "correlation_id": "4e8305d1-4f9b-4f30-bacf-4e4f6d68ebaf"}	4e8305d1-4f9b-4f30-bacf-4e4f6d68ebaf	TIMEOUT	2025-07-16 08:40:02.133+00	2025-07-16 08:46:00.022+00	\N	{"error": "Command timeout"}	\N	\N
43	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T10:30:02.301Z", "correlation_id": "0529e91e-0831-45d6-b25b-1e306a70ea6e"}	0529e91e-0831-45d6-b25b-1e306a70ea6e	TIMEOUT	2025-07-16 10:30:02.301+00	2025-07-16 10:36:00.024+00	\N	{"error": "Command timeout"}	\N	\N
44	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T12:25:02.320Z", "correlation_id": "ef87135c-f91a-4dc0-b822-0ae5fcfee198"}	ef87135c-f91a-4dc0-b822-0ae5fcfee198	TIMEOUT	2025-07-16 12:25:02.32+00	2025-07-16 12:31:00.022+00	\N	{"error": "Command timeout"}	\N	\N
45	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T14:15:02.376Z", "correlation_id": "bedef883-5526-454c-ac8f-670e53bc0edb"}	bedef883-5526-454c-ac8f-670e53bc0edb	TIMEOUT	2025-07-16 14:15:02.376+00	2025-07-16 14:21:00.024+00	\N	{"error": "Command timeout"}	\N	\N
46	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T16:05:02.684Z", "correlation_id": "f54dd1f5-fd70-4416-9846-123d9cf22447"}	f54dd1f5-fd70-4416-9846-123d9cf22447	TIMEOUT	2025-07-16 16:05:02.685+00	2025-07-16 16:11:00.02+00	\N	{"error": "Command timeout"}	\N	\N
47	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T17:55:03.001Z", "correlation_id": "dd7bff23-1f8b-4e8e-98e1-4fc7012f7969"}	dd7bff23-1f8b-4e8e-98e1-4fc7012f7969	TIMEOUT	2025-07-16 17:55:03.001+00	2025-07-16 18:01:00.021+00	\N	{"error": "Command timeout"}	\N	\N
48	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T19:50:02.748Z", "correlation_id": "fdf645c4-f587-4ef4-99d4-ab0150052d6f"}	fdf645c4-f587-4ef4-99d4-ab0150052d6f	TIMEOUT	2025-07-16 19:50:02.748+00	2025-07-16 19:56:00.021+00	\N	{"error": "Command timeout"}	\N	\N
49	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T21:40:02.994Z", "correlation_id": "9c4a0687-3895-47b0-9a70-db74da77af06"}	9c4a0687-3895-47b0-9a70-db74da77af06	TIMEOUT	2025-07-16 21:40:02.994+00	2025-07-16 21:46:00.022+00	\N	{"error": "Command timeout"}	\N	\N
50	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-16T23:35:03.221Z", "correlation_id": "74851af0-ed85-4b98-9f9b-13ecc57bef9a"}	74851af0-ed85-4b98-9f9b-13ecc57bef9a	TIMEOUT	2025-07-16 23:35:03.221+00	2025-07-16 23:41:00.022+00	\N	{"error": "Command timeout"}	\N	\N
51	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T01:25:03.373Z", "correlation_id": "bb231545-fa55-453f-a1db-1b4d9e1f80df"}	bb231545-fa55-453f-a1db-1b4d9e1f80df	TIMEOUT	2025-07-17 01:25:03.373+00	2025-07-17 01:31:00.023+00	\N	{"error": "Command timeout"}	\N	\N
52	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T03:15:03.537Z", "correlation_id": "52d63a1d-eff4-4d5f-9209-085b2408b27e"}	52d63a1d-eff4-4d5f-9209-085b2408b27e	TIMEOUT	2025-07-17 03:15:03.537+00	2025-07-17 03:21:00.026+00	\N	{"error": "Command timeout"}	\N	\N
53	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T05:10:04.390Z", "correlation_id": "15ea4a1f-e3c1-4342-a51f-42d43e2cc05f"}	15ea4a1f-e3c1-4342-a51f-42d43e2cc05f	TIMEOUT	2025-07-17 05:10:04.39+00	2025-07-17 05:16:00.025+00	\N	{"error": "Command timeout"}	\N	\N
54	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T07:00:04.434Z", "correlation_id": "7b77a3c2-4526-4acc-a3ff-554dbb11cb95"}	7b77a3c2-4526-4acc-a3ff-554dbb11cb95	TIMEOUT	2025-07-17 07:00:04.434+00	2025-07-17 07:06:00.024+00	\N	{"error": "Command timeout"}	\N	\N
55	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T08:50:03.938Z", "correlation_id": "04a9e7cd-a2b5-450c-b0ef-e785df6954fe"}	04a9e7cd-a2b5-450c-b0ef-e785df6954fe	TIMEOUT	2025-07-17 08:50:03.938+00	2025-07-17 08:56:00.026+00	\N	{"error": "Command timeout"}	\N	\N
56	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T10:45:03.801Z", "correlation_id": "b50bb24d-c352-4d18-9736-402b1a6ac162"}	b50bb24d-c352-4d18-9736-402b1a6ac162	TIMEOUT	2025-07-17 10:45:03.801+00	2025-07-17 10:51:00.023+00	\N	{"error": "Command timeout"}	\N	\N
57	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T12:35:03.923Z", "correlation_id": "7424cf5a-ee81-43fc-a575-4028e0e02feb"}	7424cf5a-ee81-43fc-a575-4028e0e02feb	TIMEOUT	2025-07-17 12:35:03.923+00	2025-07-17 12:41:00.025+00	\N	{"error": "Command timeout"}	\N	\N
58	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T14:25:04.224Z", "correlation_id": "4e25a2cb-b9fd-46a3-a882-1e0f3e083c25"}	4e25a2cb-b9fd-46a3-a882-1e0f3e083c25	TIMEOUT	2025-07-17 14:25:04.224+00	2025-07-17 14:31:00.024+00	\N	{"error": "Command timeout"}	\N	\N
59	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T16:15:05.140Z", "correlation_id": "58f20a7c-3068-48fd-ac10-6c37ab08b84c"}	58f20a7c-3068-48fd-ac10-6c37ab08b84c	TIMEOUT	2025-07-17 16:15:05.14+00	2025-07-17 16:21:00.023+00	\N	{"error": "Command timeout"}	\N	\N
60	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T18:10:04.912Z", "correlation_id": "8c31f3a9-d8be-4db0-b783-e44730967d82"}	8c31f3a9-d8be-4db0-b783-e44730967d82	TIMEOUT	2025-07-17 18:10:04.912+00	2025-07-17 18:16:00.02+00	\N	{"error": "Command timeout"}	\N	\N
61	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T20:00:04.804Z", "correlation_id": "7088d550-0fc6-4918-a820-0c7aff7ee88b"}	7088d550-0fc6-4918-a820-0c7aff7ee88b	TIMEOUT	2025-07-17 20:00:04.804+00	2025-07-17 20:06:00.026+00	\N	{"error": "Command timeout"}	\N	\N
62	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T21:50:07.855Z", "correlation_id": "5503f145-a8c8-4b67-8453-1b7c55cc68c2"}	5503f145-a8c8-4b67-8453-1b7c55cc68c2	TIMEOUT	2025-07-17 21:50:07.855+00	2025-07-17 21:56:00.026+00	\N	{"error": "Command timeout"}	\N	\N
63	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-17T23:35:05.413Z", "correlation_id": "29b1a945-3124-4ae4-b91a-6a357fd36107"}	29b1a945-3124-4ae4-b91a-6a357fd36107	TIMEOUT	2025-07-17 23:35:05.414+00	2025-07-17 23:41:00.027+00	\N	{"error": "Command timeout"}	\N	\N
64	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T01:25:05.321Z", "correlation_id": "5519c8ce-6e87-4325-8bd7-aa7870b56896"}	5519c8ce-6e87-4325-8bd7-aa7870b56896	TIMEOUT	2025-07-18 01:25:05.321+00	2025-07-18 01:31:00.027+00	\N	{"error": "Command timeout"}	\N	\N
65	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T03:15:07.434Z", "correlation_id": "a9f08582-e1ac-4128-b245-4b85d3ca861f"}	a9f08582-e1ac-4128-b245-4b85d3ca861f	TIMEOUT	2025-07-18 03:15:07.434+00	2025-07-18 03:21:00.029+00	\N	{"error": "Command timeout"}	\N	\N
101	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T17:35:02.915Z", "correlation_id": "aac01ddf-06f6-4423-bcc0-91971e16549c"}	aac01ddf-06f6-4423-bcc0-91971e16549c	TIMEOUT	2025-07-21 17:35:02.915+00	2025-07-21 17:41:00.025+00	\N	{"error": "Command timeout"}	\N	\N
66	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T05:10:05.890Z", "correlation_id": "ccb27af8-f37d-41b7-8c54-24bec236dd22"}	ccb27af8-f37d-41b7-8c54-24bec236dd22	TIMEOUT	2025-07-18 05:10:05.89+00	2025-07-18 05:16:00.028+00	\N	{"error": "Command timeout"}	\N	\N
67	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T07:00:06.562Z", "correlation_id": "b2ea3a7c-f49d-4e12-b2eb-ca1e2c4bac6a"}	b2ea3a7c-f49d-4e12-b2eb-ca1e2c4bac6a	TIMEOUT	2025-07-18 07:00:06.562+00	2025-07-18 07:06:00.025+00	\N	{"error": "Command timeout"}	\N	\N
102	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T19:30:03.274Z", "correlation_id": "4f01f791-6114-4076-a0d8-cd91a081d549"}	4f01f791-6114-4076-a0d8-cd91a081d549	TIMEOUT	2025-07-21 19:30:03.275+00	2025-07-21 19:36:00.021+00	\N	{"error": "Command timeout"}	\N	\N
68	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T08:50:08.688Z", "correlation_id": "f44cdb40-bcee-466e-9f7a-01cc6dc227f3"}	f44cdb40-bcee-466e-9f7a-01cc6dc227f3	TIMEOUT	2025-07-18 08:50:08.688+00	2025-07-18 08:56:00.035+00	\N	{"error": "Command timeout"}	\N	\N
69	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T10:45:07.978Z", "correlation_id": "2cba52d4-b995-4ce2-a609-62b11598baca"}	2cba52d4-b995-4ce2-a609-62b11598baca	TIMEOUT	2025-07-18 10:45:07.978+00	2025-07-18 10:51:00.025+00	\N	{"error": "Command timeout"}	\N	\N
103	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T21:20:03.275Z", "correlation_id": "922f41a7-615a-4cb5-a8c1-ea4c055d147f"}	922f41a7-615a-4cb5-a8c1-ea4c055d147f	TIMEOUT	2025-07-21 21:20:03.275+00	2025-07-21 21:26:00.025+00	\N	{"error": "Command timeout"}	\N	\N
70	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T12:35:09.310Z", "correlation_id": "d2b3d8e0-6c1f-4e71-a2bb-8e927e3ea064"}	d2b3d8e0-6c1f-4e71-a2bb-8e927e3ea064	TIMEOUT	2025-07-18 12:35:09.31+00	2025-07-18 12:41:00.026+00	\N	{"error": "Command timeout"}	\N	\N
71	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T14:25:06.503Z", "correlation_id": "ab29bcdb-7c86-4b84-9f3b-1bf19bc839c4"}	ab29bcdb-7c86-4b84-9f3b-1bf19bc839c4	TIMEOUT	2025-07-18 14:25:06.503+00	2025-07-18 14:31:00.025+00	\N	{"error": "Command timeout"}	\N	\N
104	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T23:05:03.158Z", "correlation_id": "8dd62884-5824-41fb-8487-8d1a7227bb59"}	8dd62884-5824-41fb-8487-8d1a7227bb59	TIMEOUT	2025-07-21 23:05:03.158+00	2025-07-21 23:11:00.025+00	\N	{"error": "Command timeout"}	\N	\N
72	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T16:20:06.468Z", "correlation_id": "98ca33c4-1d1e-41d8-a806-24d326d1ad18"}	98ca33c4-1d1e-41d8-a806-24d326d1ad18	TIMEOUT	2025-07-18 16:20:06.468+00	2025-07-18 16:26:00.025+00	\N	{"error": "Command timeout"}	\N	\N
73	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T18:10:10.299Z", "correlation_id": "e102a90e-8c36-4435-aefa-972c1d63d6fc"}	e102a90e-8c36-4435-aefa-972c1d63d6fc	TIMEOUT	2025-07-18 18:10:10.299+00	2025-07-18 18:16:00.024+00	\N	{"error": "Command timeout"}	\N	\N
105	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-22T00:55:03.401Z", "correlation_id": "2ea1d0cd-8f8f-46fe-acc6-e1f4440d646e"}	2ea1d0cd-8f8f-46fe-acc6-e1f4440d646e	TIMEOUT	2025-07-22 00:55:03.402+00	2025-07-22 01:01:00.024+00	\N	{"error": "Command timeout"}	\N	\N
74	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T20:00:09.170Z", "correlation_id": "9a3c4783-dc03-440a-b896-a658048d0568"}	9a3c4783-dc03-440a-b896-a658048d0568	TIMEOUT	2025-07-18 20:00:09.17+00	2025-07-18 20:06:00.024+00	\N	{"error": "Command timeout"}	\N	\N
75	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-18T21:55:07.280Z", "correlation_id": "d2222904-15aa-4634-a15a-64929b81b668"}	d2222904-15aa-4634-a15a-64929b81b668	TIMEOUT	2025-07-18 21:55:07.28+00	2025-07-18 22:01:00.023+00	\N	{"error": "Command timeout"}	\N	\N
106	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-22T14:35:03.698Z", "correlation_id": "4b66475d-2a54-44ab-95d0-7349e1217405"}	4b66475d-2a54-44ab-95d0-7349e1217405	TIMEOUT	2025-07-22 14:35:03.698+00	2025-07-22 14:41:00.026+00	\N	{"error": "Command timeout"}	\N	\N
76	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-19T03:25:06.593Z", "correlation_id": "5d343a22-0438-4b29-9919-8bdef9e0dd59"}	5d343a22-0438-4b29-9919-8bdef9e0dd59	TIMEOUT	2025-07-19 03:25:06.593+00	2025-07-19 03:31:00.025+00	\N	{"error": "Command timeout"}	\N	\N
77	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-19T05:35:12.630Z", "correlation_id": "80a5357c-7f1f-4a1f-9b13-d9f3bac16fbb"}	80a5357c-7f1f-4a1f-9b13-d9f3bac16fbb	TIMEOUT	2025-07-19 05:35:12.63+00	2025-07-19 05:41:00.028+00	\N	{"error": "Command timeout"}	\N	\N
78	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-19T07:30:12.732Z", "correlation_id": "a32a0821-8d0a-43eb-83f9-fd193af1e551"}	a32a0821-8d0a-43eb-83f9-fd193af1e551	TIMEOUT	2025-07-19 07:30:12.732+00	2025-07-19 07:36:00.023+00	\N	{"error": "Command timeout"}	\N	\N
79	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-19T09:25:08.936Z", "correlation_id": "0803ca9b-5228-4b29-a2ba-1cc579953e01"}	0803ca9b-5228-4b29-a2ba-1cc579953e01	TIMEOUT	2025-07-19 09:25:08.936+00	2025-07-19 09:31:00.027+00	\N	{"error": "Command timeout"}	\N	\N
80	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-19T13:15:00.400Z", "correlation_id": "cc83a490-5987-47f4-bc11-48478363703e"}	cc83a490-5987-47f4-bc11-48478363703e	TIMEOUT	2025-07-19 13:15:00.4+00	2025-07-19 13:21:00.017+00	\N	{"error": "Command timeout"}	\N	\N
81	METER001	GRID_CONTROL	{"grid": "export", "timestamp": "2025-07-19T14:11:02.068Z", "correlation_id": "2efddd34-7587-4b64-b88b-366fd155bf71"}	2efddd34-7587-4b64-b88b-366fd155bf71	TIMEOUT	2025-07-19 14:11:02.068+00	2025-07-19 14:17:00.019+00	\N	{"error": "Command timeout"}	\N	\N
82	METER001	GRID_CONTROL	{"grid": "off", "timestamp": "2025-07-19T14:12:40.357Z", "correlation_id": "2d2ce49e-2ad5-44cd-b2b5-673459532870"}	2d2ce49e-2ad5-44cd-b2b5-673459532870	TIMEOUT	2025-07-19 14:12:40.357+00	2025-07-19 14:18:00.019+00	\N	{"error": "Command timeout"}	\N	\N
83	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-19T14:15:00.662Z", "correlation_id": "9afba89a-dc7f-4075-ba89-e2f601ed1ba9"}	9afba89a-dc7f-4075-ba89-e2f601ed1ba9	TIMEOUT	2025-07-19 14:15:00.662+00	2025-07-19 14:21:00.018+00	\N	{"error": "Command timeout"}	\N	\N
84	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 75, "direction": "forward"}, "timestamp": "2025-07-19T14:19:40.788Z", "correlation_id": "e08ca422-7f58-4f0a-80de-bebcff0513d0"}	e08ca422-7f58-4f0a-80de-bebcff0513d0	TIMEOUT	2025-07-19 14:19:40.788+00	2025-07-19 14:25:00.024+00	\N	{"error": "Command timeout"}	\N	\N
85	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 75, "direction": "forward"}, "timestamp": "2025-07-19T14:20:09.646Z", "correlation_id": "69039671-6512-4287-a3fe-ce838f69d4fb"}	69039671-6512-4287-a3fe-ce838f69d4fb	TIMEOUT	2025-07-19 14:20:09.646+00	2025-07-19 14:26:00.024+00	\N	{"error": "Command timeout"}	\N	\N
86	METER001	GRID_CONTROL	{"grid": "import", "timestamp": "2025-07-19T14:20:17.099Z", "correlation_id": "b70f6854-af10-4432-a559-1617ed2a591a"}	b70f6854-af10-4432-a559-1617ed2a591a	TIMEOUT	2025-07-19 14:20:17.099+00	2025-07-19 14:26:00.034+00	\N	{"error": "Command timeout"}	\N	\N
87	METER001	GRID_CONTROL	{"grid": "off", "timestamp": "2025-07-19T14:26:23.433Z", "correlation_id": "cccb5337-11b5-48c6-9dc8-f3f2edcf9615"}	cccb5337-11b5-48c6-9dc8-f3f2edcf9615	TIMEOUT	2025-07-19 14:26:23.433+00	2025-07-19 14:32:00.017+00	\N	{"error": "Command timeout"}	\N	\N
88	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 0, "direction": "stop"}, "timestamp": "2025-07-19T14:26:27.661Z", "correlation_id": "0dfea4ea-2a4d-4e41-a59c-d84b4fe7a2b7"}	0dfea4ea-2a4d-4e41-a59c-d84b4fe7a2b7	TIMEOUT	2025-07-19 14:26:27.661+00	2025-07-19 14:32:00.034+00	\N	{"error": "Command timeout"}	\N	\N
89	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 80, "direction": "forward"}, "timestamp": "2025-07-19T14:32:25.365Z", "correlation_id": "3582e641-9308-414d-91f3-0ecb1c89a71c"}	3582e641-9308-414d-91f3-0ecb1c89a71c	TIMEOUT	2025-07-19 14:32:25.365+00	2025-07-19 14:38:00.024+00	\N	{"error": "Command timeout"}	\N	\N
90	METER001	COMPONENT_CONTROL	{"motor1": {"percent": 0, "direction": "stop"}, "timestamp": "2025-07-19T14:34:43.485Z", "correlation_id": "cfc3860a-3582-4f0e-b848-e5c9e11675f5"}	cfc3860a-3582-4f0e-b848-e5c9e11675f5	TIMEOUT	2025-07-19 14:34:43.485+00	2025-07-19 14:40:00.023+00	\N	{"error": "Command timeout"}	\N	\N
91	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T08:30:02.591Z", "correlation_id": "1fed8156-ca59-4c87-bb71-786e25be85b4"}	1fed8156-ca59-4c87-bb71-786e25be85b4	TIMEOUT	2025-07-21 08:30:02.591+00	2025-07-21 08:36:00.027+00	\N	{"error": "Command timeout"}	\N	\N
92	METER001	GRID_CONTROL	{"grid": "export", "timestamp": "2025-07-21T09:18:32.887Z", "correlation_id": "cbe6c0ba-1d36-4a01-ac46-87b3d4e123ac"}	cbe6c0ba-1d36-4a01-ac46-87b3d4e123ac	TIMEOUT	2025-07-21 09:18:32.887+00	2025-07-21 09:24:00.03+00	\N	{"error": "Command timeout"}	\N	\N
93	METER001	GRID_CONTROL	{"grid": "export", "timestamp": "2025-07-21T09:18:50.398Z", "correlation_id": "a917a986-dc85-4a82-804c-61cdb366edf8"}	a917a986-dc85-4a82-804c-61cdb366edf8	TIMEOUT	2025-07-21 09:18:50.398+00	2025-07-21 09:24:00.088+00	\N	{"error": "Command timeout"}	\N	\N
94	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T09:20:02.457Z", "correlation_id": "4e632350-397c-48d4-981e-cb10600db7a8"}	4e632350-397c-48d4-981e-cb10600db7a8	TIMEOUT	2025-07-21 09:20:02.457+00	2025-07-21 09:26:00.024+00	\N	{"error": "Command timeout"}	\N	\N
95	METER001	GRID_CONTROL	{"grid": "export", "timestamp": "2025-07-21T09:24:15.107Z", "correlation_id": "d9b2eb88-7d7c-4535-957b-ff8aaa756bdd"}	d9b2eb88-7d7c-4535-957b-ff8aaa756bdd	TIMEOUT	2025-07-21 09:24:15.107+00	2025-07-21 09:30:00.042+00	\N	{"error": "Command timeout"}	\N	\N
96	METER001	GRID_CONTROL	{"grid": "export", "timestamp": "2025-07-21T09:45:07.989Z", "correlation_id": "6b2e205b-6998-4aa0-9ca7-960e91c690ba"}	6b2e205b-6998-4aa0-9ca7-960e91c690ba	TIMEOUT	2025-07-21 09:45:07.989+00	2025-07-21 09:51:00.03+00	\N	{"error": "Command timeout"}	\N	\N
97	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T09:50:02.341Z", "correlation_id": "0bf9fb36-5224-4429-a266-06496d42b828"}	0bf9fb36-5224-4429-a266-06496d42b828	TIMEOUT	2025-07-21 09:50:02.341+00	2025-07-21 09:56:00.03+00	\N	{"error": "Command timeout"}	\N	\N
98	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T09:55:02.428Z", "correlation_id": "64941c68-e44c-4fcb-a781-303ce305263e"}	64941c68-e44c-4fcb-a781-303ce305263e	TIMEOUT	2025-07-21 09:55:02.428+00	2025-07-21 10:01:00.039+00	\N	{"error": "Command timeout"}	\N	\N
99	METER001	SETTLEMENT_RESET	{"energy": {"reset_settlement": "all"}, "timestamp": "2025-07-21T13:40:02.752Z", "correlation_id": "3e5a71a3-6f4b-4f81-84cd-07596e05c425"}	3e5a71a3-6f4b-4f81-84cd-07596e05c425	TIMEOUT	2025-07-21 13:40:02.752+00	2025-07-21 13:46:00.028+00	\N	{"error": "Command timeout"}	\N	\N
\.


--
-- Data for Name: device_status_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.device_status_snapshots (snapshot_id, meter_id, "timestamp", wifi_status, mqtt_status, grid_mode, system_status, component_status, raw_payload) FROM stdin;
\.


--
-- Data for Name: energy_readings_detailed; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.energy_readings_detailed (reading_id, meter_id, "timestamp", subsystem, daily_energy_wh, total_energy_wh, settlement_energy_wh, current_power_w, voltage, current_amp, subsystem_data, raw_payload) FROM stdin;
\.


--
-- Data for Name: energy_settlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.energy_settlements (settlement_id, meter_id, period_start_time, period_end_time, net_kwh_from_grid, etk_amount_credited, blockchain_tx_hash, status, created_at_backend, confirmed_at_on_chain, settlement_trigger, raw_export_kwh, raw_import_kwh, validation_status, settlement_data_source, detailed_energy_breakdown, mqtt_message_id) FROM stdin;
25	METER001	2025-07-16 12:20:01.954+00	2025-07-16 12:25:01.954+00	0.1001	0.100000000000000000	0xd9d0dafb29c19dd2f59fdad10de60c8abfe0f6f3f7a7b0118a222e5cca8de8fd	SUCCESS	2025-07-16 12:25:02.06+00	2025-07-16 12:25:05.154+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
26	METER001	2025-07-16 14:10:01.983+00	2025-07-16 14:15:01.983+00	0.1001	0.100000000000000000	0x0a579bc619f4250a6825cfe3b86996a47decd80e1433185dabcd6a0fed96d4ef	SUCCESS	2025-07-16 14:15:02.122+00	2025-07-16 14:15:06.448+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
27	METER001	2025-07-16 16:00:02.322+00	2025-07-16 16:05:02.322+00	0.1001	0.100000000000000000	0xc749a9d391e538bb490a4d3a0da83eff5507aeda98f44f60caf8d042910c3fae	SUCCESS	2025-07-16 16:05:02.428+00	2025-07-16 16:05:06.387+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
28	METER001	2025-07-16 17:50:02.636+00	2025-07-16 17:55:02.636+00	0.1001	0.100000000000000000	0xb25485061492a18e49ff36745d9e1e28d227ada50868cd1d701afb1242ab8ea0	SUCCESS	2025-07-16 17:55:02.755+00	2025-07-16 17:55:05.06+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
29	METER001	2025-07-16 19:45:02.269+00	2025-07-16 19:50:02.269+00	0.1001	0.100000000000000000	0x55bf26c1895805aec60259025e7fa3a7f2679457a30f6efb729faa210778603a	SUCCESS	2025-07-16 19:50:02.495+00	2025-07-16 19:50:05.245+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
30	METER001	2025-07-16 21:35:02.664+00	2025-07-16 21:40:02.664+00	0.1001	0.100000000000000000	0xb2544a8ada72e0bad7f7cc91e513c856aff6a7aa5cf92aab44a628336256fcd9	SUCCESS	2025-07-16 21:40:02.751+00	2025-07-16 21:40:05.353+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
31	METER001	2025-07-16 23:30:02.732+00	2025-07-16 23:35:02.732+00	0.1001	0.100000000000000000	0x3ffeda1360e1316f2f82440a3fb3f27cddfb6932dcd382f9f2421921fc10a358	SUCCESS	2025-07-16 23:35:02.809+00	2025-07-16 23:35:05.613+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
32	METER001	2025-07-17 01:20:02.953+00	2025-07-17 01:25:02.953+00	0.1001	0.100000000000000000	0xeeb57e674b3ebb68406364bea8b5e352b3c0b554478a91f73940374fd873e767	SUCCESS	2025-07-17 01:25:03.11+00	2025-07-17 01:25:09.126+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
10	METER001	2025-07-15 08:20:00.017+00	2025-07-15 08:25:00.017+00	0.1371	0.130000000000000000	\N	FAILED	2025-07-15 08:25:00.28+00	2025-07-15 08:25:00.38+00	PERIODIC	0.1371	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
33	METER001	2025-07-17 03:10:03.172+00	2025-07-17 03:15:03.172+00	0.1001	0.100000000000000000	0xb96ed9a46b6d26781d8dccd46a8df98c3e7908de18768a4b08a67cced724c3db	SUCCESS	2025-07-17 03:15:03.281+00	2025-07-17 03:15:07.22+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
11	METER001	2025-07-15 08:25:00.023+00	2025-07-15 08:30:00.023+00	0.1371	0.130000000000000000	0x6732e19cab2f8ed8dcddbaf4428e067cf042d3c4a871b4d488272b3fdf2a050b	SUCCESS	2025-07-15 08:30:00.164+00	2025-07-15 08:30:03.119+00	PERIODIC	0.1371	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
12	METER001	2025-07-15 10:15:00.171+00	2025-07-15 10:20:00.171+00	0.1001	0.100000000000000000	0x2ec2112f74f2c40e71224ab29fc0909e913c707f8fdaee864b762cdedabcad38	SUCCESS	2025-07-15 10:20:00.244+00	2025-07-15 10:20:03.849+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
34	METER001	2025-07-17 05:05:03.796+00	2025-07-17 05:10:03.796+00	0.1001	0.100000000000000000	0x8c3824beb98b7697ef7d4a43e6e38ebc4affb739af15f87638f27d66cc53aa32	SUCCESS	2025-07-17 05:10:04.136+00	2025-07-17 05:10:08.533+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
13	METER001	2025-07-15 12:00:00.287+00	2025-07-15 12:05:00.287+00	0.1001	0.100000000000000000	0x53cc911c7281cdd09feef45d9ff8ed18111558e5bc3e23ee148883e77f747028	SUCCESS	2025-07-15 12:05:00.355+00	2025-07-15 12:05:04.947+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
35	METER001	2025-07-17 06:55:03.786+00	2025-07-17 07:00:03.786+00	0.1001	0.100000000000000000	0x0400f0a3bc1878f579fcc502350b34d4c19301316871e8d6ffabf01083397626	SUCCESS	2025-07-17 07:00:03.909+00	2025-07-17 07:00:07.841+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
14	METER001	2025-07-15 13:50:00.396+00	2025-07-15 13:55:00.396+00	0.1001	0.100000000000000000	0xf1de13524b4d5b713c31927985d84e879275e382c458e565b30e56c75245f3b4	SUCCESS	2025-07-15 13:55:00.481+00	2025-07-15 13:55:04.032+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
15	METER001	2025-07-15 15:45:00.57+00	2025-07-15 15:50:00.57+00	0.1001	0.100000000000000000	0x4862d6d4dabd85c284a16146a75d42547e9cab787a176c2349733d85fae52f9e	SUCCESS	2025-07-15 15:50:00.648+00	2025-07-15 15:50:04.872+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
36	METER001	2025-07-17 08:45:03.607+00	2025-07-17 08:50:03.607+00	0.1001	0.100000000000000000	0xd07168575e3d36ecdb6858956e5e884bc76fe5e905cd2b3789bab551afef1fa1	SUCCESS	2025-07-17 08:50:03.691+00	2025-07-17 08:50:07.236+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
16	METER001	2025-07-15 17:35:00.618+00	2025-07-15 17:40:00.618+00	0.1001	0.100000000000000000	0xdaeff390b3a36d7d0076c7fe1c9d61976bde613cd11bd20335af10aa73ed4a5e	SUCCESS	2025-07-15 17:40:00.688+00	2025-07-15 17:40:02.573+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
37	METER001	2025-07-17 10:40:03.368+00	2025-07-17 10:45:03.368+00	0.1001	0.100000000000000000	0xa4193a3bf3ec68125f0127ddcd7ee189cf19cef3219cdb1fa2a7559d2f857683	SUCCESS	2025-07-17 10:45:03.563+00	2025-07-17 10:45:07.419+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
17	METER001	2025-07-15 19:30:00.755+00	2025-07-15 19:35:00.755+00	0.1001	0.100000000000000000	0xe117b979f9e461fcd779a644caeb21b56329f60f66691a68879b4e3dcc770799	SUCCESS	2025-07-15 19:35:00.818+00	2025-07-15 19:35:03.851+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
18	METER001	2025-07-15 21:20:00.915+00	2025-07-15 21:25:00.915+00	0.1001	0.100000000000000000	0xa7d8f64d3f6d5e9e1e8c225845a9ef78656dd4e212a1795afee25d25ee3c4faa	SUCCESS	2025-07-15 21:25:01.105+00	2025-07-15 21:25:05.82+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
38	METER001	2025-07-17 12:30:03.603+00	2025-07-17 12:35:03.603+00	0.1001	0.100000000000000000	0xeaefb9a2d84dbf8d66dc3c63191f95bf92d77744e68cd27841a7a6e3af22d662	SUCCESS	2025-07-17 12:35:03.688+00	2025-07-17 12:35:05.996+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
19	METER001	2025-07-15 23:15:01.003+00	2025-07-15 23:20:01.003+00	0.1001	0.100000000000000000	0x47ade1ba811337c686753b18e5d29554a55c68b15b926a206025d011143974d2	SUCCESS	2025-07-15 23:20:01.181+00	2025-07-15 23:20:03.157+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
39	METER001	2025-07-17 14:20:03.83+00	2025-07-17 14:25:03.83+00	0.1001	0.100000000000000000	0x28c7747c542144bab375a5ae952a90619d976282aa796b34ae184c2ebddcc761	SUCCESS	2025-07-17 14:25:03.915+00	2025-07-17 14:25:06.573+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
20	METER001	2025-07-16 01:05:01.066+00	2025-07-16 01:10:01.066+00	0.1001	0.100000000000000000	0x8ad804da175c2533574f6f32b74215f4d86e3fafab7f1f5850becca38968c315	SUCCESS	2025-07-16 01:10:01.186+00	2025-07-16 01:10:03.895+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
21	METER001	2025-07-16 03:00:01.187+00	2025-07-16 03:05:01.187+00	0.1001	0.100000000000000000	0x2347f7a4b35edbec4bbfc61df2a8901bf9ed4113bcbbe17933749e0d023bafe6	SUCCESS	2025-07-16 03:05:01.336+00	2025-07-16 03:05:05.066+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
40	METER001	2025-07-17 16:10:04.643+00	2025-07-17 16:15:04.643+00	0.1001	0.100000000000000000	0x8427533a88273e674660f0cd35157ca79ffced86324745fddd3763b5ea1dc304	SUCCESS	2025-07-17 16:15:04.758+00	2025-07-17 16:15:08.696+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
22	METER001	2025-07-16 06:45:01.463+00	2025-07-16 06:50:01.463+00	0.1001	0.100000000000000000	0x13dc14de48f5605215e48f96b60399e952e6efd1c0668c71fadb72fb9e6abcc3	SUCCESS	2025-07-16 06:50:01.52+00	2025-07-16 06:50:05.529+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
41	METER001	2025-07-17 18:05:04.338+00	2025-07-17 18:10:04.338+00	0.1001	0.100000000000000000	0xf857609e6f3879dd50909ba491e86e8baeba182d6188b144967af4c1b35e5f75	SUCCESS	2025-07-17 18:10:04.54+00	2025-07-17 18:10:08.896+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
23	METER001	2025-07-16 08:35:01.686+00	2025-07-16 08:40:01.686+00	0.1001	0.100000000000000000	0x0416e0f861226b49adb9d0d3ae484da1617fe8b967834a1aafdb27391baf1947	SUCCESS	2025-07-16 08:40:01.795+00	2025-07-16 08:40:05.424+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
24	METER001	2025-07-16 10:25:01.849+00	2025-07-16 10:30:01.849+00	0.1001	0.100000000000000000	0x85d64cdd8ea79006fdce139e976f97d0acf6e9490fc6e1fdb423e6edbd165e46	SUCCESS	2025-07-16 10:30:01.92+00	2025-07-16 10:30:07.221+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
42	METER001	2025-07-17 19:55:04.431+00	2025-07-17 20:00:04.431+00	0.1001	0.100000000000000000	0x933031496964433e76534aba318c00f0c62866c20b228dda68ac1d33e37e1f4e	SUCCESS	2025-07-17 20:00:04.532+00	2025-07-17 20:00:06.973+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
43	METER001	2025-07-17 21:45:07.284+00	2025-07-17 21:50:07.284+00	0.1001	0.100000000000000000	0x20d6835e1d5fcde0d52bed1fc7b32d265a72fe77d097a8ad724368af2582953a	SUCCESS	2025-07-17 21:50:07.504+00	2025-07-17 21:50:11.949+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
54	METER001	2025-07-18 18:05:09.808+00	2025-07-18 18:10:09.808+00	0.1001	0.100000000000000000	0xddd6eaf4e9decca1982882eaf5bdcc1c75c50b040cc98c875e89029745eac94d	SUCCESS	2025-07-18 18:10:09.908+00	2025-07-18 18:10:15.334+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
44	METER001	2025-07-17 23:30:04.966+00	2025-07-17 23:35:04.966+00	0.1001	0.100000000000000000	0x100548784c9da66797f05fe240e20e217dbf0c222149cac8f414170e520662bf	SUCCESS	2025-07-17 23:35:05.121+00	2025-07-17 23:35:10.71+00	PERIODIC	0.1001	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
55	METER001	2025-07-18 19:55:08.585+00	2025-07-18 20:00:08.585+00	0.1001	0.100000000000000000	0xc0e90442a49e13f28daf8b7dd53c441941f6f8c3bb01a7c4ee0b17259557a561	SUCCESS	2025-07-18 20:00:08.711+00	2025-07-18 20:00:11.562+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
45	METER001	2025-07-18 01:20:04.781+00	2025-07-18 01:25:04.781+00	0.1001	0.100000000000000000	0xeefc462f0431d05add68a77a5b205dc549be1fd61a1ca33f679cae39685b538a	SUCCESS	2025-07-18 01:25:04.971+00	2025-07-18 01:25:08.199+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
56	METER001	2025-07-18 21:50:06.895+00	2025-07-18 21:55:06.895+00	0.1001	0.100000000000000000	0xb7edea08577e2976973c8302bb74c55708096b877cfa88f05a232453c4df75fe	SUCCESS	2025-07-18 21:55:06.977+00	2025-07-18 21:55:11.696+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
46	METER001	2025-07-18 03:10:06.751+00	2025-07-18 03:15:06.751+00	0.1001	0.100000000000000000	0x81270e43f0dc186b5c8715953b93fd28c1dfb3b05252e74040cc4d888c5f14e0	SUCCESS	2025-07-18 03:15:06.87+00	2025-07-18 03:15:10.881+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
47	METER001	2025-07-18 05:05:05.509+00	2025-07-18 05:10:05.509+00	0.1001	0.100000000000000000	0xc78a798d5b136db9cde14e99f0fbb7ecbc88fc73f610ac77e9aebf40052eecd5	SUCCESS	2025-07-18 05:10:05.629+00	2025-07-18 05:10:07.463+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
57	METER001	2025-07-19 03:20:06.086+00	2025-07-19 03:25:06.086+00	0.1001	0.100000000000000000	0xc63e5af72afeff9b7991633958e5d1bfc859deadefe533968646214952d60e16	SUCCESS	2025-07-19 03:25:06.227+00	2025-07-19 03:25:11.514+00	PERIODIC	0.1001	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
48	METER001	2025-07-18 06:55:06.113+00	2025-07-18 07:00:06.113+00	0.1001	0.100000000000000000	0x522760566203cc68254e6c9f51b31f8f13f6200c213ce49110fac5f935e62508	SUCCESS	2025-07-18 07:00:06.244+00	2025-07-18 07:00:10.544+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
58	METER001	2025-07-19 05:30:11.918+00	2025-07-19 05:35:11.918+00	0.1001	0.100000000000000000	0xa720ccfa24ed0d9942694ab675f632c52c95af3040c73486962286cfcf51e4dd	SUCCESS	2025-07-19 05:35:12.131+00	2025-07-19 05:35:15.188+00	PERIODIC	0.1201	0.0200	VALID	MQTT_SETTLEMENT	{}	\N
49	METER001	2025-07-18 08:45:08.089+00	2025-07-18 08:50:08.089+00	0.1001	0.100000000000000000	0x3d3d9bad8ee8e126189ebac8527a2e71f2d6c9f746ea791dcba0929a5b21b49b	SUCCESS	2025-07-18 08:50:08.292+00	2025-07-18 08:50:12.164+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
50	METER001	2025-07-18 10:40:07.578+00	2025-07-18 10:45:07.578+00	0.1001	0.100000000000000000	0x967329cda85aa8807853babc6bc61aff0593291bd0ed560001f7bd36cb6f674c	SUCCESS	2025-07-18 10:45:07.68+00	2025-07-18 10:45:11.96+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
59	METER001	2025-07-19 07:25:11.998+00	2025-07-19 07:30:11.998+00	0.1001	0.100000000000000000	0x485efca9acd0aa7a05cfba36d7e7890fdb80f82bd3041e7b735c33aaeb2ad01d	SUCCESS	2025-07-19 07:30:12.245+00	2025-07-19 07:30:17.934+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
51	METER001	2025-07-18 12:30:08.67+00	2025-07-18 12:35:08.67+00	0.1001	0.100000000000000000	0x98f76800a3c3cb5d2893df43c23fe1d6e7cd52ba56938c76c7b12a75c7bb7f1c	SUCCESS	2025-07-18 12:35:08.868+00	2025-07-18 12:35:11.204+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
60	METER001	2025-07-19 09:20:08.245+00	2025-07-19 09:25:08.245+00	0.1001	0.100000000000000000	0x6194cd85ab36f7abef072bd4adddadc3cec45ec97c32bcc2144b6baae732e528	SUCCESS	2025-07-19 09:25:08.361+00	2025-07-19 09:25:12.391+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
52	METER001	2025-07-18 14:20:05.941+00	2025-07-18 14:25:05.941+00	0.1001	0.100000000000000000	0x23fdd613b1ea3c0a5044b1f5e2259132817ebae4fe7e756acea4f290fd697ff9	SUCCESS	2025-07-18 14:25:06.122+00	2025-07-18 14:25:11.415+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
53	METER001	2025-07-18 16:15:06.013+00	2025-07-18 16:20:06.013+00	0.1001	0.100000000000000000	0x9127b57e92b23c5d8cbb3c5c5bd404f6d760fbcd9914cac06d9b47a030074769	SUCCESS	2025-07-18 16:20:06.194+00	2025-07-18 16:20:10.209+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
61	METER001	2025-07-19 13:10:00.099+00	2025-07-19 13:15:00.099+00	0.1001	0.100000000000000000	0x471aa17ccccc21330afc7cc2758ef0a289c2d6af7aa3be04800ee1468466b25d	SUCCESS	2025-07-19 13:15:00.169+00	2025-07-19 13:15:05.61+00	PERIODIC	0.1001	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
62	METER001	2025-07-19 14:10:00.176+00	2025-07-19 14:15:00.176+00	0.3167	0.310000000000000000	0xf254f3dce53d92f828eed25e2bd82ffb8a52fa959c038d0ae6ce49b0c7dfa238	SUCCESS	2025-07-19 14:15:00.242+00	2025-07-19 14:15:05.265+00	PERIODIC	0.3267	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
63	METER001	2025-07-21 08:25:02.139+00	2025-07-21 08:30:02.139+00	0.1023	0.100000000000000000	0xedd8431bcba3a6c600c29df2b76e010dbab811b73f474c3f80f1998a4cc7640b	SUCCESS	2025-07-21 08:30:02.254+00	2025-07-21 08:30:04.172+00	PERIODIC	2.4720	2.3698	VALID	MQTT_SETTLEMENT	{}	\N
64	METER001	2025-07-21 09:15:02.142+00	2025-07-21 09:20:02.142+00	0.5069	0.500000000000000000	0x120828b3d7fdeab849e56e2249fed6dc1b52847db5a21b51bb68ae8b69a0b35a	SUCCESS	2025-07-21 09:20:02.267+00	2025-07-21 09:20:05.238+00	PERIODIC	0.5069	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
65	METER001	2025-07-21 09:45:02.024+00	2025-07-21 09:50:02.024+00	2.0492	2.040000000000000000	0xcae9ee5e1a14f141ee06c59355481d16e3d84f4f9ac7bb722cee6434bfbfbe72	SUCCESS	2025-07-21 09:50:02.166+00	2025-07-21 09:50:06.119+00	PERIODIC	2.0492	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
66	METER001	2025-07-21 09:50:02.158+00	2025-07-21 09:55:02.158+00	2.0250	2.020000000000000000	0x4bcb039726845e1df2aa37abec015d4c0bad0b2925fcce8dad6fb7f22bcd8734	SUCCESS	2025-07-21 09:55:02.257+00	2025-07-21 09:55:05.268+00	PERIODIC	2.0250	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
67	METER001	2025-07-21 13:35:02.402+00	2025-07-21 13:40:02.402+00	0.1001	0.100000000000000000	0xd13f23b4a2853b3cc6d36544ff87b23d4428c5a3d0537135f3d871f3c04df289	SUCCESS	2025-07-21 13:40:02.485+00	2025-07-21 13:40:06.492+00	PERIODIC	0.1001	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
68	METER001	2025-07-21 15:25:02.344+00	2025-07-21 15:30:02.344+00	0.1001	0.100000000000000000	0xada46e812b8e6c39d697e48f409df9625d9b3cd8b3d3c7a2c4f3640b38daf11c	SUCCESS	2025-07-21 15:30:02.429+00	2025-07-21 15:30:05.513+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
69	METER001	2025-07-21 17:30:02.508+00	2025-07-21 17:35:02.508+00	0.1001	0.100000000000000000	0x453ee7215ef2e4c32353dd107e5b0972fefc746923fe42b04061ba36e707cd5e	SUCCESS	2025-07-21 17:35:02.666+00	2025-07-21 17:35:06.104+00	PERIODIC	0.1201	0.0200	VALID	MQTT_SETTLEMENT	{}	\N
70	METER001	2025-07-21 19:25:02.736+00	2025-07-21 19:30:02.736+00	0.1001	0.100000000000000000	0x0b23eea671c40ee902300d0e13f285602672cf59cfeabb15dae16b074c0a0189	SUCCESS	2025-07-21 19:30:02.818+00	2025-07-21 19:30:08.324+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
71	METER001	2025-07-21 21:15:02.704+00	2025-07-21 21:20:02.704+00	0.1001	0.100000000000000000	0x0f0234c236ec5d0cab2ce05420cd49628d248044428a6f9aaf35359d7e89ed89	SUCCESS	2025-07-21 21:20:02.821+00	2025-07-21 21:20:05.776+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
72	METER001	2025-07-21 23:00:02.741+00	2025-07-21 23:05:02.741+00	0.1001	0.100000000000000000	0xb9705a131d657c0995bb8e0169e97fda6be075dad8b29b815d430a93297aeff0	SUCCESS	2025-07-21 23:05:02.825+00	2025-07-21 23:05:06.32+00	PERIODIC	0.1001	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
73	METER001	2025-07-22 00:50:02.987+00	2025-07-22 00:55:02.987+00	0.1001	0.100000000000000000	0x6b4a6c144f5837c6032f8fc0c884f763f766f6df22e210bb718fbf711a8ce14d	SUCCESS	2025-07-22 00:55:03.149+00	2025-07-22 00:55:05.555+00	PERIODIC	0.1101	0.0100	VALID	MQTT_SETTLEMENT	{}	\N
74	METER001	2025-07-22 14:30:03.317+00	2025-07-22 14:35:03.317+00	0.1000	0.100000000000000000	0x48b979e7114e260a73d7733761722ef7ff5873a7bdc989d6f3242025f6009cdf	SUCCESS	2025-07-22 14:35:03.46+00	2025-07-22 14:35:05.433+00	PERIODIC	0.1000	0.0000	VALID	MQTT_SETTLEMENT	{}	\N
\.


--
-- Data for Name: idrs_conversions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.idrs_conversions (conversion_id, prosumer_id, wallet_address, conversion_type, idr_amount, idrs_amount, exchange_rate, blockchain_tx_hash, status, simulation_note, created_at, confirmed_at) FROM stdin;
3	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ON_RAMP	100000.00	100000.000000000000000000	1.000000	0x34b01c2c0c35dbc11bccd3821a5d0092f4ba0f4e153cc8c72bb9bea437473072	SUCCESS	Blockchain transaction: 0x34b01c2c0c35dbc11bccd3821a5d0092f4ba0f4e153cc8c72bb9bea437473072	2025-07-15 08:45:17.745+00	2025-07-15 08:45:17.745+00
4	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ON_RAMP	1000000.00	1000000.000000000000000000	1.000000	0x47a94c29324a2856c11d6b9c270b21b7f6ecba1a98c83cd10be937a36e142b5a	SUCCESS	Blockchain transaction: 0x47a94c29324a2856c11d6b9c270b21b7f6ecba1a98c83cd10be937a36e142b5a	2025-07-16 04:57:14.467+00	2025-07-16 04:57:14.467+00
5	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	OFF_RAMP	100000.00	100000.000000000000000000	1.000000	0x732a8163490102505163dc3c0ebf4339f5ea1be626d933abfc446a0a01929ba1	SUCCESS	Blockchain transaction: 0x732a8163490102505163dc3c0ebf4339f5ea1be626d933abfc446a0a01929ba1	2025-07-19 14:19:36.753+00	2025-07-19 14:19:36.753+00
6	prosumer_1752483236422_u90jpfr3k	0xD8e3F393CE919b86b05D50C30CfD8939532E82f1	ON_RAMP	10000.00	10000.000000000000000000	1.000000	0x4a0709de88f5e35894fac9e82c6a0854ee941d313241a215b0a56ebe4a03a3e2	SUCCESS	Blockchain transaction: 0x4a0709de88f5e35894fac9e82c6a0854ee941d313241a215b0a56ebe4a03a3e2	2025-07-19 15:14:36.252+00	2025-07-19 15:14:36.252+00
\.


--
-- Data for Name: market_trades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.market_trades (trade_id, buyer_order_id, seller_order_id, buyer_prosumer_id, seller_prosumer_id, buyer_wallet_address, seller_wallet_address, traded_etk_amount, price_idrs_per_etk, total_idrs_value, blockchain_tx_hash, trade_timestamp, gas_fee_wei, created_at) FROM stdin;
1	546206761326	747959622060	prosumer_1752482825660_0t9odlzv4	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0.230000000000000000	1500.000000000000000000	345.000000000000000000	0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5	2025-07-16 04:52:27+00	\N	2025-07-16 04:52:27.56+00
2	546206761326	583523894028	prosumer_1752482825660_0t9odlzv4	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0.670000000000000000	1500.000000000000000000	1005.000000000000100000	0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5	2025-07-16 04:52:27+00	\N	2025-07-16 04:52:27.559+00
3	60265440634	583523894028	prosumer_1752482825660_0t9odlzv4	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0.230000000000000000	1500.000000000000000000	345.000000000000000000	0x973f160ed8da6a205334270124e3edbf5c6f8947d2eb6e62435b388eb60fb446	2025-07-19 13:49:41+00	\N	2025-07-19 13:49:41.993+00
4	126116438565	46914799334	prosumer_1752483236422_u90jpfr3k	prosumer_1752482825660_0t9odlzv4	0xD8e3F393CE919b86b05D50C30CfD8939532E82f1	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	2.000000000000000000	1200.000000000000000000	2400.000000000000000000	0xb4e509fe97665381578aae4bdc3275b48f953e6a3cf8bf9b97c2c57f5df282d4	2025-07-19 15:18:17+00	\N	2025-07-19 15:18:18.957+00
5	124523780949	228097150958	prosumer_1752482825660_0t9odlzv4	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	1.000000000000000000	1000.000000000000000000	1000.000000000000000000	0xed34c44bc019765f3435873b42344777ff95bab74b16ca34c8384f03d7cfd391	2025-07-21 09:26:41+00	\N	2025-07-21 09:26:42.197+00
6	811259508710	228097150958	prosumer_1752482825660_0t9odlzv4	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	1.000000000000000000	1000.000000000000000000	1000.000000000000000000	0xe05787044af1f35de03122702dbbf863f5500d013e7058909d7db77debda886d	2025-07-21 09:27:39+00	\N	2025-07-21 09:27:42.79+00
7	422286735704	955821988003	prosumer_1752482825660_0t9odlzv4	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	2.000000000000000000	1300.000000000000000000	2600.000000000000000000	0x707db96293b747d3bb7ee2b84d505096a353f1ffdb226ce85a72e6ec1c19773f	2025-07-21 09:30:09+00	\N	2025-07-21 09:30:12.296+00
\.


--
-- Data for Name: mqtt_message_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mqtt_message_logs (log_id, meter_id, topic_type, direction, mqtt_topic, payload, raw_message, message_timestamp, processed_at, processing_status, error_message, correlation_id) FROM stdin;
\.


--
-- Data for Name: prosumers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prosumers (prosumer_id, email, password_hash, name, created_at, updated_at, primary_wallet_address) FROM stdin;
prosumer_1752482825660_0t9odlzv4	mnyasin26@energy.com	$2b$12$GjBuc7EZb3uLp4veGOeoBe/jN6yOoQczrhPyHzPzjqneMhPD4mZ7q	Yasin	2025-07-14 08:47:05.66+00	2025-07-15 11:40:38.234035+00	0xec7CeB00FC447E2003DE6874b0E1eCD895250230
prosumer_1752483236422_u90jpfr3k	yasminftz@energy.com	$2b$12$nk2OnrrnFgg6qOvbY.4xyOutxv4xFoI0QQqJrHqmw1jRuaJO5IKIy	Yasmin	2025-07-14 08:53:56.422+00	2025-07-15 11:40:38.24751+00	0xD8e3F393CE919b86b05D50C30CfD8939532E82f1
\.


--
-- Data for Name: smart_meters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.smart_meters (meter_id, prosumer_id, meter_blockchain_address, location, status, created_at, last_seen, updated_at, mqtt_topic_realtime, mqtt_topic_settlement, settlement_interval_minutes, firmware_version, last_settlement_at, device_configuration, last_heartbeat_at, device_model, device_version, capabilities) FROM stdin;
METER002	prosumer_1752483236422_u90jpfr3k	\N	Kopo, Bandung	ACTIVE	2025-07-14 08:54:15.769+00	2025-07-14 08:54:15.769+00	2025-07-14 08:54:15.769+00	enerlink/meters/METER002/realtime	enerlink/meters/METER002/settlement	5	1.0.0	\N	{}	\N	Generic Smart Meter	1.0.0	{"pwm": true, "motor": true, "relay": true, "solar": true, "battery": true}
METER001	prosumer_1752482825660_0t9odlzv4	\N	Sukasari, Bandung	ACTIVE	2025-07-14 08:47:29.386+00	2025-07-29 07:58:55.473+00	2025-07-29 07:58:55.475004+00	enerlink/meters/METER001/realtime	enerlink/meters/METER001/settlement	5	1.0.0	\N	{}	2025-07-29 07:58:55.473+00	Generic Smart Meter	1.0.0	{"pwm": true, "motor": true, "relay": true, "solar": true, "battery": true}
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_config (config_key, config_value, description, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: token_blacklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.token_blacklist (blacklist_id, blacklist_type, prosumer_id, token_hash, reason, ip_address, user_agent, created_at, expires_at, is_active, created_by, notes) FROM stdin;
10	TOKEN	prosumer_1752482825660_0t9odlzv4	9cfc2249219cbef694bf3cd738f6d45d897e4b8250ef9749b3fc89fd11a28f9e	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36	2025-07-15 10:26:54.430645+00	2025-07-15 11:26:54.426+00	t	SYSTEM	User initiated logout
11	TOKEN	prosumer_1752482825660_0t9odlzv4	aa875420b99b24f9d37ff775707a0c62e2712f31350fab028d51d2cd9745ffd9	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0	2025-07-15 10:27:10.454424+00	2025-07-15 11:27:10.453+00	t	SYSTEM	User initiated logout
12	TOKEN	prosumer_1752482825660_0t9odlzv4	3ed9e4c8acc43ffffd9ec7d661c7e5643a29e726a8d5b8df91225479766e6391	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36	2025-07-15 10:32:06.589742+00	2025-07-15 11:32:06.587+00	t	SYSTEM	User initiated logout
13	TOKEN	prosumer_1752482825660_0t9odlzv4	780df92d2f742ebe476923eb6872de03be9b5851d1f6c44d2ced9abc7876b409	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36	2025-07-15 11:34:43.759389+00	2025-07-15 12:34:43.756+00	t	SYSTEM	User initiated logout
14	TOKEN	prosumer_1752482825660_0t9odlzv4	546f09bbd0e660522ac7f36d0aed182e8dc4342b06cdf65b55e20d91bff2bb36	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36	2025-07-15 11:39:54.441884+00	2025-07-15 12:39:54.44+00	t	SYSTEM	User initiated logout
15	TOKEN	prosumer_1752482825660_0t9odlzv4	8b86eb8a83f7fa88dc8581d347279db86b7966f27133e82530bfc60c640316ab	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36	2025-07-15 11:53:59.155204+00	2025-07-15 12:53:59.154+00	t	SYSTEM	User initiated logout
16	TOKEN	prosumer_1752482825660_0t9odlzv4	1d3e0d1eef01d63a6f9899e4ed355d60d8d3f919cff7093b00d9ea978af1e314	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0	2025-07-19 12:29:27.601578+00	2025-07-19 13:29:00.346+00	t	SYSTEM	User initiated logout
17	TOKEN	prosumer_1752482825660_0t9odlzv4	0bea5dc184e002b02619baf866cd2c5ef12c775a7e2e235ba1e95a905db320b3	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0	2025-07-19 12:51:58.376464+00	2025-07-19 13:51:58.374+00	t	SYSTEM	User initiated logout
18	TOKEN	prosumer_1752482825660_0t9odlzv4	fd8670764c5d30bdc766d3a40185a5b7e1d18c231f048029c51aea13bef83eb4	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36	2025-07-19 15:09:45.916354+00	2025-07-19 16:09:45.915+00	t	SYSTEM	User initiated logout
19	TOKEN	prosumer_1752482825660_0t9odlzv4	240bb6a505839802dc60197fa773a3004b10b285858923a9b15fc98b86c4e6d0	LOGOUT	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0	2025-07-19 15:27:25.685461+00	2025-07-19 16:27:25.684+00	t	SYSTEM	User initiated logout
\.


--
-- Data for Name: trade_orders_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trade_orders_cache (order_id, prosumer_id, wallet_address, order_type, pair, amount_etk, price_idrs_per_etk, total_idrs_value, status_on_chain, created_at_on_chain, updated_at_cache, blockchain_tx_hash_placed, blockchain_tx_hash_filled, blockchain_tx_hash_cancelled) FROM stdin;
546206761326	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	BID	ETK/IDRS	0.000000000000000000	1500.000000000000000000	0.000000000000000000	FILLED	2025-07-16 04:52:27+00	2025-07-16 04:52:27.6+00	0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5	0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5	\N
747959622060	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ASK	ETK/IDRS	0.000000000000000000	1000.000000000000000000	0.000000000000000000	FILLED	2025-07-15 11:37:03+00	2025-07-16 04:52:27.636+00	0x2327cc6759d7e903a41ca8cc43df4345c6386b976cea75e277b727703c17579a	0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5	\N
60265440634	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	BID	ETK/IDRS	0.000000000000000000	1500.000000000000000000	0.000000000000000000	FILLED	2025-07-19 13:49:41+00	2025-07-19 13:49:42.066+00	0x973f160ed8da6a205334270124e3edbf5c6f8947d2eb6e62435b388eb60fb446	0x973f160ed8da6a205334270124e3edbf5c6f8947d2eb6e62435b388eb60fb446	\N
583523894028	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ASK	ETK/IDRS	0.000000000000000000	1500.000000000000000000	0.000000000000000000	FILLED	2025-07-16 04:51:28+00	2025-07-19 13:49:42.107+00	0x52600488b86a5b1cbf29215b7f017e5fd7d1faa919e7487f709c9890691e776c	0x973f160ed8da6a205334270124e3edbf5c6f8947d2eb6e62435b388eb60fb446	\N
126116438565	prosumer_1752483236422_u90jpfr3k	0xD8e3F393CE919b86b05D50C30CfD8939532E82f1	BID	ETK/IDRS	0.000000000000000000	1200.000000000000000000	0.000000000000000000	FILLED	2025-07-19 15:18:17+00	2025-07-19 15:18:18.995+00	0xb4e509fe97665381578aae4bdc3275b48f953e6a3cf8bf9b97c2c57f5df282d4	0xb4e509fe97665381578aae4bdc3275b48f953e6a3cf8bf9b97c2c57f5df282d4	\N
46914799334	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ASK	ETK/IDRS	0.000000000000000000	1200.000000000000000000	0.000000000000000000	FILLED	2025-07-19 15:15:09+00	2025-07-19 15:18:19.054+00	0xeab5140d35d5768a13d918f251e1d2efb608b1d0d3f893c1ad4a80a43404d261	0xb4e509fe97665381578aae4bdc3275b48f953e6a3cf8bf9b97c2c57f5df282d4	\N
124523780949	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	BID	ETK/IDRS	0.000000000000000000	1000.000000000000000000	0.000000000000000000	FILLED	2025-07-19 13:38:32+00	2025-07-21 09:26:42.234+00	0x01ce584d59eb6cb262107876c0cd56a6973bca6d043b31994b228e0cd8cfcfe6	0xed34c44bc019765f3435873b42344777ff95bab74b16ca34c8384f03d7cfd391	\N
811259508710	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	BID	ETK/IDRS	0.000000000000000000	1000.000000000000000000	0.000000000000000000	FILLED	2025-07-21 09:26:04+00	2025-07-21 09:27:42.819+00	0xd7d047ea1a16511f55e8c27fcc3115db2325d8ceb57268f109b6cf5d795ce1c5	0xe05787044af1f35de03122702dbbf863f5500d013e7058909d7db77debda886d	\N
228097150958	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ASK	ETK/IDRS	0.000000000000000000	1000.000000000000000000	0.000000000000000000	FILLED	2025-07-21 09:26:41+00	2025-07-21 09:27:42.846+00	0xed34c44bc019765f3435873b42344777ff95bab74b16ca34c8384f03d7cfd391	0xe05787044af1f35de03122702dbbf863f5500d013e7058909d7db77debda886d	\N
298308250411	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ASK	ETK/IDRS	2.000000000000000000	1200.000000000000000000	2400.000000000000000000	OPEN	2025-07-21 09:29:13+00	2025-07-21 09:29:15.71+00	0xf315d9e03e191c5c21d369973f03c27c2891b02c804f4e627050765fba64a001	\N	\N
422286735704	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	BID	ETK/IDRS	0.000000000000000000	1300.000000000000000000	0.000000000000000000	FILLED	2025-07-21 09:30:09+00	2025-07-21 09:30:12.354+00	0x707db96293b747d3bb7ee2b84d505096a353f1ffdb226ce85a72e6ec1c19773f	0x707db96293b747d3bb7ee2b84d505096a353f1ffdb226ce85a72e6ec1c19773f	\N
955821988003	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ASK	ETK/IDRS	0.000000000000000000	1300.000000000000000000	0.000000000000000000	FILLED	2025-07-21 09:28:49+00	2025-07-21 09:30:12.395+00	0x04e10768ddb4ee70fb3d36c6c17099bbf486bb55566933715371315699c54e73	0x707db96293b747d3bb7ee2b84d505096a353f1ffdb226ce85a72e6ec1c19773f	\N
442941968917	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	ASK	ETK/IDRS	1.000000000000000000	1100.000000000000000000	1100.000000000000000000	OPEN	2025-07-21 09:30:30+00	2025-07-21 09:30:32.469+00	0x232b591274545ccdff412775d18677d810795ff98f2acadb9e6f9110ea22df60	\N	\N
604969580286	prosumer_1752482825660_0t9odlzv4	0xec7CeB00FC447E2003DE6874b0E1eCD895250230	BID	ETK/IDRS	10.000000000000000000	1050.000000000000000000	10500.000000000000000000	OPEN	2025-07-21 09:31:04+00	2025-07-21 09:31:04.78+00	0x3a33bc2c918ba7364fb4fd8cef39f279bd1537b103c41b189a8a86e3d0be7d0c	\N	\N
\.


--
-- Data for Name: transaction_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_logs (log_id, prosumer_id, related_order_id, related_settlement_id, transaction_type, description, amount_primary, currency_primary, amount_secondary, currency_secondary, blockchain_tx_hash, transaction_timestamp) FROM stdin;
31	prosumer_1752482825660_0t9odlzv4	\N	\N	CONTRACT_INTERACTION	{"meterId":"METER001","meterAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","txHash":"0xe686ed41abeda10af00c9ba220a9738dc3dbfc7f81db22c044338a7be062a560","action":"Authorize smart meter for energy settlements"}	0.000000000000000000	ETK	\N	\N	0xe686ed41abeda10af00c9ba220a9738dc3dbfc7f81db22c044338a7be062a560	2025-07-15 08:25:00.259+00
32	prosumer_1752482825660_0t9odlzv4	\N	11	TOKEN_MINT	{"settlementId":"0x1a5430f76aa55f39f76f624efe858eb7ed356d6f53e29a875faa65bd01a84f31","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":137,"etkAmount":0.13,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T08:30:02.000Z","txHash":"0x6732e19cab2f8ed8dcddbaf4428e067cf042d3c4a871b4d488272b3fdf2a050b","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.130000000000000000	ETK	\N	\N	0x6732e19cab2f8ed8dcddbaf4428e067cf042d3c4a871b4d488272b3fdf2a050b	2025-07-15 08:30:02+00
33	prosumer_1752482825660_0t9odlzv4	\N	\N	TOKEN_MINT	{"message":"IDRS tokens minted for ON_RAMP conversion","walletAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","idrAmount":100000,"idrsAmount":100000,"exchangeRate":1,"txHash":"0x34b01c2c0c35dbc11bccd3821a5d0092f4ba0f4e153cc8c72bb9bea437473072"}	100000.000000000000000000	IDRS	\N	\N	\N	2025-07-15 08:45:17.74+00
34	prosumer_1752482825660_0t9odlzv4	\N	12	TOKEN_MINT	{"settlementId":"0x1a5e20a8fa1e8544b64c7018b1fa298543459fa8dd4f9219a65337685e5054a1","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T10:20:02.000Z","txHash":"0x2ec2112f74f2c40e71224ab29fc0909e913c707f8fdaee864b762cdedabcad38","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x2ec2112f74f2c40e71224ab29fc0909e913c707f8fdaee864b762cdedabcad38	2025-07-15 10:20:02+00
35	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-15T10:26:54.455Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-15 10:26:54.455+00
36	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-15T10:27:10.458Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-15 10:27:10.458+00
37	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-15T10:32:06.594Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-15 10:32:06.594+00
38	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-15T11:34:43.762Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-15 11:34:43.762+00
39	prosumer_1752482825660_0t9odlzv4	747959622060	\N	ORDER_PLACED	{"orderType":"ASK","quantity":0.23,"price":1000,"uuid":747959622060,"txHash":"0x2327cc6759d7e903a41ca8cc43df4345c6386b976cea75e277b727703c17579a"}	0.230000000000000000	ETK	\N	\N	0x2327cc6759d7e903a41ca8cc43df4345c6386b976cea75e277b727703c17579a	2025-07-15 11:37:01.961+00
40	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-15T11:39:54.445Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-15 11:39:54.445+00
41	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-15T11:53:59.158Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-15 11:53:59.158+00
42	prosumer_1752482825660_0t9odlzv4	\N	13	TOKEN_MINT	{"settlementId":"0x6db948f8e4faffe4d15c727d3dec417a86e681ed474799135ed1ea3cd7f4acdd","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T12:05:02.000Z","txHash":"0x53cc911c7281cdd09feef45d9ff8ed18111558e5bc3e23ee148883e77f747028","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x53cc911c7281cdd09feef45d9ff8ed18111558e5bc3e23ee148883e77f747028	2025-07-15 12:05:02+00
43	prosumer_1752482825660_0t9odlzv4	\N	14	TOKEN_MINT	{"settlementId":"0x096c49adcfda210af44d0c5d79837c36a0d68d390a8e883369d84b183b3c2900","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T13:55:02.000Z","txHash":"0xf1de13524b4d5b713c31927985d84e879275e382c458e565b30e56c75245f3b4","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xf1de13524b4d5b713c31927985d84e879275e382c458e565b30e56c75245f3b4	2025-07-15 13:55:02+00
44	prosumer_1752482825660_0t9odlzv4	\N	15	TOKEN_MINT	{"settlementId":"0xafa7c2e6283c9efb644e68b5227779bb2f9150289d941c86a59d1c2ab666b5a2","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T15:50:02.000Z","txHash":"0x4862d6d4dabd85c284a16146a75d42547e9cab787a176c2349733d85fae52f9e","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x4862d6d4dabd85c284a16146a75d42547e9cab787a176c2349733d85fae52f9e	2025-07-15 15:50:02+00
45	prosumer_1752482825660_0t9odlzv4	\N	16	TOKEN_MINT	{"settlementId":"0x9a3c1420e72819c69e765135f7b014b7b9ab534ee922cca042160efb07f56383","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T17:40:02.000Z","txHash":"0xdaeff390b3a36d7d0076c7fe1c9d61976bde613cd11bd20335af10aa73ed4a5e","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xdaeff390b3a36d7d0076c7fe1c9d61976bde613cd11bd20335af10aa73ed4a5e	2025-07-15 17:40:02+00
46	prosumer_1752482825660_0t9odlzv4	\N	17	TOKEN_MINT	{"settlementId":"0x41f9fbc439f3e4fae60e851ee532b719deafb826988378b09bd99375c3ee6632","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T19:35:02.000Z","txHash":"0xe117b979f9e461fcd779a644caeb21b56329f60f66691a68879b4e3dcc770799","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xe117b979f9e461fcd779a644caeb21b56329f60f66691a68879b4e3dcc770799	2025-07-15 19:35:02+00
47	prosumer_1752482825660_0t9odlzv4	\N	18	TOKEN_MINT	{"settlementId":"0xfeefb457499be82a4d6e3db0deea158779b5901de6f5a4b97d4dbcbcc112e83a","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T21:25:03.000Z","txHash":"0xa7d8f64d3f6d5e9e1e8c225845a9ef78656dd4e212a1795afee25d25ee3c4faa","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xa7d8f64d3f6d5e9e1e8c225845a9ef78656dd4e212a1795afee25d25ee3c4faa	2025-07-15 21:25:03+00
48	prosumer_1752482825660_0t9odlzv4	\N	19	TOKEN_MINT	{"settlementId":"0x644a0bfd8eaff7acf63f779d8134f3c218f9cf0616bc5ba01d970033268847b3","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-15T23:20:03.000Z","txHash":"0x47ade1ba811337c686753b18e5d29554a55c68b15b926a206025d011143974d2","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x47ade1ba811337c686753b18e5d29554a55c68b15b926a206025d011143974d2	2025-07-15 23:20:03+00
49	prosumer_1752482825660_0t9odlzv4	\N	20	TOKEN_MINT	{"settlementId":"0x8b77325d830e55f5d5e7cf1372ba74e5b1f23f4294d4aff7478bf4a59bc7d346","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T01:10:03.000Z","txHash":"0x8ad804da175c2533574f6f32b74215f4d86e3fafab7f1f5850becca38968c315","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x8ad804da175c2533574f6f32b74215f4d86e3fafab7f1f5850becca38968c315	2025-07-16 01:10:03+00
50	prosumer_1752482825660_0t9odlzv4	\N	21	TOKEN_MINT	{"settlementId":"0x48b199f60f5deaeeaa9298490ef5785d2d42c7c51dd8347cb3873bc3617ad07e","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T03:05:03.000Z","txHash":"0x2347f7a4b35edbec4bbfc61df2a8901bf9ed4113bcbbe17933749e0d023bafe6","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x2347f7a4b35edbec4bbfc61df2a8901bf9ed4113bcbbe17933749e0d023bafe6	2025-07-16 03:05:03+00
51	prosumer_1752482825660_0t9odlzv4	583523894028	\N	ORDER_PLACED	{"orderType":"ASK","quantity":0.9,"price":1500,"uuid":583523894028,"txHash":"0x52600488b86a5b1cbf29215b7f017e5fd7d1faa919e7487f709c9890691e776c"}	0.900000000000000000	ETK	\N	\N	0x52600488b86a5b1cbf29215b7f017e5fd7d1faa919e7487f709c9890691e776c	2025-07-16 04:51:26.218+00
53	prosumer_1752482825660_0t9odlzv4	\N	\N	TRADE_EXECUTION	{"buyer":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","seller":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","amountEtk":0.23,"priceIdrs":1500,"buyOrderId":"546206761326","sellOrderId":"747959622060","txHash":"0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5","action":"Trade completed between 0xec7CeB00FC447E2003DE6874b0E1eCD895250230 and 0xec7CeB00FC447E2003DE6874b0E1eCD895250230"}	0.230000000000000000	ETK	345.000000000000000000	IDRS	0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5	2025-07-16 04:52:27+00
52	prosumer_1752482825660_0t9odlzv4	546206761326	\N	ORDER_PLACED	{"orderType":"BID","quantity":0.9,"price":1500,"uuid":546206761326,"txHash":"0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5"}	0.900000000000000000	IDRS	\N	\N	0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5	2025-07-16 04:52:25.733+00
54	prosumer_1752482825660_0t9odlzv4	\N	\N	TRADE_EXECUTION	{"buyer":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","seller":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","amountEtk":0.67,"priceIdrs":1500,"buyOrderId":"546206761326","sellOrderId":"583523894028","txHash":"0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5","action":"Trade completed between 0xec7CeB00FC447E2003DE6874b0E1eCD895250230 and 0xec7CeB00FC447E2003DE6874b0E1eCD895250230"}	0.670000000000000000	ETK	1005.000000000000100000	IDRS	0x748228e8ea77c1a01903670c09fee657b66032d9e1dad85399450cff77347bc5	2025-07-16 04:52:27+00
55	prosumer_1752482825660_0t9odlzv4	\N	\N	TOKEN_MINT	{"message":"IDRS tokens minted for ON_RAMP conversion","walletAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","idrAmount":1000000,"idrsAmount":1000000,"exchangeRate":1,"txHash":"0x47a94c29324a2856c11d6b9c270b21b7f6ecba1a98c83cd10be937a36e142b5a"}	1000000.000000000000000000	IDRS	\N	\N	\N	2025-07-16 04:57:14.462+00
56	prosumer_1752482825660_0t9odlzv4	\N	22	TOKEN_MINT	{"settlementId":"0xd54f551c5459452dce7a71e3b6e70bb75ef2a3afcb486ef258bc50b9e02287bd","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T06:50:03.000Z","txHash":"0x13dc14de48f5605215e48f96b60399e952e6efd1c0668c71fadb72fb9e6abcc3","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x13dc14de48f5605215e48f96b60399e952e6efd1c0668c71fadb72fb9e6abcc3	2025-07-16 06:50:03+00
57	prosumer_1752482825660_0t9odlzv4	\N	23	TOKEN_MINT	{"settlementId":"0x0d754989c61b744ba18e1c4412ffc1dc9480500d638502dbc61f2efc67c6e806","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T08:40:04.000Z","txHash":"0x0416e0f861226b49adb9d0d3ae484da1617fe8b967834a1aafdb27391baf1947","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x0416e0f861226b49adb9d0d3ae484da1617fe8b967834a1aafdb27391baf1947	2025-07-16 08:40:04+00
58	prosumer_1752482825660_0t9odlzv4	\N	24	TOKEN_MINT	{"settlementId":"0xd08d6ee29bc4526b870de6b126f08e0a62d4f147dbfd56e0a519c9c867852a91","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T10:30:04.000Z","txHash":"0x85d64cdd8ea79006fdce139e976f97d0acf6e9490fc6e1fdb423e6edbd165e46","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x85d64cdd8ea79006fdce139e976f97d0acf6e9490fc6e1fdb423e6edbd165e46	2025-07-16 10:30:04+00
59	prosumer_1752482825660_0t9odlzv4	\N	25	TOKEN_MINT	{"settlementId":"0x7b2e6275f104b9efd6aceb37852981ea5625fd36b92e4ce730d011bdf077d029","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T12:25:04.000Z","txHash":"0xd9d0dafb29c19dd2f59fdad10de60c8abfe0f6f3f7a7b0118a222e5cca8de8fd","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xd9d0dafb29c19dd2f59fdad10de60c8abfe0f6f3f7a7b0118a222e5cca8de8fd	2025-07-16 12:25:04+00
60	prosumer_1752482825660_0t9odlzv4	\N	26	TOKEN_MINT	{"settlementId":"0x0b7d307019c13f61c7bd6033764688c3e92716c9719c1ae3e7d818b1fbefcf8b","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T14:15:04.000Z","txHash":"0x0a579bc619f4250a6825cfe3b86996a47decd80e1433185dabcd6a0fed96d4ef","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x0a579bc619f4250a6825cfe3b86996a47decd80e1433185dabcd6a0fed96d4ef	2025-07-16 14:15:04+00
61	prosumer_1752482825660_0t9odlzv4	\N	27	TOKEN_MINT	{"settlementId":"0x88a2e0442c6c7dbe5def7b5bc49f69301eb78a03669360fdf54abfb7af138e68","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T16:05:04.000Z","txHash":"0xc749a9d391e538bb490a4d3a0da83eff5507aeda98f44f60caf8d042910c3fae","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xc749a9d391e538bb490a4d3a0da83eff5507aeda98f44f60caf8d042910c3fae	2025-07-16 16:05:04+00
104	prosumer_1752483236422_u90jpfr3k	\N	\N	TOKEN_MINT	{"message":"IDRS tokens minted for ON_RAMP conversion","walletAddress":"0xD8e3F393CE919b86b05D50C30CfD8939532E82f1","idrAmount":10000,"idrsAmount":10000,"exchangeRate":1,"txHash":"0x4a0709de88f5e35894fac9e82c6a0854ee941d313241a215b0a56ebe4a03a3e2"}	10000.000000000000000000	IDRS	\N	\N	\N	2025-07-19 15:14:36.243+00
62	prosumer_1752482825660_0t9odlzv4	\N	28	TOKEN_MINT	{"settlementId":"0x6e2b833f89e3cd5df94c473dbbfc54c4541fac7be748749f13e0f81b4eb4b0c6","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T17:55:04.000Z","txHash":"0xb25485061492a18e49ff36745d9e1e28d227ada50868cd1d701afb1242ab8ea0","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xb25485061492a18e49ff36745d9e1e28d227ada50868cd1d701afb1242ab8ea0	2025-07-16 17:55:04+00
63	prosumer_1752482825660_0t9odlzv4	\N	29	TOKEN_MINT	{"settlementId":"0x0b9c77bd3788cfa6e3128e8abbed5fa1a67a6d922165c2e7d05190b3ac298c3d","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T19:50:04.000Z","txHash":"0x55bf26c1895805aec60259025e7fa3a7f2679457a30f6efb729faa210778603a","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x55bf26c1895805aec60259025e7fa3a7f2679457a30f6efb729faa210778603a	2025-07-16 19:50:04+00
64	prosumer_1752482825660_0t9odlzv4	\N	30	TOKEN_MINT	{"settlementId":"0x87d8d2c238719fde51c37f4efe78a08992aa79a7d330ddd12f21b7017ae9d395","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T21:40:04.000Z","txHash":"0xb2544a8ada72e0bad7f7cc91e513c856aff6a7aa5cf92aab44a628336256fcd9","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xb2544a8ada72e0bad7f7cc91e513c856aff6a7aa5cf92aab44a628336256fcd9	2025-07-16 21:40:04+00
65	prosumer_1752482825660_0t9odlzv4	\N	31	TOKEN_MINT	{"settlementId":"0xb5fe986eda6f3f33c0b1dfb417f92d469cc495b94576682db3c2019cf0205389","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-16T23:35:05.000Z","txHash":"0x3ffeda1360e1316f2f82440a3fb3f27cddfb6932dcd382f9f2421921fc10a358","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x3ffeda1360e1316f2f82440a3fb3f27cddfb6932dcd382f9f2421921fc10a358	2025-07-16 23:35:05+00
66	prosumer_1752482825660_0t9odlzv4	\N	32	TOKEN_MINT	{"settlementId":"0xd27203cac2e67ce7518fa1dfe47537b4b47ee94e90343241836a9d39b8070fb3","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T01:25:05.000Z","txHash":"0xeeb57e674b3ebb68406364bea8b5e352b3c0b554478a91f73940374fd873e767","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xeeb57e674b3ebb68406364bea8b5e352b3c0b554478a91f73940374fd873e767	2025-07-17 01:25:05+00
67	prosumer_1752482825660_0t9odlzv4	\N	33	TOKEN_MINT	{"settlementId":"0x35e791eb1460d9f1f39b8051dc0464872555fa9e0db4b217c99ffd1c58589fab","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T03:15:05.000Z","txHash":"0xb96ed9a46b6d26781d8dccd46a8df98c3e7908de18768a4b08a67cced724c3db","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xb96ed9a46b6d26781d8dccd46a8df98c3e7908de18768a4b08a67cced724c3db	2025-07-17 03:15:05+00
68	prosumer_1752482825660_0t9odlzv4	\N	34	TOKEN_MINT	{"settlementId":"0xc68bc51b6120679342d2dc92aef0f0ed3e3659494e1dcee9eba206f4b2673ba3","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T05:10:06.000Z","txHash":"0x8c3824beb98b7697ef7d4a43e6e38ebc4affb739af15f87638f27d66cc53aa32","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x8c3824beb98b7697ef7d4a43e6e38ebc4affb739af15f87638f27d66cc53aa32	2025-07-17 05:10:06+00
69	prosumer_1752482825660_0t9odlzv4	\N	35	TOKEN_MINT	{"settlementId":"0xf824313c44bd572677f34d006a5cf14c59f756698141c5233e7dc07a19231b1e","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T07:00:06.000Z","txHash":"0x0400f0a3bc1878f579fcc502350b34d4c19301316871e8d6ffabf01083397626","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x0400f0a3bc1878f579fcc502350b34d4c19301316871e8d6ffabf01083397626	2025-07-17 07:00:06+00
70	prosumer_1752482825660_0t9odlzv4	\N	36	TOKEN_MINT	{"settlementId":"0xc00e939bc935bd5b23a614793e9e380b7e2600cb644bfe31d02782329a71548e","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T08:50:05.000Z","txHash":"0xd07168575e3d36ecdb6858956e5e884bc76fe5e905cd2b3789bab551afef1fa1","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xd07168575e3d36ecdb6858956e5e884bc76fe5e905cd2b3789bab551afef1fa1	2025-07-17 08:50:05+00
71	prosumer_1752482825660_0t9odlzv4	\N	37	TOKEN_MINT	{"settlementId":"0x09761883b1b0465dcdb2a52b37195bbd3e3578ec78427e3a1b7a4bdfe239f886","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T10:45:05.000Z","txHash":"0xa4193a3bf3ec68125f0127ddcd7ee189cf19cef3219cdb1fa2a7559d2f857683","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xa4193a3bf3ec68125f0127ddcd7ee189cf19cef3219cdb1fa2a7559d2f857683	2025-07-17 10:45:05+00
72	prosumer_1752482825660_0t9odlzv4	\N	38	TOKEN_MINT	{"settlementId":"0x17d86992217d41d771349bcb2f6f8100499dfcd6b491eeb08bb94e09ead5004d","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T12:35:05.000Z","txHash":"0xeaefb9a2d84dbf8d66dc3c63191f95bf92d77744e68cd27841a7a6e3af22d662","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xeaefb9a2d84dbf8d66dc3c63191f95bf92d77744e68cd27841a7a6e3af22d662	2025-07-17 12:35:05+00
73	prosumer_1752482825660_0t9odlzv4	\N	39	TOKEN_MINT	{"settlementId":"0x40fbd346c0e3c439fb60a826deb93afbdd89568985a6440d94fffbac99a5ec8d","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T14:25:06.000Z","txHash":"0x28c7747c542144bab375a5ae952a90619d976282aa796b34ae184c2ebddcc761","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x28c7747c542144bab375a5ae952a90619d976282aa796b34ae184c2ebddcc761	2025-07-17 14:25:06+00
74	prosumer_1752482825660_0t9odlzv4	\N	40	TOKEN_MINT	{"settlementId":"0xa979d88651470e7de7fb7a7a67a35205ee019416a44b30c66a9e13fd15280615","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T16:15:07.000Z","txHash":"0x8427533a88273e674660f0cd35157ca79ffced86324745fddd3763b5ea1dc304","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x8427533a88273e674660f0cd35157ca79ffced86324745fddd3763b5ea1dc304	2025-07-17 16:15:07+00
75	prosumer_1752482825660_0t9odlzv4	\N	41	TOKEN_MINT	{"settlementId":"0x5e0d731d6d3b419d07e85942f630e56af44af4be1869c74f900e7430774bdff9","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T18:10:06.000Z","txHash":"0xf857609e6f3879dd50909ba491e86e8baeba182d6188b144967af4c1b35e5f75","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xf857609e6f3879dd50909ba491e86e8baeba182d6188b144967af4c1b35e5f75	2025-07-17 18:10:06+00
76	prosumer_1752482825660_0t9odlzv4	\N	42	TOKEN_MINT	{"settlementId":"0x8574e0a39f87235485ce088ae071a5735a8a7295e78010ea0afeb13e05f814d1","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T20:00:06.000Z","txHash":"0x933031496964433e76534aba318c00f0c62866c20b228dda68ac1d33e37e1f4e","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x933031496964433e76534aba318c00f0c62866c20b228dda68ac1d33e37e1f4e	2025-07-17 20:00:06+00
77	prosumer_1752482825660_0t9odlzv4	\N	43	TOKEN_MINT	{"settlementId":"0xa3d173b5f1e13a2d876ec09ede10ed6d33fc2d7e8d2ac99da68ff4fe0aff24fb","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T21:50:09.000Z","txHash":"0x20d6835e1d5fcde0d52bed1fc7b32d265a72fe77d097a8ad724368af2582953a","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x20d6835e1d5fcde0d52bed1fc7b32d265a72fe77d097a8ad724368af2582953a	2025-07-17 21:50:09+00
78	prosumer_1752482825660_0t9odlzv4	\N	44	TOKEN_MINT	{"settlementId":"0x4308b02405da53ae9574429e48ba78a3466a4b2f76dc28d4fbcc820bf0ebc6e7","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-17T23:35:07.000Z","txHash":"0x100548784c9da66797f05fe240e20e217dbf0c222149cac8f414170e520662bf","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x100548784c9da66797f05fe240e20e217dbf0c222149cac8f414170e520662bf	2025-07-17 23:35:07+00
79	prosumer_1752482825660_0t9odlzv4	\N	45	TOKEN_MINT	{"settlementId":"0x8ff6bb9949f286817b178d2df337929f82a3a7437a9bae59e1ceaa358654b5a4","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T01:25:07.000Z","txHash":"0xeefc462f0431d05add68a77a5b205dc549be1fd61a1ca33f679cae39685b538a","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xeefc462f0431d05add68a77a5b205dc549be1fd61a1ca33f679cae39685b538a	2025-07-18 01:25:07+00
80	prosumer_1752482825660_0t9odlzv4	\N	46	TOKEN_MINT	{"settlementId":"0xde2209fcabc958e2b176e9a2d1b65e3c169ae95b42d03ce71496c22b97538560","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T03:15:09.000Z","txHash":"0x81270e43f0dc186b5c8715953b93fd28c1dfb3b05252e74040cc4d888c5f14e0","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x81270e43f0dc186b5c8715953b93fd28c1dfb3b05252e74040cc4d888c5f14e0	2025-07-18 03:15:09+00
81	prosumer_1752482825660_0t9odlzv4	\N	47	TOKEN_MINT	{"settlementId":"0x9c345f7c4aece540c4c97d1003b9aacd81d9aa0820f6e2c4c817cc9420edad1c","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T05:10:07.000Z","txHash":"0xc78a798d5b136db9cde14e99f0fbb7ecbc88fc73f610ac77e9aebf40052eecd5","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xc78a798d5b136db9cde14e99f0fbb7ecbc88fc73f610ac77e9aebf40052eecd5	2025-07-18 05:10:07+00
82	prosumer_1752482825660_0t9odlzv4	\N	48	TOKEN_MINT	{"settlementId":"0x063e5a2859d6670593e5e274ce3baea79954f3770aae999e77752232c1333d1b","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T07:00:08.000Z","txHash":"0x522760566203cc68254e6c9f51b31f8f13f6200c213ce49110fac5f935e62508","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x522760566203cc68254e6c9f51b31f8f13f6200c213ce49110fac5f935e62508	2025-07-18 07:00:08+00
83	prosumer_1752482825660_0t9odlzv4	\N	49	TOKEN_MINT	{"settlementId":"0x1d84057a3a560fa8624c8137a45af8c7f631bb5671b79cecb1a7de55998b45ce","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T08:50:10.000Z","txHash":"0x3d3d9bad8ee8e126189ebac8527a2e71f2d6c9f746ea791dcba0929a5b21b49b","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x3d3d9bad8ee8e126189ebac8527a2e71f2d6c9f746ea791dcba0929a5b21b49b	2025-07-18 08:50:10+00
84	prosumer_1752482825660_0t9odlzv4	\N	50	TOKEN_MINT	{"settlementId":"0xbd6c7fcb37f8743e233e6aa3d58f78a664bb680416be5b04c4fc842e2380f087","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T10:45:09.000Z","txHash":"0x967329cda85aa8807853babc6bc61aff0593291bd0ed560001f7bd36cb6f674c","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x967329cda85aa8807853babc6bc61aff0593291bd0ed560001f7bd36cb6f674c	2025-07-18 10:45:09+00
85	prosumer_1752482825660_0t9odlzv4	\N	51	TOKEN_MINT	{"settlementId":"0xd988a9d0d8532d641d185a576814aa7cd602b026baa957eb0c434d5503224a1e","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T12:35:11.000Z","txHash":"0x98f76800a3c3cb5d2893df43c23fe1d6e7cd52ba56938c76c7b12a75c7bb7f1c","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x98f76800a3c3cb5d2893df43c23fe1d6e7cd52ba56938c76c7b12a75c7bb7f1c	2025-07-18 12:35:11+00
86	prosumer_1752482825660_0t9odlzv4	\N	52	TOKEN_MINT	{"settlementId":"0x3382ae6415ef649bbdafd63706230fc6e873a0e856deb26432aa80fbd884403e","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T14:25:08.000Z","txHash":"0x23fdd613b1ea3c0a5044b1f5e2259132817ebae4fe7e756acea4f290fd697ff9","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x23fdd613b1ea3c0a5044b1f5e2259132817ebae4fe7e756acea4f290fd697ff9	2025-07-18 14:25:08+00
87	prosumer_1752482825660_0t9odlzv4	\N	53	TOKEN_MINT	{"settlementId":"0x3c9daab03a1aedb8d76d182e6c05a7fcd25183dea54664671861f9c0d2af9b29","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T16:20:08.000Z","txHash":"0x9127b57e92b23c5d8cbb3c5c5bd404f6d760fbcd9914cac06d9b47a030074769","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x9127b57e92b23c5d8cbb3c5c5bd404f6d760fbcd9914cac06d9b47a030074769	2025-07-18 16:20:08+00
88	prosumer_1752482825660_0t9odlzv4	\N	54	TOKEN_MINT	{"settlementId":"0xd2e1050c3b4f97cf8103856ba860f025b8ba5b305ed36d24c05c72ba0252c539","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T18:10:12.000Z","txHash":"0xddd6eaf4e9decca1982882eaf5bdcc1c75c50b040cc98c875e89029745eac94d","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xddd6eaf4e9decca1982882eaf5bdcc1c75c50b040cc98c875e89029745eac94d	2025-07-18 18:10:12+00
89	prosumer_1752482825660_0t9odlzv4	\N	55	TOKEN_MINT	{"settlementId":"0x3dbee1e28cecc2dfbd9dcf71889133f5cae32fc5f8e980cd8776cb2423aa1335","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T20:00:11.000Z","txHash":"0xc0e90442a49e13f28daf8b7dd53c441941f6f8c3bb01a7c4ee0b17259557a561","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xc0e90442a49e13f28daf8b7dd53c441941f6f8c3bb01a7c4ee0b17259557a561	2025-07-18 20:00:11+00
90	prosumer_1752482825660_0t9odlzv4	\N	56	TOKEN_MINT	{"settlementId":"0x4b3a72a995aa9932a939d4805320a5ea26d4847c38292d86dd48558e2265cffc","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-18T21:55:09.000Z","txHash":"0xb7edea08577e2976973c8302bb74c55708096b877cfa88f05a232453c4df75fe","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xb7edea08577e2976973c8302bb74c55708096b877cfa88f05a232453c4df75fe	2025-07-18 21:55:09+00
91	prosumer_1752482825660_0t9odlzv4	\N	57	TOKEN_MINT	{"settlementId":"0xd6cce0290447295182b43665804a1bf4fd688a96cdacee5466122984260b91b8","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-19T03:25:08.000Z","txHash":"0xc63e5af72afeff9b7991633958e5d1bfc859deadefe533968646214952d60e16","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xc63e5af72afeff9b7991633958e5d1bfc859deadefe533968646214952d60e16	2025-07-19 03:25:08+00
92	prosumer_1752482825660_0t9odlzv4	\N	58	TOKEN_MINT	{"settlementId":"0x04f5c4fd22ca2b60b737126c6edfd44f22f21d903a377db4838001c38c493da4","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-19T05:35:14.000Z","txHash":"0xa720ccfa24ed0d9942694ab675f632c52c95af3040c73486962286cfcf51e4dd","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xa720ccfa24ed0d9942694ab675f632c52c95af3040c73486962286cfcf51e4dd	2025-07-19 05:35:14+00
93	prosumer_1752482825660_0t9odlzv4	\N	59	TOKEN_MINT	{"settlementId":"0xb58f4c06db4278b9339030bbb7ad2549c41a895fe4a5664bd6ca90913f1e643e","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-19T07:30:14.000Z","txHash":"0x485efca9acd0aa7a05cfba36d7e7890fdb80f82bd3041e7b735c33aaeb2ad01d","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x485efca9acd0aa7a05cfba36d7e7890fdb80f82bd3041e7b735c33aaeb2ad01d	2025-07-19 07:30:14+00
94	prosumer_1752482825660_0t9odlzv4	\N	60	TOKEN_MINT	{"settlementId":"0xff994638d267472a4867efe5455c0183e207ce3a38dfe192ef3eaf607bb8ca06","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-19T09:25:10.000Z","txHash":"0x6194cd85ab36f7abef072bd4adddadc3cec45ec97c32bcc2144b6baae732e528","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x6194cd85ab36f7abef072bd4adddadc3cec45ec97c32bcc2144b6baae732e528	2025-07-19 09:25:10+00
95	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-19T12:29:30.604Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-19 12:29:30.604+00
96	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-19T12:51:58.418Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-19 12:51:58.418+00
97	prosumer_1752482825660_0t9odlzv4	\N	61	TOKEN_MINT	{"settlementId":"0xbe16342a5ca164ca4217cfe22449dcee06e092634e8abe841eaafe806ad42353","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-19T13:15:02.000Z","txHash":"0x471aa17ccccc21330afc7cc2758ef0a289c2d6af7aa3be04800ee1468466b25d","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x471aa17ccccc21330afc7cc2758ef0a289c2d6af7aa3be04800ee1468466b25d	2025-07-19 13:15:02+00
98	prosumer_1752482825660_0t9odlzv4	124523780949	\N	ORDER_PLACED	{"orderType":"BID","quantity":1,"price":1000,"uuid":124523780949,"txHash":"0x01ce584d59eb6cb262107876c0cd56a6973bca6d043b31994b228e0cd8cfcfe6"}	1.000000000000000000	IDRS	\N	\N	0x01ce584d59eb6cb262107876c0cd56a6973bca6d043b31994b228e0cd8cfcfe6	2025-07-19 13:38:30.36+00
99	prosumer_1752482825660_0t9odlzv4	60265440634	\N	ORDER_PLACED	{"orderType":"BID","quantity":0.23,"price":1500,"uuid":60265440634,"txHash":"0x973f160ed8da6a205334270124e3edbf5c6f8947d2eb6e62435b388eb60fb446"}	0.230000000000000000	IDRS	\N	\N	0x973f160ed8da6a205334270124e3edbf5c6f8947d2eb6e62435b388eb60fb446	2025-07-19 13:49:39.844+00
100	prosumer_1752482825660_0t9odlzv4	\N	\N	TRADE_EXECUTION	{"buyer":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","seller":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","amountEtk":0.23,"priceIdrs":1500,"buyOrderId":"60265440634","sellOrderId":"583523894028","txHash":"0x973f160ed8da6a205334270124e3edbf5c6f8947d2eb6e62435b388eb60fb446","action":"Trade completed between 0xec7CeB00FC447E2003DE6874b0E1eCD895250230 and 0xec7CeB00FC447E2003DE6874b0E1eCD895250230"}	0.230000000000000000	ETK	345.000000000000000000	IDRS	0x973f160ed8da6a205334270124e3edbf5c6f8947d2eb6e62435b388eb60fb446	2025-07-19 13:49:41+00
101	prosumer_1752482825660_0t9odlzv4	\N	62	TOKEN_MINT	{"settlementId":"0x20fdf2d2d68fe1ee81a3ae1f821e307296d7116b27957f6c2363723fdbff21ba","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":316,"etkAmount":0.31,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-19T14:15:02.000Z","txHash":"0xf254f3dce53d92f828eed25e2bd82ffb8a52fa959c038d0ae6ce49b0c7dfa238","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.310000000000000000	ETK	\N	\N	0xf254f3dce53d92f828eed25e2bd82ffb8a52fa959c038d0ae6ce49b0c7dfa238	2025-07-19 14:15:02+00
102	prosumer_1752482825660_0t9odlzv4	\N	\N	TOKEN_BURN	{"message":"IDRS tokens burned for OFF_RAMP conversion","walletAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","idrsAmount":100000,"idrAmount":100000,"exchangeRate":1,"txHash":"0x732a8163490102505163dc3c0ebf4339f5ea1be626d933abfc446a0a01929ba1"}	100000.000000000000000000	IDRS	\N	\N	\N	2025-07-19 14:19:36.747+00
103	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-19T15:09:45.924Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-19 15:09:45.924+00
105	prosumer_1752482825660_0t9odlzv4	46914799334	\N	ORDER_PLACED	{"orderType":"ASK","quantity":2,"price":1200,"uuid":46914799334,"txHash":"0xeab5140d35d5768a13d918f251e1d2efb608b1d0d3f893c1ad4a80a43404d261"}	2.000000000000000000	ETK	\N	\N	0xeab5140d35d5768a13d918f251e1d2efb608b1d0d3f893c1ad4a80a43404d261	2025-07-19 15:15:07.737+00
106	prosumer_1752483236422_u90jpfr3k	126116438565	\N	ORDER_PLACED	{"orderType":"BID","quantity":2,"price":1200,"uuid":126116438565,"txHash":"0xb4e509fe97665381578aae4bdc3275b48f953e6a3cf8bf9b97c2c57f5df282d4"}	2.000000000000000000	IDRS	\N	\N	0xb4e509fe97665381578aae4bdc3275b48f953e6a3cf8bf9b97c2c57f5df282d4	2025-07-19 15:18:15.25+00
107	prosumer_1752483236422_u90jpfr3k	\N	\N	TRADE_EXECUTION	{"buyer":"0xD8e3F393CE919b86b05D50C30CfD8939532E82f1","seller":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","amountEtk":2,"priceIdrs":1200,"buyOrderId":"126116438565","sellOrderId":"46914799334","txHash":"0xb4e509fe97665381578aae4bdc3275b48f953e6a3cf8bf9b97c2c57f5df282d4","action":"Trade completed between 0xD8e3F393CE919b86b05D50C30CfD8939532E82f1 and 0xec7CeB00FC447E2003DE6874b0E1eCD895250230"}	2.000000000000000000	ETK	2400.000000000000000000	IDRS	0xb4e509fe97665381578aae4bdc3275b48f953e6a3cf8bf9b97c2c57f5df282d4	2025-07-19 15:18:17+00
108	prosumer_1752482825660_0t9odlzv4	\N	\N	DEVICE_COMMAND	{"message":"User logged out","timestamp":"2025-07-19T15:27:25.687Z","ipAddress":"::ffff:127.0.0.1","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"}	0.000000000000000000	ETK	\N	\N	\N	2025-07-19 15:27:25.687+00
109	prosumer_1752482825660_0t9odlzv4	\N	63	TOKEN_MINT	{"settlementId":"0x04c5ebce691c8add95fe1452cb3a488d584e3a7cc6030594ec20b3e002104620","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":102,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T08:30:04.000Z","txHash":"0xedd8431bcba3a6c600c29df2b76e010dbab811b73f474c3f80f1998a4cc7640b","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xedd8431bcba3a6c600c29df2b76e010dbab811b73f474c3f80f1998a4cc7640b	2025-07-21 08:30:04+00
110	prosumer_1752482825660_0t9odlzv4	\N	64	TOKEN_MINT	{"settlementId":"0x8871e77991736925f73a92725b6db1bbbc20cc55049cd431f6793924724708f8","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":506,"etkAmount":0.5,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T09:20:04.000Z","txHash":"0x120828b3d7fdeab849e56e2249fed6dc1b52847db5a21b51bb68ae8b69a0b35a","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.500000000000000000	ETK	\N	\N	0x120828b3d7fdeab849e56e2249fed6dc1b52847db5a21b51bb68ae8b69a0b35a	2025-07-21 09:20:04+00
111	prosumer_1752482825660_0t9odlzv4	811259508710	\N	ORDER_PLACED	{"orderType":"BID","quantity":1,"price":1000,"uuid":811259508710,"txHash":"0xd7d047ea1a16511f55e8c27fcc3115db2325d8ceb57268f109b6cf5d795ce1c5"}	1.000000000000000000	IDRS	\N	\N	0xd7d047ea1a16511f55e8c27fcc3115db2325d8ceb57268f109b6cf5d795ce1c5	2025-07-21 09:26:02.345+00
112	prosumer_1752482825660_0t9odlzv4	228097150958	\N	ORDER_PLACED	{"orderType":"ASK","quantity":2,"price":1000,"uuid":228097150958,"txHash":"0xed34c44bc019765f3435873b42344777ff95bab74b16ca34c8384f03d7cfd391"}	2.000000000000000000	ETK	\N	\N	0xed34c44bc019765f3435873b42344777ff95bab74b16ca34c8384f03d7cfd391	2025-07-21 09:26:39.589+00
113	prosumer_1752482825660_0t9odlzv4	\N	\N	TRADE_EXECUTION	{"buyer":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","seller":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","amountEtk":1,"priceIdrs":1000,"buyOrderId":"124523780949","sellOrderId":"228097150958","txHash":"0xed34c44bc019765f3435873b42344777ff95bab74b16ca34c8384f03d7cfd391","action":"Trade completed between 0xec7CeB00FC447E2003DE6874b0E1eCD895250230 and 0xec7CeB00FC447E2003DE6874b0E1eCD895250230"}	1.000000000000000000	ETK	1000.000000000000000000	IDRS	0xed34c44bc019765f3435873b42344777ff95bab74b16ca34c8384f03d7cfd391	2025-07-21 09:26:41+00
115	prosumer_1752482825660_0t9odlzv4	\N	\N	TRADE_EXECUTION	{"buyer":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","seller":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","amountEtk":1,"priceIdrs":1000,"buyOrderId":"811259508710","sellOrderId":"228097150958","txHash":"0xe05787044af1f35de03122702dbbf863f5500d013e7058909d7db77debda886d","action":"Trade completed between 0xec7CeB00FC447E2003DE6874b0E1eCD895250230 and 0xec7CeB00FC447E2003DE6874b0E1eCD895250230"}	1.000000000000000000	ETK	1000.000000000000000000	IDRS	0xe05787044af1f35de03122702dbbf863f5500d013e7058909d7db77debda886d	2025-07-21 09:27:39+00
114	prosumer_1752482825660_0t9odlzv4	\N	\N	ORDER_PLACED	{"orderType":"BID","quantity":1,"price":1000,"uuid":78824464070,"txHash":"0xe05787044af1f35de03122702dbbf863f5500d013e7058909d7db77debda886d"}	1.000000000000000000	IDRS	\N	\N	0xe05787044af1f35de03122702dbbf863f5500d013e7058909d7db77debda886d	2025-07-21 09:27:37.685+00
116	prosumer_1752482825660_0t9odlzv4	955821988003	\N	ORDER_PLACED	{"orderType":"ASK","quantity":2,"price":1300,"uuid":955821988003,"txHash":"0x04e10768ddb4ee70fb3d36c6c17099bbf486bb55566933715371315699c54e73"}	2.000000000000000000	ETK	\N	\N	0x04e10768ddb4ee70fb3d36c6c17099bbf486bb55566933715371315699c54e73	2025-07-21 09:28:47.395+00
117	prosumer_1752482825660_0t9odlzv4	298308250411	\N	ORDER_PLACED	{"orderType":"ASK","quantity":2,"price":1200,"uuid":298308250411,"txHash":"0xf315d9e03e191c5c21d369973f03c27c2891b02c804f4e627050765fba64a001"}	2.000000000000000000	ETK	\N	\N	0xf315d9e03e191c5c21d369973f03c27c2891b02c804f4e627050765fba64a001	2025-07-21 09:29:11.295+00
119	prosumer_1752482825660_0t9odlzv4	\N	\N	TRADE_EXECUTION	{"buyer":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","seller":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","amountEtk":2,"priceIdrs":1300,"buyOrderId":"422286735704","sellOrderId":"955821988003","txHash":"0x707db96293b747d3bb7ee2b84d505096a353f1ffdb226ce85a72e6ec1c19773f","action":"Trade completed between 0xec7CeB00FC447E2003DE6874b0E1eCD895250230 and 0xec7CeB00FC447E2003DE6874b0E1eCD895250230"}	2.000000000000000000	ETK	2600.000000000000000000	IDRS	0x707db96293b747d3bb7ee2b84d505096a353f1ffdb226ce85a72e6ec1c19773f	2025-07-21 09:30:09+00
118	prosumer_1752482825660_0t9odlzv4	422286735704	\N	ORDER_PLACED	{"orderType":"BID","quantity":2,"price":1300,"uuid":422286735704,"txHash":"0x707db96293b747d3bb7ee2b84d505096a353f1ffdb226ce85a72e6ec1c19773f"}	2.000000000000000000	IDRS	\N	\N	0x707db96293b747d3bb7ee2b84d505096a353f1ffdb226ce85a72e6ec1c19773f	2025-07-21 09:30:07.91+00
120	prosumer_1752482825660_0t9odlzv4	442941968917	\N	ORDER_PLACED	{"orderType":"ASK","quantity":1,"price":1100,"uuid":442941968917,"txHash":"0x232b591274545ccdff412775d18677d810795ff98f2acadb9e6f9110ea22df60"}	1.000000000000000000	ETK	\N	\N	0x232b591274545ccdff412775d18677d810795ff98f2acadb9e6f9110ea22df60	2025-07-21 09:30:28.194+00
121	prosumer_1752482825660_0t9odlzv4	604969580286	\N	ORDER_PLACED	{"orderType":"BID","quantity":10,"price":1050,"uuid":604969580286,"txHash":"0x3a33bc2c918ba7364fb4fd8cef39f279bd1537b103c41b189a8a86e3d0be7d0c"}	10.000000000000000000	IDRS	\N	\N	0x3a33bc2c918ba7364fb4fd8cef39f279bd1537b103c41b189a8a86e3d0be7d0c	2025-07-21 09:31:02.668+00
122	prosumer_1752482825660_0t9odlzv4	\N	65	TOKEN_MINT	{"settlementId":"0x2b258fa07cb78f127feafc467d12929d08c4fadedeebed484731d9e1b91e6713","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":2049,"etkAmount":2.04,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T09:50:04.000Z","txHash":"0xcae9ee5e1a14f141ee06c59355481d16e3d84f4f9ac7bb722cee6434bfbfbe72","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	2.040000000000000000	ETK	\N	\N	0xcae9ee5e1a14f141ee06c59355481d16e3d84f4f9ac7bb722cee6434bfbfbe72	2025-07-21 09:50:04+00
123	prosumer_1752482825660_0t9odlzv4	\N	66	TOKEN_MINT	{"settlementId":"0x1793ddddbcfa343f20cacd07cae5e2b53ee1ab6829ff3cb724d0103ebb13c31d","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":2025,"etkAmount":2.02,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T09:55:04.000Z","txHash":"0x4bcb039726845e1df2aa37abec015d4c0bad0b2925fcce8dad6fb7f22bcd8734","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	2.020000000000000000	ETK	\N	\N	0x4bcb039726845e1df2aa37abec015d4c0bad0b2925fcce8dad6fb7f22bcd8734	2025-07-21 09:55:04+00
124	prosumer_1752482825660_0t9odlzv4	\N	67	TOKEN_MINT	{"settlementId":"0x604181d0dc85fbf93d5a07f75b048043b6f123cd014cecb1b4fac73f15405aee","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T13:40:04.000Z","txHash":"0xd13f23b4a2853b3cc6d36544ff87b23d4428c5a3d0537135f3d871f3c04df289","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xd13f23b4a2853b3cc6d36544ff87b23d4428c5a3d0537135f3d871f3c04df289	2025-07-21 13:40:04+00
125	prosumer_1752482825660_0t9odlzv4	\N	68	TOKEN_MINT	{"settlementId":"0xae7aa4cbb3f79fcf7139ce3b8e5615cce00d897c8e1931d98cd98555190f6415","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T15:30:04.000Z","txHash":"0xada46e812b8e6c39d697e48f409df9625d9b3cd8b3d3c7a2c4f3640b38daf11c","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xada46e812b8e6c39d697e48f409df9625d9b3cd8b3d3c7a2c4f3640b38daf11c	2025-07-21 15:30:04+00
126	prosumer_1752482825660_0t9odlzv4	\N	69	TOKEN_MINT	{"settlementId":"0xf77cbf27cd06330055d9506ef31410b978c0b18a6b45a0d27d5c4d86e33db46e","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T17:35:04.000Z","txHash":"0x453ee7215ef2e4c32353dd107e5b0972fefc746923fe42b04061ba36e707cd5e","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x453ee7215ef2e4c32353dd107e5b0972fefc746923fe42b04061ba36e707cd5e	2025-07-21 17:35:04+00
127	prosumer_1752482825660_0t9odlzv4	\N	70	TOKEN_MINT	{"settlementId":"0x73269e35f42c0a162071c335c54200507c45d4f3621418b24cf10d639777c044","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T19:30:05.000Z","txHash":"0x0b23eea671c40ee902300d0e13f285602672cf59cfeabb15dae16b074c0a0189","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x0b23eea671c40ee902300d0e13f285602672cf59cfeabb15dae16b074c0a0189	2025-07-21 19:30:05+00
128	prosumer_1752482825660_0t9odlzv4	\N	71	TOKEN_MINT	{"settlementId":"0x0d3275eb257d86cea86569f13093c7cbeed27be23b8d6e8e33fa34e39f0456f3","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T21:20:05.000Z","txHash":"0x0f0234c236ec5d0cab2ce05420cd49628d248044428a6f9aaf35359d7e89ed89","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x0f0234c236ec5d0cab2ce05420cd49628d248044428a6f9aaf35359d7e89ed89	2025-07-21 21:20:05+00
129	prosumer_1752482825660_0t9odlzv4	\N	72	TOKEN_MINT	{"settlementId":"0x7b1ec2127f8423252672f8e11a8026ac4cc68f207f1e9ca3c4c5051859807fa0","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-21T23:05:05.000Z","txHash":"0xb9705a131d657c0995bb8e0169e97fda6be075dad8b29b815d430a93297aeff0","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0xb9705a131d657c0995bb8e0169e97fda6be075dad8b29b815d430a93297aeff0	2025-07-21 23:05:05+00
130	prosumer_1752482825660_0t9odlzv4	\N	73	TOKEN_MINT	{"settlementId":"0x0c6fc9c03409e9997bc9498464ac802fe46767b687f41dfb1b0343d730cd018b","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-22T00:55:05.000Z","txHash":"0x6b4a6c144f5837c6032f8fc0c884f763f766f6df22e210bb718fbf711a8ce14d","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x6b4a6c144f5837c6032f8fc0c884f763f766f6df22e210bb718fbf711a8ce14d	2025-07-22 00:55:05+00
131	prosumer_1752482825660_0t9odlzv4	\N	74	TOKEN_MINT	{"settlementId":"0x8e3ca21c47dbe39eb46237f5884d2437f4a54558e1ccf44597bc97d73aa07f40","meterIdDb":"METER001","prosumerAddress":"0xec7CeB00FC447E2003DE6874b0E1eCD895250230","netEnergyWh":100,"etkAmount":0.1,"operationType":"EXPORT_TO_GRID","timestamp":"2025-07-22T14:35:05.000Z","txHash":"0x48b979e7114e260a73d7733761722ef7ff5873a7bdc989d6f3242025f6009cdf","action":"Settlement confirmed on blockchain - EXPORT_TO_GRID"}	0.100000000000000000	ETK	\N	\N	0x48b979e7114e260a73d7733761722ef7ff5873a7bdc989d6f3242025f6009cdf	2025-07-22 14:35:05+00
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallets (wallet_address, prosumer_id, wallet_name, encrypted_private_key, created_at, import_method, is_active, last_used_at) FROM stdin;
0xD8e3F393CE919b86b05D50C30CfD8939532E82f1	prosumer_1752483236422_u90jpfr3k	Yasmin Fathanah Zakiyyah's Wallet	9a8829997a807f3eacb0a9ec826a1301:42a5cd51edba2c928f92afff8d707743e5ce5b3cd8035628a0c03aa731df0c83e049e50f0044bd55f4e96c8435429711ff4bd47949916983e0a99008caac67d4f107c3d6e9c216ddf208cd723dae59b0	2025-07-14 08:53:56.479+00	GENERATED	t	2025-07-19 15:18:18.958273+00
0xec7CeB00FC447E2003DE6874b0E1eCD895250230	prosumer_1752482825660_0t9odlzv4	Muhamad Nur Yasin Amadudin's Wallet	fbde8a5b331bd2aed585963ce50f6c04:aceadd7840b4b85f7fc7d82c992223e0c7f4c86f6c31f7a7c98b26b86b6ecc3b1655956cfa7dfa94ed78bfb472fe6b1c5a96bbe14e95d5a8f29b8719e766219f7e458394b0470a0ccc5bf79892160295	2025-07-14 08:47:05.769+00	GENERATED	t	2025-07-21 09:31:04.781582+00
0x57b4beD123b28f119361260B81F0e910878564b3	prosumer_1752482825660_0t9odlzv4	Yasmin's Wallet	811aa0d27531f96e26df0f81957b0282:a4ce17d57381dc40b74e8499549003d90fd04370770e1e041bc49313a005c881e82a0e046ab47ec4c9b306b555acea3e6197e8869db9cc52cdb633c9992e693011b65e2dbbacb2fbbfcf2dc00a101a02	2025-07-19 15:07:24.966+00	GENERATED	t	2025-07-19 15:07:24.966+00
\.


--
-- Name: device_commands_command_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.device_commands_command_id_seq', 106, true);


--
-- Name: device_status_snapshots_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.device_status_snapshots_snapshot_id_seq', 71157, true);


--
-- Name: energy_readings_detailed_reading_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.energy_readings_detailed_reading_id_seq', 1772900, true);


--
-- Name: energy_settlements_settlement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.energy_settlements_settlement_id_seq', 74, true);


--
-- Name: idrs_conversions_conversion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.idrs_conversions_conversion_id_seq', 6, true);


--
-- Name: market_trades_trade_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.market_trades_trade_id_seq', 7, true);


--
-- Name: mqtt_message_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mqtt_message_logs_log_id_seq', 425942, true);


--
-- Name: token_blacklist_blacklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.token_blacklist_blacklist_id_seq', 19, true);


--
-- Name: transaction_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_logs_log_id_seq', 131, true);


--
-- Name: device_commands device_commands_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT device_commands_correlation_id_key UNIQUE (correlation_id);


--
-- Name: device_commands device_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT device_commands_pkey PRIMARY KEY (command_id);


--
-- Name: device_status_snapshots device_status_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_status_snapshots
    ADD CONSTRAINT device_status_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: energy_readings_detailed energy_readings_detailed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_readings_detailed
    ADD CONSTRAINT energy_readings_detailed_pkey PRIMARY KEY (reading_id);


--
-- Name: energy_settlements energy_settlements_blockchain_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT energy_settlements_blockchain_tx_hash_key UNIQUE (blockchain_tx_hash);


--
-- Name: energy_settlements energy_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT energy_settlements_pkey PRIMARY KEY (settlement_id);


--
-- Name: idrs_conversions idrs_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idrs_conversions
    ADD CONSTRAINT idrs_conversions_pkey PRIMARY KEY (conversion_id);


--
-- Name: market_trades market_trades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT market_trades_pkey PRIMARY KEY (trade_id);


--
-- Name: mqtt_message_logs mqtt_message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mqtt_message_logs
    ADD CONSTRAINT mqtt_message_logs_pkey PRIMARY KEY (log_id);


--
-- Name: prosumers prosumers_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prosumers
    ADD CONSTRAINT prosumers_email_key UNIQUE (email);


--
-- Name: prosumers prosumers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prosumers
    ADD CONSTRAINT prosumers_pkey PRIMARY KEY (prosumer_id);


--
-- Name: smart_meters smart_meters_meter_blockchain_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smart_meters
    ADD CONSTRAINT smart_meters_meter_blockchain_address_key UNIQUE (meter_blockchain_address);


--
-- Name: smart_meters smart_meters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smart_meters
    ADD CONSTRAINT smart_meters_pkey PRIMARY KEY (meter_id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (config_key);


--
-- Name: token_blacklist token_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_pkey PRIMARY KEY (blacklist_id);


--
-- Name: trade_orders_cache trade_orders_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trade_orders_cache
    ADD CONSTRAINT trade_orders_cache_pkey PRIMARY KEY (order_id);


--
-- Name: transaction_logs transaction_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT transaction_logs_pkey PRIMARY KEY (log_id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (wallet_address);


--
-- Name: idx_device_commands_meter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_commands_meter ON public.device_commands USING btree (meter_id);


--
-- Name: idx_device_commands_sent_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_commands_sent_at ON public.device_commands USING btree (sent_at DESC);


--
-- Name: idx_device_commands_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_commands_status ON public.device_commands USING btree (status);


--
-- Name: idx_device_commands_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_commands_type ON public.device_commands USING btree (command_type);


--
-- Name: idx_device_status_grid_mode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_status_grid_mode ON public.device_status_snapshots USING btree (grid_mode);


--
-- Name: idx_device_status_meter_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_status_meter_timestamp ON public.device_status_snapshots USING btree (meter_id, "timestamp" DESC);


--
-- Name: idx_energy_detailed_meter_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_detailed_meter_time ON public.energy_readings_detailed USING btree (meter_id, "timestamp" DESC);


--
-- Name: idx_energy_detailed_subsystem; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_detailed_subsystem ON public.energy_readings_detailed USING btree (subsystem);


--
-- Name: idx_energy_detailed_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_detailed_timestamp ON public.energy_readings_detailed USING btree ("timestamp" DESC);


--
-- Name: idx_energy_settlements_meter_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_settlements_meter_id ON public.energy_settlements USING btree (meter_id);


--
-- Name: idx_energy_settlements_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_settlements_period ON public.energy_settlements USING btree (period_start_time, period_end_time);


--
-- Name: idx_energy_settlements_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_energy_settlements_status ON public.energy_settlements USING btree (status);


--
-- Name: idx_idrs_conversions_prosumer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_idrs_conversions_prosumer ON public.idrs_conversions USING btree (prosumer_id);


--
-- Name: idx_idrs_conversions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_idrs_conversions_status ON public.idrs_conversions USING btree (status);


--
-- Name: idx_idrs_conversions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_idrs_conversions_type ON public.idrs_conversions USING btree (conversion_type);


--
-- Name: idx_market_trades_buyer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_market_trades_buyer ON public.market_trades USING btree (buyer_prosumer_id);


--
-- Name: idx_market_trades_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_market_trades_seller ON public.market_trades USING btree (seller_prosumer_id);


--
-- Name: idx_market_trades_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_market_trades_timestamp ON public.market_trades USING btree (trade_timestamp DESC);


--
-- Name: idx_mqtt_logs_correlation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mqtt_logs_correlation ON public.mqtt_message_logs USING btree (correlation_id);


--
-- Name: idx_mqtt_logs_direction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mqtt_logs_direction ON public.mqtt_message_logs USING btree (direction);


--
-- Name: idx_mqtt_logs_meter_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mqtt_logs_meter_id ON public.mqtt_message_logs USING btree (meter_id);


--
-- Name: idx_mqtt_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mqtt_logs_timestamp ON public.mqtt_message_logs USING btree (message_timestamp DESC);


--
-- Name: idx_mqtt_logs_topic_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mqtt_logs_topic_type ON public.mqtt_message_logs USING btree (topic_type);


--
-- Name: idx_smart_meters_prosumer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_smart_meters_prosumer_id ON public.smart_meters USING btree (prosumer_id);


--
-- Name: idx_token_blacklist_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_active ON public.token_blacklist USING btree (is_active);


--
-- Name: idx_token_blacklist_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_created ON public.token_blacklist USING btree (created_at DESC);


--
-- Name: idx_token_blacklist_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_expires ON public.token_blacklist USING btree (expires_at);


--
-- Name: idx_token_blacklist_prosumer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_prosumer ON public.token_blacklist USING btree (prosumer_id);


--
-- Name: idx_token_blacklist_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_token_hash ON public.token_blacklist USING btree (token_hash);


--
-- Name: idx_token_blacklist_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_token_blacklist_type ON public.token_blacklist USING btree (blacklist_type);


--
-- Name: idx_token_blacklist_unique_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_token_blacklist_unique_token ON public.token_blacklist USING btree (token_hash) WHERE ((blacklist_type = 'TOKEN'::public.blacklist_type_enum) AND (is_active = true));


--
-- Name: idx_token_blacklist_unique_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_token_blacklist_unique_user ON public.token_blacklist USING btree (prosumer_id) WHERE ((blacklist_type = 'USER'::public.blacklist_type_enum) AND (is_active = true));


--
-- Name: idx_trade_orders_pair_type_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trade_orders_pair_type_price ON public.trade_orders_cache USING btree (pair, order_type, price_idrs_per_etk);


--
-- Name: idx_trade_orders_prosumer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trade_orders_prosumer_id ON public.trade_orders_cache USING btree (prosumer_id);


--
-- Name: idx_trade_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trade_orders_status ON public.trade_orders_cache USING btree (status_on_chain);


--
-- Name: idx_trade_orders_wallet_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trade_orders_wallet_address ON public.trade_orders_cache USING btree (wallet_address);


--
-- Name: idx_transaction_logs_blockchain_tx_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_logs_blockchain_tx_hash ON public.transaction_logs USING btree (blockchain_tx_hash);


--
-- Name: idx_transaction_logs_prosumer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_logs_prosumer_id ON public.transaction_logs USING btree (prosumer_id);


--
-- Name: idx_transaction_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_logs_timestamp ON public.transaction_logs USING btree (transaction_timestamp DESC);


--
-- Name: idx_transaction_logs_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_logs_type ON public.transaction_logs USING btree (transaction_type);


--
-- Name: idx_wallets_prosumer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallets_prosumer_id ON public.wallets USING btree (prosumer_id);


--
-- Name: prosumers set_timestamp_prosumers; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp_prosumers BEFORE UPDATE ON public.prosumers FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: smart_meters set_timestamp_smart_meters; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp_smart_meters BEFORE UPDATE ON public.smart_meters FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: mqtt_message_logs trg_update_command_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_command_status AFTER INSERT ON public.mqtt_message_logs FOR EACH ROW EXECUTE FUNCTION public.update_command_status_from_mqtt();


--
-- Name: idrs_conversions trg_update_wallet_last_used_conversions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_wallet_last_used_conversions AFTER INSERT ON public.idrs_conversions FOR EACH ROW EXECUTE FUNCTION public.update_wallet_last_used_from_orders();


--
-- Name: trade_orders_cache trg_update_wallet_last_used_orders; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_wallet_last_used_orders AFTER INSERT ON public.trade_orders_cache FOR EACH ROW EXECUTE FUNCTION public.update_wallet_last_used_from_orders();


--
-- Name: market_trades trg_update_wallet_last_used_trades; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_wallet_last_used_trades AFTER INSERT ON public.market_trades FOR EACH ROW EXECUTE FUNCTION public.update_wallet_last_used_from_trades();


--
-- Name: token_blacklist fk_blacklist_prosumer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT fk_blacklist_prosumer FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE CASCADE;


--
-- Name: market_trades fk_buyer_prosumer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT fk_buyer_prosumer FOREIGN KEY (buyer_prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE RESTRICT;


--
-- Name: market_trades fk_buyer_wallet; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT fk_buyer_wallet FOREIGN KEY (buyer_wallet_address) REFERENCES public.wallets(wallet_address) ON DELETE RESTRICT;


--
-- Name: device_commands fk_command_meter; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT fk_command_meter FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE CASCADE;


--
-- Name: device_commands fk_command_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_commands
    ADD CONSTRAINT fk_command_user FOREIGN KEY (sent_by_user) REFERENCES public.prosumers(prosumer_id) ON DELETE SET NULL;


--
-- Name: energy_readings_detailed fk_detailed_reading_meter; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_readings_detailed
    ADD CONSTRAINT fk_detailed_reading_meter FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE CASCADE;


--
-- Name: energy_settlements fk_meter_settlement; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT fk_meter_settlement FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE RESTRICT;


--
-- Name: mqtt_message_logs fk_mqtt_meter; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mqtt_message_logs
    ADD CONSTRAINT fk_mqtt_meter FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE CASCADE;


--
-- Name: transaction_logs fk_order_log; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT fk_order_log FOREIGN KEY (related_order_id) REFERENCES public.trade_orders_cache(order_id) ON DELETE SET NULL;


--
-- Name: wallets fk_prosumer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT fk_prosumer FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE CASCADE;


--
-- Name: idrs_conversions fk_prosumer_conversion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idrs_conversions
    ADD CONSTRAINT fk_prosumer_conversion FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE CASCADE;


--
-- Name: transaction_logs fk_prosumer_log; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT fk_prosumer_log FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE CASCADE;


--
-- Name: smart_meters fk_prosumer_meter; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smart_meters
    ADD CONSTRAINT fk_prosumer_meter FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE RESTRICT;


--
-- Name: trade_orders_cache fk_prosumer_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trade_orders_cache
    ADD CONSTRAINT fk_prosumer_order FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE CASCADE;


--
-- Name: market_trades fk_seller_prosumer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT fk_seller_prosumer FOREIGN KEY (seller_prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE RESTRICT;


--
-- Name: market_trades fk_seller_wallet; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT fk_seller_wallet FOREIGN KEY (seller_wallet_address) REFERENCES public.wallets(wallet_address) ON DELETE RESTRICT;


--
-- Name: transaction_logs fk_settlement_log; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT fk_settlement_log FOREIGN KEY (related_settlement_id) REFERENCES public.energy_settlements(settlement_id) ON DELETE SET NULL;


--
-- Name: energy_settlements fk_settlement_mqtt; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT fk_settlement_mqtt FOREIGN KEY (mqtt_message_id) REFERENCES public.mqtt_message_logs(log_id) ON DELETE SET NULL;


--
-- Name: device_status_snapshots fk_status_meter; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_status_snapshots
    ADD CONSTRAINT fk_status_meter FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id) ON DELETE CASCADE;


--
-- Name: idrs_conversions fk_wallet_conversion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idrs_conversions
    ADD CONSTRAINT fk_wallet_conversion FOREIGN KEY (wallet_address) REFERENCES public.wallets(wallet_address) ON DELETE CASCADE;


--
-- Name: trade_orders_cache fk_wallet_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trade_orders_cache
    ADD CONSTRAINT fk_wallet_order FOREIGN KEY (wallet_address) REFERENCES public.wallets(wallet_address) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 5HptZosBe0Ukfp2w8LY16AjvY3Vtw6tAXkJ4NX2VVIdAS2jg8f7cRyXXxmrOUXR

