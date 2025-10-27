--
-- PostgreSQL database dump
--

\restrict TCIo9Uo8S5v1CgYZeTvV6TO9Wl2tbuCu6j2UbkACf1jcQkAWcRejxxuqGo8i4fu

-- Dumped from database version 17.6
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
-- Name: timescaledb; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS timescaledb WITH SCHEMA public;


--
-- Name: EXTENSION timescaledb; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION timescaledb IS 'Enables scalable inserts and complex queries for time-series data (Community Edition)';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


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
-- Name: token_blacklist_blacklist_type_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.token_blacklist_blacklist_type_enum AS ENUM (
    'TOKEN',
    'USER'
);


ALTER TYPE public.token_blacklist_blacklist_type_enum OWNER TO enerlink_user;

--
-- Name: token_blacklist_reason_enum; Type: TYPE; Schema: public; Owner: enerlink_user
--

CREATE TYPE public.token_blacklist_reason_enum AS ENUM (
    'LOGOUT',
    'LOGOUT_ALL_DEVICES',
    'SECURITY_BREACH',
    'ADMIN_ACTION',
    'EXPIRED'
);


ALTER TYPE public.token_blacklist_reason_enum OWNER TO enerlink_user;

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
-- Name: _compressed_hypertable_2; Type: TABLE; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_2 (
);


ALTER TABLE _timescaledb_internal._compressed_hypertable_2 OWNER TO enerlink_user;

--
-- Name: telemetry_aggregates; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.telemetry_aggregates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "meterId" character varying(50) NOT NULL,
    "hourStart" timestamp with time zone NOT NULL,
    "dataPointsCount" integer DEFAULT 0 NOT NULL,
    "batteryVoltageAvg" numeric(10,5),
    "batteryVoltageMin" numeric(10,5),
    "batteryVoltageMax" numeric(10,5),
    "batterySocAvg" numeric(10,5),
    "batterySocMin" numeric(10,5),
    "batterySocMax" numeric(10,5),
    "batteryChargeRateAvg" numeric(10,5),
    "exportPowerAvg" numeric(15,5),
    "exportPowerMax" numeric(15,5),
    "exportEnergyTotal" numeric(15,5),
    "importPowerAvg" numeric(15,5),
    "importPowerMax" numeric(15,5),
    "importEnergyTotal" numeric(15,5),
    "loadSmartPowerAvg" numeric(15,5),
    "loadSmartPowerMax" numeric(15,5),
    "loadSmartEnergyTotal" numeric(15,5),
    "loadHomePowerAvg" numeric(15,5),
    "loadHomePowerMax" numeric(15,5),
    "loadHomeEnergyTotal" numeric(15,5),
    "solarInputPowerAvg" numeric(15,5),
    "solarInputPowerMax" numeric(15,5),
    "solarInputEnergyTotal" numeric(15,5),
    "solarOutputPowerAvg" numeric(15,5),
    "solarOutputPowerMax" numeric(15,5),
    "solarOutputEnergyTotal" numeric(15,5),
    "netSolarPowerAvg" numeric(15,5),
    "netSolarEnergyTotal" numeric(15,5),
    "netGridPowerAvg" numeric(15,5),
    "netGridEnergyTotal" numeric(15,5),
    "wifiRssiAvg" integer,
    "mqttDisconnections" integer,
    "freeHeapAvg" bigint,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.telemetry_aggregates OWNER TO enerlink_user;

--
-- Name: _direct_view_3; Type: VIEW; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE VIEW _timescaledb_internal._direct_view_3 AS
 SELECT "meterId",
    public.time_bucket('1 day'::interval, "hourStart") AS day_start,
    avg("batteryVoltageAvg") AS battery_voltage_avg,
    avg("batterySocAvg") AS battery_soc_avg,
    sum("exportEnergyTotal") AS export_energy_total,
    sum("importEnergyTotal") AS import_energy_total,
    sum("loadSmartEnergyTotal") AS load_smart_energy_total,
    sum("loadHomeEnergyTotal") AS load_home_energy_total,
    sum("solarInputEnergyTotal") AS solar_input_energy_total,
    sum("solarOutputEnergyTotal") AS solar_output_energy_total,
    sum("netSolarEnergyTotal") AS net_solar_energy_total,
    sum("netGridEnergyTotal") AS net_grid_energy_total,
    avg("wifiRssiAvg") AS wifi_rssi_avg,
    sum("mqttDisconnections") AS mqtt_disconnections,
    count(*) AS data_points
   FROM public.telemetry_aggregates
  GROUP BY "meterId", (public.time_bucket('1 day'::interval, "hourStart"));


ALTER VIEW _timescaledb_internal._direct_view_3 OWNER TO enerlink_user;

--
-- Name: _hyper_1_1_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE TABLE _timescaledb_internal._hyper_1_1_chunk (
    CONSTRAINT constraint_1 CHECK ((("hourStart" >= '2025-10-23 00:00:00+00'::timestamp with time zone) AND ("hourStart" < '2025-10-30 00:00:00+00'::timestamp with time zone)))
)
INHERITS (public.telemetry_aggregates);


ALTER TABLE _timescaledb_internal._hyper_1_1_chunk OWNER TO enerlink_user;

--
-- Name: _materialized_hypertable_3; Type: TABLE; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_3 (
    "meterId" character varying(50),
    day_start timestamp with time zone NOT NULL,
    battery_voltage_avg numeric,
    battery_soc_avg numeric,
    export_energy_total numeric,
    import_energy_total numeric,
    load_smart_energy_total numeric,
    load_home_energy_total numeric,
    solar_input_energy_total numeric,
    solar_output_energy_total numeric,
    net_solar_energy_total numeric,
    net_grid_energy_total numeric,
    wifi_rssi_avg numeric,
    mqtt_disconnections bigint,
    data_points bigint
);


ALTER TABLE _timescaledb_internal._materialized_hypertable_3 OWNER TO enerlink_user;

--
-- Name: _hyper_3_2_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE TABLE _timescaledb_internal._hyper_3_2_chunk (
    CONSTRAINT constraint_2 CHECK (((day_start >= '2025-10-09 00:00:00+00'::timestamp with time zone) AND (day_start < '2025-12-18 00:00:00+00'::timestamp with time zone)))
)
INHERITS (_timescaledb_internal._materialized_hypertable_3);


ALTER TABLE _timescaledb_internal._hyper_3_2_chunk OWNER TO enerlink_user;

--
-- Name: _partial_view_3; Type: VIEW; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE VIEW _timescaledb_internal._partial_view_3 AS
 SELECT "meterId",
    public.time_bucket('1 day'::interval, "hourStart") AS day_start,
    avg("batteryVoltageAvg") AS battery_voltage_avg,
    avg("batterySocAvg") AS battery_soc_avg,
    sum("exportEnergyTotal") AS export_energy_total,
    sum("importEnergyTotal") AS import_energy_total,
    sum("loadSmartEnergyTotal") AS load_smart_energy_total,
    sum("loadHomeEnergyTotal") AS load_home_energy_total,
    sum("solarInputEnergyTotal") AS solar_input_energy_total,
    sum("solarOutputEnergyTotal") AS solar_output_energy_total,
    sum("netSolarEnergyTotal") AS net_solar_energy_total,
    sum("netGridEnergyTotal") AS net_grid_energy_total,
    avg("wifiRssiAvg") AS wifi_rssi_avg,
    sum("mqttDisconnections") AS mqtt_disconnections,
    count(*) AS data_points
   FROM public.telemetry_aggregates
  GROUP BY "meterId", (public.time_bucket('1 day'::interval, "hourStart"));


ALTER VIEW _timescaledb_internal._partial_view_3 OWNER TO enerlink_user;

--
-- Name: energy_settlements; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.energy_settlements (
    net_kwh_from_grid numeric NOT NULL,
    etk_amount_credited numeric,
    raw_export_kwh numeric,
    raw_import_kwh numeric,
    settlement_id integer NOT NULL,
    meter_id character varying NOT NULL,
    period_start_time timestamp without time zone NOT NULL,
    period_end_time timestamp without time zone NOT NULL,
    blockchain_tx_hash character varying,
    status character varying NOT NULL,
    created_at_backend timestamp without time zone NOT NULL,
    confirmed_at_on_chain timestamp without time zone,
    settlement_trigger character varying NOT NULL,
    validation_status character varying,
    settlement_data_source character varying,
    detailed_energy_breakdown character varying,
    mqtt_message_id character varying
);


ALTER TABLE public.energy_settlements OWNER TO enerlink_user;

--
-- Name: energy_settlements_settlement_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.energy_settlements_settlement_id_seq
    AS integer
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
    idr_amount numeric,
    idrs_amount numeric NOT NULL,
    exchange_rate numeric,
    conversion_id integer NOT NULL,
    prosumer_id character varying NOT NULL,
    wallet_address character varying NOT NULL,
    conversion_type character varying NOT NULL,
    blockchain_tx_hash character varying,
    status character varying NOT NULL,
    simulation_note character varying,
    created_at timestamp without time zone NOT NULL,
    confirmed_at timestamp without time zone
);


ALTER TABLE public.idrs_conversions OWNER TO enerlink_user;

--
-- Name: idrs_conversions_conversion_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.idrs_conversions_conversion_id_seq
    AS integer
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
    traded_etk_amount numeric NOT NULL,
    price_idrs_per_etk numeric NOT NULL,
    total_idrs_value numeric NOT NULL,
    gas_fee_wei numeric,
    trade_id integer NOT NULL,
    buyer_order_id character varying NOT NULL,
    seller_order_id character varying NOT NULL,
    buyer_prosumer_id character varying NOT NULL,
    seller_prosumer_id character varying NOT NULL,
    buyer_wallet_address character varying NOT NULL,
    seller_wallet_address character varying NOT NULL,
    blockchain_tx_hash character varying,
    trade_timestamp timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.market_trades OWNER TO enerlink_user;

--
-- Name: market_trades_trade_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.market_trades_trade_id_seq
    AS integer
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
-- Name: migrations; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO enerlink_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO enerlink_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: prosumers; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.prosumers (
    prosumer_id character varying NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    name character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    primary_wallet_address character varying
);


ALTER TABLE public.prosumers OWNER TO enerlink_user;

--
-- Name: smart_meters; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.smart_meters (
    settlement_interval_minutes integer,
    meter_id character varying NOT NULL,
    prosumer_id character varying NOT NULL,
    meter_blockchain_address character varying,
    location character varying,
    status character varying,
    created_at timestamp without time zone NOT NULL,
    last_seen timestamp without time zone,
    updated_at timestamp without time zone NOT NULL,
    mqtt_topic_realtime character varying,
    mqtt_topic_settlement character varying,
    firmware_version character varying,
    last_settlement_at timestamp without time zone,
    device_configuration character varying,
    last_heartbeat_at timestamp without time zone,
    device_model character varying,
    device_version character varying,
    capabilities character varying
);


ALTER TABLE public.smart_meters OWNER TO enerlink_user;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.system_config (
    config_key character varying NOT NULL,
    config_value character varying NOT NULL,
    description character varying,
    updated_at timestamp without time zone NOT NULL,
    updated_by character varying
);


ALTER TABLE public.system_config OWNER TO enerlink_user;

--
-- Name: telemetry_daily_summary; Type: VIEW; Schema: public; Owner: enerlink_user
--

CREATE VIEW public.telemetry_daily_summary AS
 SELECT "meterId",
    day_start,
    battery_voltage_avg,
    battery_soc_avg,
    export_energy_total,
    import_energy_total,
    load_smart_energy_total,
    load_home_energy_total,
    solar_input_energy_total,
    solar_output_energy_total,
    net_solar_energy_total,
    net_grid_energy_total,
    wifi_rssi_avg,
    mqtt_disconnections,
    data_points
   FROM _timescaledb_internal._materialized_hypertable_3;


ALTER VIEW public.telemetry_daily_summary OWNER TO enerlink_user;

--
-- Name: telemetry_data; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.telemetry_data (
    id integer NOT NULL,
    "meterId" character varying NOT NULL,
    datetime timestamp without time zone NOT NULL,
    data jsonb NOT NULL
);


ALTER TABLE public.telemetry_data OWNER TO enerlink_user;

--
-- Name: telemetry_data_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.telemetry_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.telemetry_data_id_seq OWNER TO enerlink_user;

--
-- Name: telemetry_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: enerlink_user
--

ALTER SEQUENCE public.telemetry_data_id_seq OWNED BY public.telemetry_data.id;


--
-- Name: token_blacklist; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.token_blacklist (
    blacklist_type public.token_blacklist_blacklist_type_enum NOT NULL,
    prosumer_id character varying(255) NOT NULL,
    token_hash character varying(255),
    reason public.token_blacklist_reason_enum DEFAULT 'LOGOUT'::public.token_blacklist_reason_enum NOT NULL,
    ip_address inet,
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying(255),
    notes text,
    blacklist_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.token_blacklist OWNER TO enerlink_user;

--
-- Name: token_blacklist_blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.token_blacklist_blacklist_id_seq
    AS integer
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
    amount_etk numeric NOT NULL,
    price_idrs_per_etk numeric NOT NULL,
    total_idrs_value numeric,
    order_id character varying NOT NULL,
    prosumer_id character varying NOT NULL,
    wallet_address character varying NOT NULL,
    order_type character varying NOT NULL,
    pair character varying NOT NULL,
    status_on_chain character varying NOT NULL,
    created_at_on_chain timestamp without time zone NOT NULL,
    updated_at_cache timestamp without time zone NOT NULL,
    blockchain_tx_hash_placed character varying,
    blockchain_tx_hash_filled character varying,
    blockchain_tx_hash_cancelled character varying
);


ALTER TABLE public.trade_orders_cache OWNER TO enerlink_user;

--
-- Name: transaction_logs; Type: TABLE; Schema: public; Owner: enerlink_user
--

CREATE TABLE public.transaction_logs (
    amount_primary numeric NOT NULL,
    amount_secondary numeric,
    log_id integer NOT NULL,
    prosumer_id character varying NOT NULL,
    related_order_id character varying,
    related_settlement_id integer,
    transaction_type character varying NOT NULL,
    description character varying,
    currency_primary character varying NOT NULL,
    currency_secondary character varying,
    blockchain_tx_hash character varying,
    transaction_timestamp timestamp without time zone NOT NULL
);


ALTER TABLE public.transaction_logs OWNER TO enerlink_user;

--
-- Name: transaction_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: enerlink_user
--

CREATE SEQUENCE public.transaction_logs_log_id_seq
    AS integer
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
    is_active boolean NOT NULL,
    wallet_address character varying NOT NULL,
    prosumer_id character varying NOT NULL,
    wallet_name character varying,
    encrypted_private_key character varying,
    created_at timestamp without time zone NOT NULL,
    import_method character varying NOT NULL,
    last_used_at timestamp without time zone
);


ALTER TABLE public.wallets OWNER TO enerlink_user;

--
-- Name: _hyper_1_1_chunk id; Type: DEFAULT; Schema: _timescaledb_internal; Owner: enerlink_user
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk ALTER COLUMN id SET DEFAULT public.uuid_generate_v4();


--
-- Name: _hyper_1_1_chunk dataPointsCount; Type: DEFAULT; Schema: _timescaledb_internal; Owner: enerlink_user
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk ALTER COLUMN "dataPointsCount" SET DEFAULT 0;


--
-- Name: _hyper_1_1_chunk createdAt; Type: DEFAULT; Schema: _timescaledb_internal; Owner: enerlink_user
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk ALTER COLUMN "createdAt" SET DEFAULT now();


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
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: telemetry_data id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.telemetry_data ALTER COLUMN id SET DEFAULT nextval('public.telemetry_data_id_seq'::regclass);


--
-- Name: token_blacklist blacklist_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.token_blacklist ALTER COLUMN blacklist_id SET DEFAULT nextval('public.token_blacklist_blacklist_id_seq'::regclass);


--
-- Name: transaction_logs log_id; Type: DEFAULT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.transaction_logs ALTER COLUMN log_id SET DEFAULT nextval('public.transaction_logs_log_id_seq'::regclass);


--
-- Name: _hyper_1_1_chunk 1_2_PK_telemetry_aggregates; Type: CONSTRAINT; Schema: _timescaledb_internal; Owner: enerlink_user
--

ALTER TABLE ONLY _timescaledb_internal._hyper_1_1_chunk
    ADD CONSTRAINT "1_2_PK_telemetry_aggregates" PRIMARY KEY (id, "hourStart");


--
-- Name: token_blacklist PK_17b3902baa94df28557059b0ac8; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT "PK_17b3902baa94df28557059b0ac8" PRIMARY KEY (blacklist_id);


--
-- Name: prosumers PK_3ae412f5b4dcb9072bc6fe6815d; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.prosumers
    ADD CONSTRAINT "PK_3ae412f5b4dcb9072bc6fe6815d" PRIMARY KEY (prosumer_id);


--
-- Name: telemetry_data PK_5869a8f8f281ae50220a1ffdb51; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.telemetry_data
    ADD CONSTRAINT "PK_5869a8f8f281ae50220a1ffdb51" PRIMARY KEY (id);


--
-- Name: market_trades PK_5efaa55324c2b39ad84f6e02be4; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT "PK_5efaa55324c2b39ad84f6e02be4" PRIMARY KEY (trade_id);


--
-- Name: transaction_logs PK_77d7e09163aa1e895fc3c89546b; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT "PK_77d7e09163aa1e895fc3c89546b" PRIMARY KEY (log_id);


--
-- Name: energy_settlements PK_8b9a77f8528eecedcca0002af19; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT "PK_8b9a77f8528eecedcca0002af19" PRIMARY KEY (settlement_id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: smart_meters PK_8ffed222126a4abb782dbbb98af; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.smart_meters
    ADD CONSTRAINT "PK_8ffed222126a4abb782dbbb98af" PRIMARY KEY (meter_id);


--
-- Name: idrs_conversions PK_a606473dc71f7112a70df2592f5; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.idrs_conversions
    ADD CONSTRAINT "PK_a606473dc71f7112a70df2592f5" PRIMARY KEY (conversion_id);


--
-- Name: wallets PK_bca8b30f6524979bf57a2b2c1be; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "PK_bca8b30f6524979bf57a2b2c1be" PRIMARY KEY (wallet_address);


--
-- Name: system_config PK_c54d4e3d5a246ef29601e48d751; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT "PK_c54d4e3d5a246ef29601e48d751" PRIMARY KEY (config_key);


--
-- Name: trade_orders_cache PK_e6377a342a2a931eb4fb13e6df3; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.trade_orders_cache
    ADD CONSTRAINT "PK_e6377a342a2a931eb4fb13e6df3" PRIMARY KEY (order_id);


--
-- Name: telemetry_aggregates PK_telemetry_aggregates; Type: CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.telemetry_aggregates
    ADD CONSTRAINT "PK_telemetry_aggregates" PRIMARY KEY (id, "hourStart");


--
-- Name: _hyper_1_1_chunk_IDX_6f42afcdb47cb7077f4074198d; Type: INDEX; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE INDEX "_hyper_1_1_chunk_IDX_6f42afcdb47cb7077f4074198d" ON _timescaledb_internal._hyper_1_1_chunk USING btree ("meterId", "hourStart");


--
-- Name: _hyper_1_1_chunk_IDX_f10a714a7c920cc61aab041d99; Type: INDEX; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE INDEX "_hyper_1_1_chunk_IDX_f10a714a7c920cc61aab041d99" ON _timescaledb_internal._hyper_1_1_chunk USING btree ("hourStart");


--
-- Name: _hyper_3_2_chunk__materialized_hypertable_3_day_start_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE INDEX _hyper_3_2_chunk__materialized_hypertable_3_day_start_idx ON _timescaledb_internal._hyper_3_2_chunk USING btree (day_start DESC);


--
-- Name: _hyper_3_2_chunk__materialized_hypertable_3_meterId_day_start_i; Type: INDEX; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE INDEX "_hyper_3_2_chunk__materialized_hypertable_3_meterId_day_start_i" ON _timescaledb_internal._hyper_3_2_chunk USING btree ("meterId", day_start DESC);


--
-- Name: _materialized_hypertable_3_day_start_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE INDEX _materialized_hypertable_3_day_start_idx ON _timescaledb_internal._materialized_hypertable_3 USING btree (day_start DESC);


--
-- Name: _materialized_hypertable_3_meterId_day_start_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE INDEX "_materialized_hypertable_3_meterId_day_start_idx" ON _timescaledb_internal._materialized_hypertable_3 USING btree ("meterId", day_start DESC);


--
-- Name: IDX_1a320f4470d1b5517ee5553b66; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX "IDX_1a320f4470d1b5517ee5553b66" ON public.token_blacklist USING btree (prosumer_id);


--
-- Name: IDX_6f42afcdb47cb7077f4074198d; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX "IDX_6f42afcdb47cb7077f4074198d" ON public.telemetry_aggregates USING btree ("meterId", "hourStart");


--
-- Name: IDX_b9a3b934060f946221d5396244; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX "IDX_b9a3b934060f946221d5396244" ON public.token_blacklist USING btree (blacklist_type);


--
-- Name: IDX_d8e7e938c9158e8f395442a031; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX "IDX_d8e7e938c9158e8f395442a031" ON public.token_blacklist USING btree (is_active);


--
-- Name: IDX_f10a714a7c920cc61aab041d99; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX "IDX_f10a714a7c920cc61aab041d99" ON public.telemetry_aggregates USING btree ("hourStart");


--
-- Name: IDX_f843323a807f2db43c4d8ba888; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX "IDX_f843323a807f2db43c4d8ba888" ON public.token_blacklist USING btree (expires_at);


--
-- Name: IDX_fc93690d4ba3c359bfaaa99a7a; Type: INDEX; Schema: public; Owner: enerlink_user
--

CREATE INDEX "IDX_fc93690d4ba3c359bfaaa99a7a" ON public.token_blacklist USING btree (token_hash);


--
-- Name: _hyper_1_1_chunk ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON _timescaledb_internal._hyper_1_1_chunk FOR EACH ROW EXECUTE FUNCTION _timescaledb_functions.continuous_agg_invalidation_trigger('1');


--
-- Name: _compressed_hypertable_2 ts_insert_blocker; Type: TRIGGER; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE TRIGGER ts_insert_blocker BEFORE INSERT ON _timescaledb_internal._compressed_hypertable_2 FOR EACH ROW EXECUTE FUNCTION _timescaledb_functions.insert_blocker();


--
-- Name: _materialized_hypertable_3 ts_insert_blocker; Type: TRIGGER; Schema: _timescaledb_internal; Owner: enerlink_user
--

CREATE TRIGGER ts_insert_blocker BEFORE INSERT ON _timescaledb_internal._materialized_hypertable_3 FOR EACH ROW EXECUTE FUNCTION _timescaledb_functions.insert_blocker();


--
-- Name: prosumers set_timestamp_prosumers; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER set_timestamp_prosumers BEFORE UPDATE ON public.prosumers FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: smart_meters set_timestamp_smart_meters; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER set_timestamp_smart_meters BEFORE UPDATE ON public.smart_meters FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


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
-- Name: telemetry_aggregates ts_cagg_invalidation_trigger; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER ts_cagg_invalidation_trigger AFTER INSERT OR DELETE OR UPDATE ON public.telemetry_aggregates FOR EACH ROW EXECUTE FUNCTION _timescaledb_functions.continuous_agg_invalidation_trigger('1');


--
-- Name: telemetry_aggregates ts_insert_blocker; Type: TRIGGER; Schema: public; Owner: enerlink_user
--

CREATE TRIGGER ts_insert_blocker BEFORE INSERT ON public.telemetry_aggregates FOR EACH ROW EXECUTE FUNCTION _timescaledb_functions.insert_blocker();


--
-- Name: transaction_logs FK_00ac8f05bd69b569cf6357ddec3; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT "FK_00ac8f05bd69b569cf6357ddec3" FOREIGN KEY (related_order_id) REFERENCES public.trade_orders_cache(order_id);


--
-- Name: market_trades FK_028c93bfb292f998635a701742d; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT "FK_028c93bfb292f998635a701742d" FOREIGN KEY (seller_prosumer_id) REFERENCES public.prosumers(prosumer_id);


--
-- Name: idrs_conversions FK_0f0a685f411f15927376b85460d; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.idrs_conversions
    ADD CONSTRAINT "FK_0f0a685f411f15927376b85460d" FOREIGN KEY (wallet_address) REFERENCES public.wallets(wallet_address);


--
-- Name: transaction_logs FK_1421bcc06059512215276a952f1; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT "FK_1421bcc06059512215276a952f1" FOREIGN KEY (related_settlement_id) REFERENCES public.energy_settlements(settlement_id);


--
-- Name: smart_meters FK_15c4c55f7a7ac1a93ae9a06a6c4; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.smart_meters
    ADD CONSTRAINT "FK_15c4c55f7a7ac1a93ae9a06a6c4" FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id);


--
-- Name: token_blacklist FK_1a320f4470d1b5517ee5553b66b; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT "FK_1a320f4470d1b5517ee5553b66b" FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id) ON DELETE CASCADE;


--
-- Name: market_trades FK_4a8e26f96115599aeb05e2fac3e; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT "FK_4a8e26f96115599aeb05e2fac3e" FOREIGN KEY (buyer_wallet_address) REFERENCES public.wallets(wallet_address);


--
-- Name: wallets FK_62a1a16628b883318e6b443cf52; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_62a1a16628b883318e6b443cf52" FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id);


--
-- Name: energy_settlements FK_8fb34800a672cd8396fba250d17; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.energy_settlements
    ADD CONSTRAINT "FK_8fb34800a672cd8396fba250d17" FOREIGN KEY (meter_id) REFERENCES public.smart_meters(meter_id);


--
-- Name: trade_orders_cache FK_be4aaa31fac21ce88fa8748ee8a; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.trade_orders_cache
    ADD CONSTRAINT "FK_be4aaa31fac21ce88fa8748ee8a" FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id);


--
-- Name: transaction_logs FK_c610529db3b0d2fa571fcb32c0c; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.transaction_logs
    ADD CONSTRAINT "FK_c610529db3b0d2fa571fcb32c0c" FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id);


--
-- Name: idrs_conversions FK_ca221ee5d35d43d27e8e2d0b799; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.idrs_conversions
    ADD CONSTRAINT "FK_ca221ee5d35d43d27e8e2d0b799" FOREIGN KEY (prosumer_id) REFERENCES public.prosumers(prosumer_id);


--
-- Name: trade_orders_cache FK_e150b68ec4f6da6452e4857820e; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.trade_orders_cache
    ADD CONSTRAINT "FK_e150b68ec4f6da6452e4857820e" FOREIGN KEY (wallet_address) REFERENCES public.wallets(wallet_address);


--
-- Name: market_trades FK_e5d6128781fecd5e123649fd47b; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT "FK_e5d6128781fecd5e123649fd47b" FOREIGN KEY (buyer_prosumer_id) REFERENCES public.prosumers(prosumer_id);


--
-- Name: market_trades FK_ffe7be81bfeb35561ac25cff6b0; Type: FK CONSTRAINT; Schema: public; Owner: enerlink_user
--

ALTER TABLE ONLY public.market_trades
    ADD CONSTRAINT "FK_ffe7be81bfeb35561ac25cff6b0" FOREIGN KEY (seller_wallet_address) REFERENCES public.wallets(wallet_address);


--
-- PostgreSQL database dump complete
--

\unrestrict TCIo9Uo8S5v1CgYZeTvV6TO9Wl2tbuCu6j2UbkACf1jcQkAWcRejxxuqGo8i4fu

