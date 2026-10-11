--
-- PostgreSQL database dump
--

\restrict Q6eUIlcXxmux8wBp2nUJ5rlKnlCqobkMO7JMfWqQhEj1CBf9ABFWneruEKUb7nj

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: bags_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.bags_status_enum AS ENUM (
    'OPEN',
    'SEALED',
    'IN_TRANSIT',
    'RECEIVED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public.bags_status_enum OWNER TO postgres;

--
-- Name: cash_discrepancies_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cash_discrepancies_status_enum AS ENUM (
    'OPEN',
    'RESOLVED'
);


ALTER TYPE public.cash_discrepancies_status_enum OWNER TO postgres;

--
-- Name: cash_discrepancies_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cash_discrepancies_type_enum AS ENUM (
    'SHORT',
    'OVER'
);


ALTER TYPE public.cash_discrepancies_type_enum OWNER TO postgres;

--
-- Name: cash_handins_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cash_handins_status_enum AS ENUM (
    'SUBMITTED',
    'VERIFIED',
    'DISCREPANCY',
    'RESOLVED'
);


ALTER TYPE public.cash_handins_status_enum OWNER TO postgres;

--
-- Name: cash_ledgers_hand_in_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cash_ledgers_hand_in_status_enum AS ENUM (
    'PENDING',
    'HANDED_IN',
    'VERIFIED',
    'DISCREPANCY'
);


ALTER TYPE public.cash_ledgers_hand_in_status_enum OWNER TO postgres;

--
-- Name: delivery_attempts_failure_reason_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.delivery_attempts_failure_reason_enum AS ENUM (
    'CUSTOMER_UNAVAILABLE',
    'CUSTOMER_REFUSED',
    'ADDRESS_INCORRECT',
    'PAYMENT_NOT_READY',
    'CUSTOMER_REQUESTED_RESCHEDULE',
    'DAMAGED_PACKAGE',
    'OTHER'
);


ALTER TYPE public.delivery_attempts_failure_reason_enum OWNER TO postgres;

--
-- Name: delivery_attempts_outcome_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.delivery_attempts_outcome_enum AS ENUM (
    'DELIVERED',
    'FAILED'
);


ALTER TYPE public.delivery_attempts_outcome_enum OWNER TO postgres;

--
-- Name: event_outbox_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_outbox_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'PUBLISHED',
    'FAILED'
);


ALTER TYPE public.event_outbox_status_enum OWNER TO postgres;

--
-- Name: financial_entries_account_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.financial_entries_account_enum AS ENUM (
    'PLATFORM_CASH',
    'RIDER_CASH_IN_HAND',
    'HUB_CASH',
    'COD_RECEIVABLE',
    'MERCHANT_AVAILABLE',
    'MERCHANT_PAYOUT_IN_TRANSIT',
    'FEE_REVENUE',
    'ADJUSTMENT'
);


ALTER TYPE public.financial_entries_account_enum OWNER TO postgres;

--
-- Name: financial_entries_direction_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.financial_entries_direction_enum AS ENUM (
    'DEBIT',
    'CREDIT'
);


ALTER TYPE public.financial_entries_direction_enum OWNER TO postgres;

--
-- Name: financial_transactions_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.financial_transactions_status_enum AS ENUM (
    'POSTED',
    'REVERSED'
);


ALTER TYPE public.financial_transactions_status_enum OWNER TO postgres;

--
-- Name: financial_transactions_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.financial_transactions_type_enum AS ENUM (
    'COD_COLLECTED',
    'CASH_HANDED_IN',
    'COD_SETTLEMENT',
    'PAYOUT_RESERVATION',
    'PAYOUT_COMPLETION',
    'PAYOUT_RELEASE',
    'ADJUSTMENT',
    'REVERSAL'
);


ALTER TYPE public.financial_transactions_type_enum OWNER TO postgres;

--
-- Name: hubs_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.hubs_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'MAINTENANCE'
);


ALTER TYPE public.hubs_status_enum OWNER TO postgres;

--
-- Name: hubs_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.hubs_type_enum AS ENUM (
    'ORIGIN',
    'DESTINATION',
    'SORTING',
    'REGIONAL',
    'CENTRAL'
);


ALTER TYPE public.hubs_type_enum OWNER TO postgres;

--
-- Name: integration_failures_kind_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.integration_failures_kind_enum AS ENUM (
    'WEBHOOK',
    'SMS',
    'EMAIL'
);


ALTER TYPE public.integration_failures_kind_enum OWNER TO postgres;

--
-- Name: integration_failures_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.integration_failures_status_enum AS ENUM (
    'OPEN',
    'REPLAYED',
    'RESOLVED'
);


ALTER TYPE public.integration_failures_status_enum OWNER TO postgres;

--
-- Name: manifests_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.manifests_status_enum AS ENUM (
    'CREATED',
    'DISPATCHED',
    'RECEIVED',
    'RECONCILED',
    'IN_TRANSIT',
    'CANCELLED'
);


ALTER TYPE public.manifests_status_enum OWNER TO postgres;

--
-- Name: merchants_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.merchants_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'PENDING_VERIFICATION'
);


ALTER TYPE public.merchants_status_enum OWNER TO postgres;

--
-- Name: notification_preferences_category_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_preferences_category_enum AS ENUM (
    'PARCEL_UPDATES',
    'FINANCIAL_UPDATES',
    'SECURITY_ALERTS'
);


ALTER TYPE public.notification_preferences_category_enum OWNER TO postgres;

--
-- Name: notification_preferences_channel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_preferences_channel_enum AS ENUM (
    'IN_APP',
    'SMS',
    'EMAIL'
);


ALTER TYPE public.notification_preferences_channel_enum OWNER TO postgres;

--
-- Name: notifications_channel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_channel_enum AS ENUM (
    'IN_APP',
    'SMS',
    'EMAIL'
);


ALTER TYPE public.notifications_channel_enum OWNER TO postgres;

--
-- Name: notifications_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_status_enum AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'READ'
);


ALTER TYPE public.notifications_status_enum OWNER TO postgres;

--
-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_type_enum AS ENUM (
    'PARCEL_STATUS_UPDATE',
    'DELIVERY_OTP',
    'CASH_COLLECTED',
    'PAYOUT_UPDATE',
    'SYSTEM'
);


ALTER TYPE public.notifications_type_enum OWNER TO postgres;

--
-- Name: operational_exceptions_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.operational_exceptions_status_enum AS ENUM (
    'OPEN',
    'RESOLVED',
    'DISMISSED'
);


ALTER TYPE public.operational_exceptions_status_enum OWNER TO postgres;

--
-- Name: operational_exceptions_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.operational_exceptions_type_enum AS ENUM (
    'MISSING_PARCEL',
    'MISSING_BAG',
    'UNEXPECTED_PARCEL',
    'UNEXPECTED_BAG',
    'WRONG_DESTINATION',
    'WRONG_HUB',
    'DUPLICATE_SCAN',
    'DAMAGED',
    'INVALID_STATE'
);


ALTER TYPE public.operational_exceptions_type_enum OWNER TO postgres;

--
-- Name: parcel_scans_outcome_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.parcel_scans_outcome_enum AS ENUM (
    'APPLIED',
    'DUPLICATE',
    'REJECTED'
);


ALTER TYPE public.parcel_scans_outcome_enum OWNER TO postgres;

--
-- Name: parcel_scans_scan_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.parcel_scans_scan_type_enum AS ENUM (
    'RECEIVE_INBOUND',
    'BAG_PARCEL',
    'DISPATCH_BAG',
    'RECEIVE_TRANSFER',
    'SORT',
    'EXCEPTION'
);


ALTER TYPE public.parcel_scans_scan_type_enum OWNER TO postgres;

--
-- Name: parcel_status_histories_from_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.parcel_status_histories_from_status_enum AS ENUM (
    'CREATED',
    'PICKUP_REQUESTED',
    'PICKUP_ASSIGNED',
    'PICKED_UP',
    'ORIGIN_HUB_RECEIVED',
    'BAGGED',
    'IN_TRANSIT',
    'DESTINATION_HUB_RECEIVED',
    'ASSIGNED_TO_RIDER',
    'OUT_FOR_DELIVERY',
    'DELIVERY_ATTEMPTED',
    'RESCHEDULED',
    'DELIVERED',
    'CASH_PENDING',
    'CASH_VERIFIED',
    'RTO_INITIATED',
    'RETURN_IN_TRANSIT',
    'RETURNED_TO_MERCHANT',
    'CANCELLED',
    'LOST',
    'DAMAGED'
);


ALTER TYPE public.parcel_status_histories_from_status_enum OWNER TO postgres;

--
-- Name: parcel_status_histories_to_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.parcel_status_histories_to_status_enum AS ENUM (
    'CREATED',
    'PICKUP_REQUESTED',
    'PICKUP_ASSIGNED',
    'PICKED_UP',
    'ORIGIN_HUB_RECEIVED',
    'BAGGED',
    'IN_TRANSIT',
    'DESTINATION_HUB_RECEIVED',
    'ASSIGNED_TO_RIDER',
    'OUT_FOR_DELIVERY',
    'DELIVERY_ATTEMPTED',
    'RESCHEDULED',
    'DELIVERED',
    'CASH_PENDING',
    'CASH_VERIFIED',
    'RTO_INITIATED',
    'RETURN_IN_TRANSIT',
    'RETURNED_TO_MERCHANT',
    'CANCELLED',
    'LOST',
    'DAMAGED'
);


ALTER TYPE public.parcel_status_histories_to_status_enum OWNER TO postgres;

--
-- Name: parcels_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.parcels_status_enum AS ENUM (
    'CREATED',
    'PICKUP_REQUESTED',
    'PICKUP_ASSIGNED',
    'PICKED_UP',
    'ORIGIN_HUB_RECEIVED',
    'BAGGED',
    'IN_TRANSIT',
    'DESTINATION_HUB_RECEIVED',
    'ASSIGNED_TO_RIDER',
    'OUT_FOR_DELIVERY',
    'DELIVERY_ATTEMPTED',
    'RESCHEDULED',
    'DELIVERED',
    'CASH_PENDING',
    'CASH_VERIFIED',
    'RTO_INITIATED',
    'RETURN_IN_TRANSIT',
    'RETURNED_TO_MERCHANT',
    'CANCELLED',
    'LOST',
    'DAMAGED'
);


ALTER TYPE public.parcels_status_enum OWNER TO postgres;

--
-- Name: payout_requests_payout_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payout_requests_payout_method_enum AS ENUM (
    'BKASH',
    'NAGAD',
    'ROCKET',
    'BANK_TRANSFER'
);


ALTER TYPE public.payout_requests_payout_method_enum OWNER TO postgres;

--
-- Name: payout_requests_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payout_requests_status_enum AS ENUM (
    'REQUESTED',
    'APPROVED',
    'PROCESSING',
    'COMPLETED',
    'REJECTED',
    'FAILED',
    'CANCELLED'
);


ALTER TYPE public.payout_requests_status_enum OWNER TO postgres;

--
-- Name: riders_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.riders_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ON_DUTY',
    'OFF_DUTY'
);


ALTER TYPE public.riders_status_enum OWNER TO postgres;

--
-- Name: settlement_batches_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.settlement_batches_status_enum AS ENUM (
    'PENDING',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public.settlement_batches_status_enum OWNER TO postgres;

--
-- Name: settlements_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.settlements_status_enum AS ENUM (
    'SETTLED',
    'REVERSED'
);


ALTER TYPE public.settlements_status_enum OWNER TO postgres;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'ADMIN',
    'MERCHANT',
    'RIDER',
    'HUB_MANAGER',
    'CUSTOMER'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

--
-- Name: users_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


ALTER TYPE public.users_status_enum OWNER TO postgres;

--
-- Name: wallet_transactions_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.wallet_transactions_type_enum AS ENUM (
    'COD_CREDIT',
    'DELIVERY_FEE',
    'RETURN_FEE',
    'PAYOUT_DEBIT',
    'ADJUSTMENT_CREDIT',
    'ADJUSTMENT_DEBIT'
);


ALTER TYPE public.wallet_transactions_type_enum OWNER TO postgres;

--
-- Name: webhook_deliveries_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.webhook_deliveries_status_enum AS ENUM (
    'PENDING',
    'DELIVERED',
    'FAILED',
    'DEAD_LETTER'
);


ALTER TYPE public.webhook_deliveries_status_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: address_aliases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address_aliases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    place_id uuid NOT NULL,
    alias character varying(128) NOT NULL,
    normalized_alias character varying(128) NOT NULL,
    language character varying(8) DEFAULT 'en'::character varying NOT NULL,
    alias_type character varying(32) NOT NULL,
    source character varying(128)
);


ALTER TABLE public.address_aliases OWNER TO postgres;

--
-- Name: address_confirmations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address_confirmations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    parse_id uuid NOT NULL,
    parcel_id uuid,
    confirmed_by uuid NOT NULL,
    confirmation_source character varying(16) NOT NULL,
    structure jsonb NOT NULL,
    candidate_index integer,
    reason character varying(500)
);


ALTER TABLE public.address_confirmations OWNER TO postgres;

--
-- Name: address_parses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address_parses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    parcel_id uuid,
    original_address text NOT NULL,
    normalized_address text NOT NULL,
    normalized_hash character varying(64) NOT NULL,
    structured jsonb NOT NULL,
    confidence double precision NOT NULL,
    matched_by character varying(32) NOT NULL,
    has_conflict boolean DEFAULT false NOT NULL,
    conflict_detail text,
    candidates jsonb DEFAULT '[]'::jsonb NOT NULL,
    parser_version character varying(64) NOT NULL,
    dataset_version character varying(64) NOT NULL,
    language character varying(8) DEFAULT 'EN'::character varying NOT NULL
);


ALTER TABLE public.address_parses OWNER TO postgres;

--
-- Name: analytics_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics_alerts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    alert_key character varying(64) NOT NULL,
    severity character varying(16) NOT NULL,
    status character varying(16) DEFAULT 'OPEN'::character varying NOT NULL,
    scope character varying(64) DEFAULT 'platform'::character varying NOT NULL,
    scope_id uuid,
    metric_value double precision NOT NULL,
    threshold double precision NOT NULL,
    dedup_key character varying(192) NOT NULL,
    triggered_at timestamp with time zone NOT NULL,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone
);


ALTER TABLE public.analytics_alerts OWNER TO postgres;

--
-- Name: bag_parcels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bag_parcels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    bag_id uuid NOT NULL,
    parcel_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.bag_parcels OWNER TO postgres;

--
-- Name: bags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    bag_code character varying(50) NOT NULL,
    origin_hub_id uuid NOT NULL,
    destination_hub_id uuid NOT NULL,
    status public.bags_status_enum DEFAULT 'OPEN'::public.bags_status_enum NOT NULL,
    seal_tag character varying(100),
    sealed_at timestamp with time zone,
    dispatched_at timestamp with time zone,
    received_at timestamp with time zone,
    notes text,
    created_by uuid,
    sealed_by uuid,
    cancelled_at timestamp with time zone
);


ALTER TABLE public.bags OWNER TO postgres;

--
-- Name: cash_discrepancies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_discrepancies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    cash_ledger_id uuid NOT NULL,
    handin_id uuid,
    type public.cash_discrepancies_type_enum NOT NULL,
    status public.cash_discrepancies_status_enum DEFAULT 'OPEN'::public.cash_discrepancies_status_enum NOT NULL,
    expected_minor bigint NOT NULL,
    actual_minor bigint NOT NULL,
    difference_minor bigint NOT NULL,
    currency character varying(10) DEFAULT 'BDT'::character varying NOT NULL,
    reason text,
    notes text,
    reported_by uuid,
    resolved_by uuid,
    resolved_at timestamp with time zone
);


ALTER TABLE public.cash_discrepancies OWNER TO postgres;

--
-- Name: cash_handin_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_handin_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    handin_id uuid NOT NULL,
    cash_ledger_id uuid NOT NULL,
    amount_minor bigint NOT NULL
);


ALTER TABLE public.cash_handin_items OWNER TO postgres;

--
-- Name: cash_handins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_handins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    handin_code character varying(20) NOT NULL,
    rider_id uuid NOT NULL,
    hub_id uuid,
    status public.cash_handins_status_enum DEFAULT 'SUBMITTED'::public.cash_handins_status_enum NOT NULL,
    expected_minor bigint NOT NULL,
    verified_minor bigint DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'BDT'::character varying NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone,
    verified_by uuid,
    notes text,
    CONSTRAINT "CHK_cash_handins_expected" CHECK ((expected_minor >= 0))
);


ALTER TABLE public.cash_handins OWNER TO postgres;

--
-- Name: cash_ledgers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_ledgers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    parcel_id uuid NOT NULL,
    rider_id uuid NOT NULL,
    hub_id uuid,
    amount numeric(12,2) NOT NULL,
    collected_at timestamp with time zone DEFAULT now() NOT NULL,
    hand_in_status public.cash_ledgers_hand_in_status_enum DEFAULT 'PENDING'::public.cash_ledgers_hand_in_status_enum NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    verified_amount numeric(12,2)
);


ALTER TABLE public.cash_ledgers OWNER TO postgres;

--
-- Name: delivery_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_attempts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    parcel_id uuid NOT NULL,
    rider_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    outcome public.delivery_attempts_outcome_enum NOT NULL,
    failure_reason public.delivery_attempts_failure_reason_enum,
    notes text,
    rescheduled_for timestamp with time zone,
    metadata jsonb
);


ALTER TABLE public.delivery_attempts OWNER TO postgres;

--
-- Name: event_outbox; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_outbox (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    event_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    aggregate_type character varying(64) NOT NULL,
    aggregate_id uuid NOT NULL,
    request_id character varying(128),
    actor_id uuid,
    payload jsonb NOT NULL,
    status public.event_outbox_status_enum DEFAULT 'PENDING'::public.event_outbox_status_enum NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    last_error text
);


ALTER TABLE public.event_outbox OWNER TO postgres;

--
-- Name: financial_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    transaction_id uuid NOT NULL,
    account public.financial_entries_account_enum NOT NULL,
    direction public.financial_entries_direction_enum NOT NULL,
    amount_minor bigint NOT NULL,
    currency character varying(10) DEFAULT 'BDT'::character varying NOT NULL,
    merchant_id uuid,
    memo text,
    CONSTRAINT "CHK_financial_entries_positive" CHECK ((amount_minor > 0))
);


ALTER TABLE public.financial_entries OWNER TO postgres;

--
-- Name: financial_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    transaction_code character varying(20) NOT NULL,
    type public.financial_transactions_type_enum NOT NULL,
    status public.financial_transactions_status_enum DEFAULT 'POSTED'::public.financial_transactions_status_enum NOT NULL,
    reference_type character varying(50),
    reference_id character varying(100),
    description text,
    reversal_of_id uuid,
    reversed_by_id uuid,
    created_by uuid
);


ALTER TABLE public.financial_transactions OWNER TO postgres;

--
-- Name: geo_dataset_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geo_dataset_versions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    version character varying(64) NOT NULL,
    source character varying(255) NOT NULL,
    imported_at timestamp with time zone NOT NULL,
    divisions integer DEFAULT 0 NOT NULL,
    districts integer DEFAULT 0 NOT NULL,
    upazilas integer DEFAULT 0 NOT NULL,
    aliases integer DEFAULT 0 NOT NULL,
    status character varying(16) DEFAULT 'ACTIVE'::character varying NOT NULL
);


ALTER TABLE public.geo_dataset_versions OWNER TO postgres;

--
-- Name: geo_places; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geo_places (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    kind character varying(16) NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    name_bn character varying(128),
    parent_id uuid,
    division character varying(128),
    zone character varying(16),
    aliases jsonb DEFAULT '[]'::jsonb NOT NULL,
    postal_codes jsonb DEFAULT '[]'::jsonb NOT NULL,
    dataset_version character varying(64) NOT NULL
);


ALTER TABLE public.geo_places OWNER TO postgres;

--
-- Name: hub_user_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hub_user_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    hub_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.hub_user_assignments OWNER TO postgres;

--
-- Name: hubs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hubs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    district_id uuid,
    thana_id uuid,
    address text NOT NULL,
    status public.hubs_status_enum DEFAULT 'ACTIVE'::public.hubs_status_enum NOT NULL,
    type public.hubs_type_enum DEFAULT 'SORTING'::public.hubs_type_enum NOT NULL,
    district character varying(100),
    thana character varying(100)
);


ALTER TABLE public.hubs OWNER TO postgres;

--
-- Name: idempotency_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.idempotency_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    key character varying(128) NOT NULL,
    scope character varying(64) DEFAULT 'DEFAULT'::character varying NOT NULL,
    user_id uuid,
    request_hash character varying(64),
    status_code integer,
    response jsonb,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone
);


ALTER TABLE public.idempotency_records OWNER TO postgres;

--
-- Name: integration_failures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration_failures (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    job_id character varying(128) NOT NULL,
    event_id uuid,
    queue character varying(64) NOT NULL,
    kind public.integration_failures_kind_enum NOT NULL,
    reference_id character varying(100),
    merchant_id uuid,
    reason text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    status public.integration_failures_status_enum DEFAULT 'OPEN'::public.integration_failures_status_enum NOT NULL,
    last_attempt_at timestamp with time zone,
    resolved_by uuid,
    resolved_at timestamp with time zone
);


ALTER TABLE public.integration_failures OWNER TO postgres;

--
-- Name: intelligence_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.intelligence_feedback (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    subject_type character varying(32) NOT NULL,
    subject_id character varying(128) NOT NULL,
    signal character varying(32) NOT NULL,
    actor_id uuid,
    detail character varying(500)
);


ALTER TABLE public.intelligence_feedback OWNER TO postgres;

--
-- Name: intelligence_recommendations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.intelligence_recommendations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    parcel_id uuid NOT NULL,
    prediction_id uuid,
    action character varying(32) NOT NULL,
    reasons jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(16) DEFAULT 'ACTIVE'::character varying NOT NULL,
    overridden_by uuid,
    overridden_at timestamp with time zone,
    override_reason character varying(500),
    override_decision character varying(16)
);


ALTER TABLE public.intelligence_recommendations OWNER TO postgres;

--
-- Name: manifest_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manifest_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    manifest_id uuid NOT NULL,
    bag_id uuid,
    parcel_id uuid,
    CONSTRAINT "CHK_manifest_items_single_ref" CHECK (((bag_id IS NOT NULL) <> (parcel_id IS NOT NULL)))
);


ALTER TABLE public.manifest_items OWNER TO postgres;

--
-- Name: manifests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manifests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    manifest_code character varying(50) NOT NULL,
    origin_hub_id uuid NOT NULL,
    destination_hub_id uuid NOT NULL,
    status public.manifests_status_enum DEFAULT 'CREATED'::public.manifests_status_enum NOT NULL,
    vehicle_number character varying(100) NOT NULL,
    driver_name character varying(150),
    driver_phone character varying(20),
    dispatched_at timestamp with time zone,
    received_at timestamp with time zone,
    notes text,
    created_by uuid,
    dispatched_by uuid,
    received_by uuid
);


ALTER TABLE public.manifests OWNER TO postgres;

--
-- Name: merchants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.merchants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    business_name character varying(255) NOT NULL,
    contact_phone character varying(20) NOT NULL,
    status public.merchants_status_enum DEFAULT 'PENDING_VERIFICATION'::public.merchants_status_enum NOT NULL,
    pickup_address text NOT NULL
);


ALTER TABLE public.merchants OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    merchant_id uuid,
    category public.notification_preferences_category_enum NOT NULL,
    channel public.notification_preferences_channel_enum NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    locale character varying(5) DEFAULT 'en'::character varying NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    merchant_id uuid,
    user_id uuid,
    channel public.notifications_channel_enum DEFAULT 'IN_APP'::public.notifications_channel_enum NOT NULL,
    type public.notifications_type_enum DEFAULT 'PARCEL_STATUS_UPDATE'::public.notifications_type_enum NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    recipient_target character varying(255),
    status public.notifications_status_enum DEFAULT 'SENT'::public.notifications_status_enum NOT NULL,
    metadata jsonb,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    failure_reason text,
    event_id uuid,
    dedupe_key character varying(255),
    provider_message_id character varying(128),
    attempt_count integer DEFAULT 0 NOT NULL,
    template_key character varying(100),
    locale character varying(5) DEFAULT 'en'::character varying NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: operational_exceptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.operational_exceptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    hub_id uuid NOT NULL,
    parcel_id uuid,
    bag_id uuid,
    manifest_id uuid,
    type public.operational_exceptions_type_enum NOT NULL,
    status public.operational_exceptions_status_enum DEFAULT 'OPEN'::public.operational_exceptions_status_enum NOT NULL,
    description text NOT NULL,
    actor_id uuid,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_note text
);


ALTER TABLE public.operational_exceptions OWNER TO postgres;

--
-- Name: parcel_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parcel_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    parcel_id uuid NOT NULL,
    rider_id uuid NOT NULL,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    unassigned_at timestamp with time zone
);


ALTER TABLE public.parcel_assignments OWNER TO postgres;

--
-- Name: parcel_scans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parcel_scans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    parcel_id uuid,
    bag_id uuid,
    hub_id uuid NOT NULL,
    scan_type public.parcel_scans_scan_type_enum NOT NULL,
    outcome public.parcel_scans_outcome_enum NOT NULL,
    reason_code character varying(64),
    barcode character varying(64) NOT NULL,
    operator_id uuid,
    idempotency_key character varying(128),
    notes text,
    metadata jsonb
);


ALTER TABLE public.parcel_scans OWNER TO postgres;

--
-- Name: parcel_status_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parcel_status_histories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    parcel_id uuid NOT NULL,
    from_status public.parcel_status_histories_from_status_enum,
    to_status public.parcel_status_histories_to_status_enum NOT NULL,
    event_type character varying(50) DEFAULT 'STATUS_CHANGED'::character varying NOT NULL,
    actor_id uuid,
    actor_role character varying(50) NOT NULL,
    description text,
    metadata jsonb
);


ALTER TABLE public.parcel_status_histories OWNER TO postgres;

--
-- Name: parcels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parcels (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    tracking_code character varying(50) NOT NULL,
    merchant_id uuid NOT NULL,
    current_rider_id uuid,
    current_hub_id uuid,
    recipient_name character varying(255) NOT NULL,
    parcel_description character varying(500),
    recipient_phone character varying(20) NOT NULL,
    raw_address text NOT NULL,
    district character varying(100),
    thana character varying(100),
    normalized_address jsonb,
    weight numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    cod_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    delivery_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status public.parcels_status_enum DEFAULT 'CREATED'::public.parcels_status_enum NOT NULL,
    delivery_otp_hash character varying(255),
    otp_expires_at timestamp with time zone,
    otp_attempts integer DEFAULT 0 NOT NULL,
    otp_verified_at timestamp with time zone,
    otp_request_count integer DEFAULT 0 NOT NULL,
    last_otp_requested_at timestamp with time zone
);


ALTER TABLE public.parcels OWNER TO postgres;

--
-- Name: payout_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payout_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    merchant_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    payout_method public.payout_requests_payout_method_enum NOT NULL,
    account_details jsonb NOT NULL,
    status public.payout_requests_status_enum DEFAULT 'REQUESTED'::public.payout_requests_status_enum NOT NULL,
    processed_by uuid,
    processed_at timestamp with time zone,
    transaction_reference character varying(100),
    rejection_reason text,
    notes text,
    payout_code character varying(20),
    idempotency_key character varying(128),
    failure_reason text,
    approved_by uuid,
    approved_at timestamp with time zone
);


ALTER TABLE public.payout_requests OWNER TO postgres;

--
-- Name: recipient_feature_aggregates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipient_feature_aggregates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    phone_hash character varying(128) NOT NULL,
    merchant_id uuid,
    scope character varying(16) NOT NULL,
    as_of timestamp with time zone NOT NULL,
    total_orders integer DEFAULT 0 NOT NULL,
    delivered_orders integer DEFAULT 0 NOT NULL,
    returned_orders integer DEFAULT 0 NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    recent_failed_deliveries integer DEFAULT 0 NOT NULL,
    cod_collected_minor bigint DEFAULT 0 NOT NULL,
    cod_failed_minor bigint DEFAULT 0 NOT NULL,
    recent_order_count integer DEFAULT 0 NOT NULL,
    address_confidence double precision,
    feature_version character varying(32) NOT NULL,
    computed_at timestamp with time zone NOT NULL
);


ALTER TABLE public.recipient_feature_aggregates OWNER TO postgres;

--
-- Name: recipient_risk_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipient_risk_snapshots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    phone_hash character varying(128) NOT NULL,
    merchant_id uuid,
    scope character varying(16) NOT NULL,
    risk_score integer NOT NULL,
    level character varying(16) NOT NULL,
    reasons jsonb DEFAULT '[]'::jsonb NOT NULL,
    risk_confidence character varying(8) NOT NULL,
    scoring_version character varying(64) NOT NULL,
    features jsonb NOT NULL,
    scored_at timestamp with time zone NOT NULL
);


ALTER TABLE public.recipient_risk_snapshots OWNER TO postgres;

--
-- Name: report_exports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_exports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    dataset character varying(16) NOT NULL,
    format character varying(8) DEFAULT 'csv'::character varying NOT NULL,
    status character varying(16) DEFAULT 'PENDING'::character varying NOT NULL,
    idempotency_key character varying(128),
    filters jsonb NOT NULL,
    tenant_id uuid,
    requested_by uuid NOT NULL,
    row_count integer,
    content text,
    file_name character varying(255),
    failure_reason character varying(500),
    expires_at timestamp with time zone,
    ready_at timestamp with time zone
);


ALTER TABLE public.report_exports OWNER TO postgres;

--
-- Name: riders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.riders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    hub_id uuid NOT NULL,
    status public.riders_status_enum DEFAULT 'ACTIVE'::public.riders_status_enum NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    rider_code character varying(20)
);


ALTER TABLE public.riders OWNER TO postgres;

--
-- Name: rto_predictions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rto_predictions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    parcel_id uuid NOT NULL,
    phone_hash character varying(128) NOT NULL,
    merchant_id uuid,
    score integer NOT NULL,
    level character varying(16) NOT NULL,
    reasons jsonb DEFAULT '[]'::jsonb NOT NULL,
    model_type character varying(16) NOT NULL,
    model_version character varying(64) NOT NULL,
    features jsonb NOT NULL,
    predicted_at timestamp with time zone NOT NULL,
    outcome character varying(16),
    outcome_at timestamp with time zone
);


ALTER TABLE public.rto_predictions OWNER TO postgres;

--
-- Name: scoring_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scoring_models (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    name character varying(64) NOT NULL,
    version character varying(64) NOT NULL,
    type character varying(32) NOT NULL,
    status character varying(16) DEFAULT 'DRAFT'::character varying NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    activated_at timestamp with time zone,
    retired_at timestamp with time zone
);


ALTER TABLE public.scoring_models OWNER TO postgres;

--
-- Name: settlement_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settlement_batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    settlement_code character varying(20) NOT NULL,
    merchant_id uuid NOT NULL,
    status public.settlement_batches_status_enum DEFAULT 'PENDING'::public.settlement_batches_status_enum NOT NULL,
    gross_minor bigint DEFAULT 0 NOT NULL,
    fee_minor bigint DEFAULT 0 NOT NULL,
    net_minor bigint DEFAULT 0 NOT NULL,
    settlement_count integer DEFAULT 0 NOT NULL,
    notes text,
    created_by uuid,
    completed_at timestamp with time zone
);


ALTER TABLE public.settlement_batches OWNER TO postgres;

--
-- Name: settlements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settlements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    settlement_code character varying(20) NOT NULL,
    merchant_id uuid NOT NULL,
    parcel_id uuid NOT NULL,
    cash_ledger_id uuid NOT NULL,
    gross_minor bigint NOT NULL,
    fee_minor bigint NOT NULL,
    net_minor bigint NOT NULL,
    currency character varying(10) DEFAULT 'BDT'::character varying NOT NULL,
    status public.settlements_status_enum DEFAULT 'SETTLED'::public.settlements_status_enum NOT NULL,
    transaction_id uuid NOT NULL,
    batch_id uuid,
    settled_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settlements OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.users_role_enum DEFAULT 'MERCHANT'::public.users_role_enum NOT NULL,
    status public.users_status_enum DEFAULT 'ACTIVE'::public.users_status_enum NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    wallet_id uuid NOT NULL,
    type public.wallet_transactions_type_enum NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    reference_type character varying(50),
    reference_id character varying(100),
    description text
);


ALTER TABLE public.wallet_transactions OWNER TO postgres;

--
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    merchant_id uuid NOT NULL,
    balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    pending_balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    withdrawn_total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    currency character varying(10) DEFAULT 'BDT'::character varying NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    subscription_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    event character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    signature character varying(255) NOT NULL,
    status_code integer,
    response_body text,
    status public.webhook_deliveries_status_enum DEFAULT 'PENDING'::public.webhook_deliveries_status_enum NOT NULL,
    attempt_count integer DEFAULT 1 NOT NULL,
    next_retry_at timestamp with time zone,
    last_attempt_at timestamp with time zone,
    delivered_at timestamp with time zone,
    event_id uuid
);


ALTER TABLE public.webhook_deliveries OWNER TO postgres;

--
-- Name: webhook_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    merchant_id uuid NOT NULL,
    url character varying(500) NOT NULL,
    secret character varying(255) NOT NULL,
    events jsonb NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    description character varying(255),
    failure_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.webhook_subscriptions OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: address_aliases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address_aliases (id, "createdAt", "updatedAt", place_id, alias, normalized_alias, language, alias_type, source) FROM stdin;
6acbe5e3-2ab9-4d48-bc14-fb80432a2884	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhanmondi	dhanmondi	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
53d5b03a-50e1-42c6-8216-11c737fcf9fc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	ধানমন্ডি	ধানমন্ডি	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
658d4fbd-7408-4b80-ad24-03142d6cd984	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	dhanmandi	dhanmandi	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8ad3f1ca-907d-44a1-b223-f52d47e3d52c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Gulshan	gulshan	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
cca0a35a-1412-4b5e-890b-7a20ac2628cf	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	গুলশান	গুলশান	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0c5d108b-306f-4525-a650-258a8e3dcdb1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Banani	banani	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
38a4f5a6-4e69-495c-9f20-809ded54253a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	বনানী	বনানী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
326dc8ab-e7c1-4d1f-954b-88e11edcd244	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Uttara	uttara	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
ed1ce902-136a-4a27-9384-63ac1d6e0266	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	উত্তরা	উত্তরা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0a72b437-35cc-4351-b9bb-a2ab90f30bca	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	utora	utora	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d065b6c3-059c-428a-9d29-d46389d96113	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Mirpur	mirpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
fa4a46b0-d6f4-4042-9dac-96e8cf5f8e60	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	মিরপুর	মিরপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
969cefdb-9f0f-4d03-81c3-04de48d0f87a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	meerpur	meerpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
0dafc558-bfe8-430f-8fa2-26e8ed23d8f3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Mohammadpur	mohammadpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
726473e2-d708-4292-b5a1-f61d8f659a72	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	মোহাম্মদপুর	মোহাম্মদপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f9a2b8e6-cd6f-48de-910a-10eb167c10d9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	mohammodpur	mohammodpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c1a14537-fe4d-4177-bbb6-f8b2ec93c9b1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Motijheel	motijheel	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c41bcfcc-8680-4306-96f6-061720c5947f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	মতিঝিল	মতিঝিল	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
97903737-69dc-45da-a405-b965ad732392	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	motijhil	motijhil	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7bfadaa1-d66a-4df6-b5cc-c91b64078f81	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Badda	badda	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7306b349-1e34-4a98-8531-f82e38430a65	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	বাড্ডা	বাড্ডা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
edda5d46-ff0f-4d64-8891-cb99ca4fafd4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Khilgaon	khilgaon	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b21813b6-440d-4e99-810d-60ddd93e2125	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	খিলগাঁও	খিলগাঁও	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f8604f0c-6d48-4b73-947d-c178977912c0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Rampura	rampura	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8907a59c-3d51-4a06-b6bd-2597aa1209a6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	রামপুরা	রামপুরা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
bc35bccc-bfcf-455f-b52c-483e10d9797f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Tejgaon	tejgaon	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
f916c6b0-4a07-4ecb-8752-8478fb3c762c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	তেজগাঁও	তেজগাঁও	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
ae565e7b-a462-4903-a832-06b9620d90dc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Lalbagh	lalbagh	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b174b070-62ce-40d2-998d-baae65265609	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	লালবাগ	লালবাগ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e7fe7b89-8486-4e32-ac8e-cb78351bc4f6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	lalbag	lalbag	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
348e0d1e-3b1e-41f3-9135-a0366026688e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Paltan	paltan	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
03cbf975-d05b-431e-8144-6d642ca58beb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	পল্টন	পল্টন	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
09cf82db-4f4d-4302-80e4-114e1502d84c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Shahbagh	shahbagh	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
512dc449-fdef-4338-8ff6-2c0605d3a564	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	শাহবাগ	শাহবাগ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6653b5bc-4d38-4dd4-a281-b2c555701200	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	shahbag	shahbag	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
2aea2a0a-dcf7-4ef6-83a4-d8d098e0a179	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Jatrabari	jatrabari	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
0a6551bb-3015-4016-bc94-34c23df7b27f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	যাত্রাবাড়ী	যাত্রাবাড়ী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
78af157b-af85-41d2-b70e-6cbfb5dfcf23	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	যাত্রাবাড়ি	যাত্রাবাড়ি	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
7bef67de-1b19-4d81-bbac-face01a160ea	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Demra	demra	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3b6516e8-e3d2-4954-b9bc-430a2f9510c7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	ডেমরা	ডেমরা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
81d646fb-4fd1-4c7f-a2e9-4963d4a04d9d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Savar	savar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e962e4d5-0622-4515-add3-09521b5e71a4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	সাভার	সাভার	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
349be657-2be3-434c-b099-eedc93e274e9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	shavar	shavar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c81aaa8a-c7aa-47e5-9724-b61e387e7fb2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Keraniganj	keraniganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
67ec049a-cc07-4c8c-963f-a6732db8be44	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	কেরানীগঞ্জ	কেরানীগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
2986166a-5928-45e2-a68d-93747a0158e9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhamrai	dhamrai	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
2f276576-c24b-47a1-9c4f-b8c9f3e4a47f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	ধামরাই	ধামরাই	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6677cd9a-4f1c-4867-88d5-034f7d5e16ee	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Nawabganj	nawabganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b32b3871-39a3-49b7-9991-debbd8e0513b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	নবাবগঞ্জ	নবাবগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e8798e8c-84ad-4949-8f42-f157340d9970	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dohar	dohar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
9c5387fe-b337-4f02-b1d3-ca5b4b976cc5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	দোহার	দোহার	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
4495d47e-0f59-4eef-a351-db913a3c421b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	Gazipur Sadar	gazipur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e9c9a4b5-22bf-4130-99e9-8b327fda2202	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	গাজীপুর সদর	গাজীপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0dbea6b1-f169-4842-8fe9-6d7349515ebe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	sadar	sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
4a283cb7-eb17-4eff-89c6-ae1e8d891445	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	joydebpur	joydebpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
094962c1-d909-447a-81b4-d12dee29cc6c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	জয়দেবপুর	জয়দেবপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
63c15f83-d237-4c83-9262-e0ae2d140c04	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	Tongi	tongi	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
84581a69-5911-4e12-be93-907a311aa06f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	টঙ্গী	টঙ্গী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
d03164fc-016e-4b90-9f19-36734c56d000	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	Kaliakair	kaliakair	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b595581b-778e-49f6-99f9-7c082dfbc9d2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	কালিয়াকৈর	কালিয়াকৈর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
afe612b0-33be-442b-aa9f-ea971c21267b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	Kapasia	kapasia	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
f8e98b88-19b3-4bfc-ab5f-003ac9b1ab87	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	কাপাসিয়া	কাপাসিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
2773fee4-3264-4bf3-b40d-0699fa8b3eb3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	Sreepur	sreepur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b8d744cc-f9c2-420d-a422-1e975c0fbff9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	শ্রীপুর	শ্রীপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
4a0fc27d-d293-4e8b-a0b4-ba5197020b40	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1408b9d6-a9dd-409d-a484-558181bdac8f	shreepur	shreepur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
21b50f0b-444e-434e-b0d5-dfcf85d973e2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	Narayanganj Sadar	narayanganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3898edec-868e-451d-b1fd-e4102be10648	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	নারায়ণগঞ্জ সদর	নারায়ণগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e38186b1-90da-46e7-8fc3-fa737402bee1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	শহর	শহর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
555e3754-12b3-4872-bae4-aad442453a3a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	Fatullah	fatullah	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c26df14a-36ed-48fc-8cad-0c07c32712dd	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	ফতুল্লা	ফতুল্লা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
79e31b29-de46-4261-b50a-1b78a9f655b1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	fatulla	fatulla	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
a5ae2814-4c61-4979-8765-e6b49b673fa6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	Siddhirganj	siddhirganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
5ec143bd-7b62-48f8-910f-32fc197f2ecd	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	সিদ্ধিরগঞ্জ	সিদ্ধিরগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
2813fde3-d9f4-45d7-8f47-d383f308e8b2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	Bandar	bandar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b03b5170-2f28-4ad7-a067-9f3ef5b8c1b1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	বন্দর	বন্দর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
45b32dcd-497f-431d-ae55-342c33e76ffd	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	Rupganj	rupganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
db920825-1f1d-48f3-a0ac-83782f1f04e1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	রূপগঞ্জ	রূপগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
bfe3d24b-d49c-4651-9234-298f225224cd	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	Araihazar	araihazar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
bb7c0f30-5680-4ae6-8390-748390d54a2b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	আড়াইহাজার	আড়াইহাজার	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
35378410-9230-4012-a332-b56ebce2a414	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	Sonargaon	sonargaon	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
dbce4e4a-8bc1-4dca-8569-8b0fab540db8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	0c8d797a-86dd-4632-9e61-586850c803f6	সোনারগাঁও	সোনারগাঁও	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a3d26134-0560-4076-a9da-cffdaada5f85	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Agrabad	agrabad	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
1d20b3a8-1a1e-4e4e-b874-c5b9b3b20e3d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	আগ্রাবাদ	আগ্রাবাদ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
dd286488-e18a-425d-962b-9476afa2ba2a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Panchlaish	panchlaish	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
bf7ab7fa-5bf1-44de-837b-42862bc5b3a0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	পাঁচলাইশ	পাঁচলাইশ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
b1a3fe4d-4a8f-4c12-9452-176e7d8c3717	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Kotwali	kotwali	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
9f1e5242-c869-4e17-b40e-b5a4251a35c7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	কোতোয়ালী	কোতোয়ালী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
ea3e6654-7896-4308-8d34-ed86e618ef95	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Halishahar	halishahar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b0ae4db1-bee3-49ae-8393-fa616595b15d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	হালিশহর	হালিশহর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c9418f0a-78e7-40fb-9638-357139816623	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Khulshi	khulshi	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
268f23e8-d437-4910-818d-fdc4c5bbb552	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	খুলশী	খুলশী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c25d3c85-a7bb-4631-9b57-dcf56d08a495	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Bakalia	bakalia	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
afc84bf2-4587-49fb-a5aa-354d6a285276	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	বাকলিয়া	বাকলিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a36a227d-278c-495a-87e2-77c2453bd4b8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Double Mooring	double mooring	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
9135749c-709c-4eab-b1c1-be5d25e926bf	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	ডবলমুরিং	ডবলমুরিং	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9be23e95-1105-4476-8e51-5e9e17979864	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Hathazari	hathazari	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8e9fbd01-bde5-4b6b-97b6-0a0a4b9dc6d0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	হাটহাজারী	হাটহাজারী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
8a5f89b2-25ba-4138-b448-76c6f3aef893	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Patiya	patiya	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3495c79d-a84a-4ce7-9d78-faefe41f08c2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	পটিয়া	পটিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
33bfa6d8-aa77-4a0b-a8ef-9b7996a06708	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	Sitakunda	sitakunda	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
9bbb3f43-0f32-4663-af5f-921bad843ab8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	সীতাকুণ্ড	সীতাকুণ্ড	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
b2edbe50-0b68-4bc2-8420-7867c4f70a15	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	96472eb8-29be-40df-b0e4-68bb08b09a75	sitakund	sitakund	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
1791121c-e4f0-4452-a6ed-5049c23abe20	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	Sylhet Sadar	sylhet sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
61392052-8a9b-4517-a1c9-011d7d319ae4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	সিলেট সদর	সিলেট সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9a28a71b-f8c8-435c-8827-0703059befb8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	সদর	সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0fbc9188-fcad-4393-b6cb-4938f8da58c2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	Zindabazar	zindabazar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
4d892540-20a5-48c0-a928-7b46ec38fa08	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	জিন্দাবাজার	জিন্দাবাজার	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
81db223c-3fb2-4f69-9857-c2a08bf5aab1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	Shah Paran	shah paran	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3c7d9689-509c-4f6f-ac00-dbdec1e8675e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	শাহপরাণ	শাহপরাণ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0e490291-4568-4600-83f0-0117cd42e4ef	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	Beanibazar	beanibazar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
9ea60de7-c822-40c9-aaad-715ae7269d9e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	বিয়ানীবাজার	বিয়ানীবাজার	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
74d13564-cef8-4662-b84d-8a76e8d753bd	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	Golapganj	golapganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
16ff3a65-d949-4895-aed6-5d720aefb8b1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	গোলাপগঞ্জ	গোলাপগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f8f6ccb0-6f21-4790-98f8-94b913e8873b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	South Surma	south surma	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
00ed0cea-9246-4fc7-ba40-4f14e923917b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c157b25-0029-48cf-ba83-b199c6dfe492	দক্ষিণ সুরমা	দক্ষিণ সুরমা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
947a8277-80d5-4b32-abed-503e2e9eb4c1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	Boalia	boalia	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c913d9aa-7e1e-4d7f-b187-104ccd50dac5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	বোয়ালিয়া	বোয়ালিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
78fdc0f4-5fdc-48e1-9de7-f7579c19b317	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	Motihar	motihar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
1868d758-884e-4e41-a57b-da0f76d3e112	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	মতিহার	মতিহার	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
ba51ae84-f25f-49d2-b559-0e30bb2f4cf3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	Rajpara	rajpara	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
0e560c2a-3024-490c-9006-b4d4821d8a83	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	রাজপাড়া	রাজপাড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
afd0e91a-2579-4e3e-bf5b-b7c28dd80345	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	Shah Makhdum	shah makhdum	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
24fbc990-4118-4257-863a-27fdfc50ea39	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	শাহ মখদুম	শাহ মখদুম	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c47756c3-3b6f-4648-8177-f55529e16ed3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	Paba	paba	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
becdb84a-e86b-4f75-a69a-e661a8b28d48	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	de99a84a-5e46-40b1-afcf-6255435adba5	পবা	পবা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e0329f06-d248-4f9c-b344-54a0d5e6d89b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	Khulna Sadar	khulna sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
2ab01a1d-ac77-4821-8793-c3ad61f23d35	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	খুলনা সদর	খুলনা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
727acc22-d1be-406a-8db9-f5fbb18f28ce	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	Sonadanga	sonadanga	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
51f984b1-8fd8-4d33-be32-30a883708bda	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	সোনাডাঙ্গা	সোনাডাঙ্গা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9d4a989a-412c-41e1-b4ca-22bf7afeceea	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	Khalishpur	khalishpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b1520eeb-96f2-4536-8b05-956f05d259a6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	খালিশপুর	খালিশপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
cd305453-9e8b-4b17-92f5-972813932ff2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	Daulatpur	daulatpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
cee725c0-234b-46f4-b769-a479f591d63d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	দৌলতপুর	দৌলতপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
2446fbca-6dc0-47cc-a8f0-1119e88d9b78	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	Rupsha	rupsha	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
5c649bd8-5e48-42a9-8796-cf5246ab95c5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df253017-5eee-4c9e-b445-652266f12ef4	রূপসা	রূপসা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6b3b8183-08b7-4f28-a8c2-556967a73856	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	Barisal Sadar	barisal sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8be15392-5ea4-4448-8f3f-193465df32f5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	বরিশাল সদর	বরিশাল সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
fd297663-96ca-4525-80f2-b3ac937f6b38	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	Airport	airport	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
885fac05-f2c9-4cb2-9443-c07620466a22	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	বিমানবন্দর	বিমানবন্দর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
cf931a1e-1266-4d94-be01-b7baac7aeb40	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	এয়ারপোর্ট	এয়ারপোর্ট	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6ca0dd49-a016-4008-9bd5-fc198d7e4c72	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	Bakerganj	bakerganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e0441606-7467-4153-a4d8-961a2d532559	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	বাকেরগঞ্জ	বাকেরগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
7a2f34d5-0713-4d85-91a8-0cce12de5671	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	Babuganj	babuganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
cd28c6b0-840a-4446-a0e1-689fc87b3151	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4489fad5-9652-4a36-a268-bc41d4f56703	বাবুগঞ্জ	বাবুগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
3c8522c6-9f5b-494e-89a7-da532231eb5b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cc645738-2185-4057-9500-bd2a753b3043	Rangpur Sadar	rangpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b99b6b31-be37-444b-bcba-1a9f0f56e6e3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cc645738-2185-4057-9500-bd2a753b3043	রংপুর সদর	রংপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9eb13177-469a-4960-8f6b-829490b9c9df	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cc645738-2185-4057-9500-bd2a753b3043	Tajhat	tajhat	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
1beebdcf-3db7-475c-87ee-1f4099e3bec6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cc645738-2185-4057-9500-bd2a753b3043	তাজহাট	তাজহাট	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
d4cfabbe-b8bb-4a25-a987-0fb2d98e126f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cc645738-2185-4057-9500-bd2a753b3043	Mithapukur	mithapukur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
80dbe511-3369-4b90-98c9-2a612a36f556	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cc645738-2185-4057-9500-bd2a753b3043	মিঠাপুকুর	মিঠাপুকুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
34fff3b9-f3b6-4c5c-ae2e-ed41a9ac492d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cc645738-2185-4057-9500-bd2a753b3043	Pirganj	pirganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
05f6ad54-d147-4c59-a9e8-744806100888	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cc645738-2185-4057-9500-bd2a753b3043	পীরগঞ্জ	পীরগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0b86e700-0eb6-4bae-8dbc-37497a669ec9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	Muktagacha	muktagacha	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
4080c2c5-4f31-47b4-a92c-1d84165990c2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	মুক্তাগাছা	মুক্তাগাছা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a29308bd-bd99-47cc-a3aa-2409fce55e71	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	Trishal	trishal	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
4bf5d5b0-0d03-4d9d-b607-1fc492a3e843	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	ত্রিশাল	ত্রিশাল	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9dbcc673-e172-45aa-82fc-91b831faaf8b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	Bhaluka	bhaluka	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
a788692f-5ac8-47ef-ad48-20c534d82c0d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	ভালুকা	ভালুকা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
1b2e8a74-46ee-4de2-84a9-b3431b62a56e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fea9e74e-92b2-44ba-be49-37a7343b169d	Cumilla Adarsha Sadar	cumilla adarsha sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3aecfcec-feaf-41be-94a5-e62ca9231c76	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fea9e74e-92b2-44ba-be49-37a7343b169d	কুমিল্লা আদর্শ সদর	কুমিল্লা আদর্শ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
20249b3c-5f06-415b-98ce-4fae1a403f35	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d5d71dd0-3c2f-4db9-a46f-e15310c877b4	Cumilla Sadar Dakshin	cumilla sadar dakshin	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
15db784c-af02-4aea-89bd-8a6f096c9aec	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d5d71dd0-3c2f-4db9-a46f-e15310c877b4	কুমিল্লা সদর দক্ষিণ	কুমিল্লা সদর দক্ষিণ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
510a9cec-c5bd-4753-8828-c6102960a650	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d5d71dd0-3c2f-4db9-a46f-e15310c877b4	sadar south	sadar south	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b9e20986-0442-4194-b83c-f6f02c968370	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fea9e74e-92b2-44ba-be49-37a7343b169d	Laksam	laksam	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
bd0dd217-9404-4f76-8a56-93de7716339e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fea9e74e-92b2-44ba-be49-37a7343b169d	লাকসাম	লাকসাম	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
83225ed3-826f-4a1f-8288-8e3d209f142e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fea9e74e-92b2-44ba-be49-37a7343b169d	Daudkandi	daudkandi	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
5b79db35-bca4-4170-aa54-95e57311be10	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fea9e74e-92b2-44ba-be49-37a7343b169d	দাউদকান্দি	দাউদকান্দি	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c3e19d4a-05b3-47af-b5ca-a88a3e727ed5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a26a2632-e6b2-4bff-8fe8-f67332c73a49	Bogura Sadar	bogura sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
a0271b9a-c7a9-4547-b4b4-3d8e6c2a6c07	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a26a2632-e6b2-4bff-8fe8-f67332c73a49	বগুড়া সদর	বগুড়া সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
bcbf4d85-8f2e-489a-8d01-4b1da7f0c048	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a26a2632-e6b2-4bff-8fe8-f67332c73a49	Shajahanpur	shajahanpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8dbcc227-64fe-4e20-be51-aca085ea97f6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a26a2632-e6b2-4bff-8fe8-f67332c73a49	শাজাহানপুর	শাজাহানপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a98c1c6f-eea6-4a5a-8ba1-6d33d9aaa65f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a26a2632-e6b2-4bff-8fe8-f67332c73a49	Sherpur	sherpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
32cbaea1-d4e7-4912-87d6-0648879fff7e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a26a2632-e6b2-4bff-8fe8-f67332c73a49	শেরপুর	শেরপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6882afac-af10-4278-a7b9-6cd8c511095c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	21556bc1-34c9-4c01-8479-469178a3d6a8	Cox's Bazar Sadar	cox s bazar sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
807c7e3a-d0c1-4d2a-8346-9d72a47e52a9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7e685835-f96a-45af-b3f1-27aa0e1f5084	Kuliarchar	kuliarchar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7276cab9-6fbb-4254-9203-4e108675b8d5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	21556bc1-34c9-4c01-8479-469178a3d6a8	কক্সবাজার সদর	কক্সবাজার সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
1e0851de-29b7-4af7-9c50-a1da40065bf9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	21556bc1-34c9-4c01-8479-469178a3d6a8	Teknaf	teknaf	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3e56412a-e7ae-47dc-92f2-02cf1407d39a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	21556bc1-34c9-4c01-8479-469178a3d6a8	টেকনাফ	টেকনাফ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e138e0f8-b614-45b3-b9ba-9eb95df2d12c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	21556bc1-34c9-4c01-8479-469178a3d6a8	Ramu	ramu	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d1dbbb9f-8ace-494e-99ee-b675de05d884	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	21556bc1-34c9-4c01-8479-469178a3d6a8	রামু	রামু	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
cf3ced3b-15b1-4cd4-ab3c-d3f26727775a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	21556bc1-34c9-4c01-8479-469178a3d6a8	Chakaria	chakaria	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
436a6fc5-f046-4070-80a5-ae6448c7724d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	21556bc1-34c9-4c01-8479-469178a3d6a8	চকোরিয়া	চকোরিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
5b5a539f-a321-49b2-a3d0-05f0fac6811c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	37e47064-a709-4827-a511-58b10aec2dc7	Jhikargachha	jhikargachha	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b4b970d1-a6b7-4899-9b69-2de94604907a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	37e47064-a709-4827-a511-58b10aec2dc7	ঝিকরগাছা	ঝিকরগাছা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
40a5d51b-0636-4fb6-bfa8-ebfd59b750e2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	37e47064-a709-4827-a511-58b10aec2dc7	Benapole	benapole	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
bdd2ddd0-a3cb-45e2-8df2-06b2fc6c16ff	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	37e47064-a709-4827-a511-58b10aec2dc7	বেনাপোল	বেনাপোল	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
570443f8-abf5-466d-9aca-2c8da788b701	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	eeeebdab-25f2-46ce-b544-938c3438bd80	Munshiganj Sadar	munshiganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
81f518c3-ea90-4bd5-8814-0efb44d18238	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	eeeebdab-25f2-46ce-b544-938c3438bd80	মুন্সীগঞ্জ সদর	মুন্সীগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c5d2ac06-164d-431a-a43f-ee86cce94652	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	eeeebdab-25f2-46ce-b544-938c3438bd80	Srinagar	srinagar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
4e358e2c-852f-49a1-af9b-e598074ce927	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	eeeebdab-25f2-46ce-b544-938c3438bd80	শ্রীনগর	শ্রীনগর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
641ed1b6-491a-46c3-bfcb-61aaddb36f61	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	eeeebdab-25f2-46ce-b544-938c3438bd80	Lohajang	lohajang	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
147c6617-dcb9-411c-95c3-baafbd8a5d6b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	eeeebdab-25f2-46ce-b544-938c3438bd80	লৌহজং	লৌহজং	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
189a5c10-fa01-4dad-8900-8c2be5bf8783	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	eeeebdab-25f2-46ce-b544-938c3438bd80	Gajaria	gajaria	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
386b365c-e609-4e12-a314-b430d43d5a39	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	eeeebdab-25f2-46ce-b544-938c3438bd80	গজারিয়া	গজারিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9deb6474-b23e-416c-ae15-f6790426c1f3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d841529-90e8-45b5-9afa-32d2e326b281	Manikganj Sadar	manikganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
86092d12-6182-4a50-a202-716cfb3357bd	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d841529-90e8-45b5-9afa-32d2e326b281	মানিকগঞ্জ সদর	মানিকগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
7db61c47-ad94-4ba4-ac5e-67c2968ac424	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d841529-90e8-45b5-9afa-32d2e326b281	Singair	singair	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
62238eb1-c917-4c98-b2ac-088bbcb5393b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d841529-90e8-45b5-9afa-32d2e326b281	সিংগাইর	সিংগাইর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
96bbf087-65c6-4c2a-87e6-fbc5af266f47	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d841529-90e8-45b5-9afa-32d2e326b281	Saturia	saturia	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
010b50c5-88bc-4da8-ae27-315891703d04	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d841529-90e8-45b5-9afa-32d2e326b281	সাটুরিয়া	সাটুরিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
3722e72b-bfcc-46c7-8a9b-fd3ea77958bb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	Narsingdi Sadar	narsingdi sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
339cb15c-7cb6-4ca7-945d-c0302c2d3a7a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	নরসিংদী সদর	নরসিংদী সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f1f28ea2-28de-4815-9a3b-064bdf742cf0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	Palash	palash	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
142d744e-72d1-4f77-afbf-bcf28a2f53dc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	পলাশ	পলাশ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
76461646-daaf-4bbf-b014-4dce334e895c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	Raipura	raipura	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
bee6f708-7d8a-4b8f-a9a4-12a3749c797a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	রায়পুরা	রায়পুরা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
afabdb2f-809e-4041-939c-a2c1b99ca5d8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3affb216-2d28-4d61-82b4-c1c9d03be816	Tangail Sadar	tangail sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
6a8cd25b-7c7a-45ef-b3b5-fa2beed03c70	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3affb216-2d28-4d61-82b4-c1c9d03be816	টাঙ্গাইল সদর	টাঙ্গাইল সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c311bda8-e0a6-4e37-90ab-6fcff0b46cce	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3affb216-2d28-4d61-82b4-c1c9d03be816	Mirzapur	mirzapur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
52dce723-f3b8-4f35-96c1-66a56aca5f5b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3affb216-2d28-4d61-82b4-c1c9d03be816	মির্জাপুর	মির্জাপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
dca5d8d5-4a0b-423a-9811-ab73b0983602	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3affb216-2d28-4d61-82b4-c1c9d03be816	Kalihati	kalihati	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
248fd3cf-ebfd-4634-96ac-a0e79d9e6799	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3affb216-2d28-4d61-82b4-c1c9d03be816	কালিহাতী	কালিহাতী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c9cad0d5-367d-4453-9cbf-2d97088d088c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3affb216-2d28-4d61-82b4-c1c9d03be816	Sakhipur	sakhipur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
fb5e924f-1991-46bc-88bb-76183e6d79a7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3affb216-2d28-4d61-82b4-c1c9d03be816	সখীপুর	সখীপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
58d821da-7fa0-452e-83a4-6c9837bb1fa6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7e685835-f96a-45af-b3f1-27aa0e1f5084	Kishoreganj Sadar	kishoreganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
0c8701a2-3c83-4984-86b7-2bef5c297045	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7e685835-f96a-45af-b3f1-27aa0e1f5084	কিশোরগঞ্জ সদর	কিশোরগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
b166d8e5-8fa2-4cfb-ab7d-4557b9cbb383	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7e685835-f96a-45af-b3f1-27aa0e1f5084	Bhairab	bhairab	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d9345b9b-6526-4670-9be3-cb1808d43dc6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7e685835-f96a-45af-b3f1-27aa0e1f5084	ভৈরব	ভৈরব	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
fe5e24ba-25f3-45ba-b48d-dcf09de5710b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7e685835-f96a-45af-b3f1-27aa0e1f5084	কুলিয়ারচর	কুলিয়ারচর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e697eddb-2c1a-42c2-b3cc-e5e78fbfb1f2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	Faridpur Sadar	faridpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3c46dcbe-9de2-43c6-9623-bb0ee69c651b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	ফরিদপুর সদর	ফরিদপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
26f46786-aa4e-4b97-aa12-77a721cb3d0f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	Bhanga	bhanga	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3ad4719e-68e5-4bab-aa56-ff58053d413a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	ভাঙ্গা	ভাঙ্গা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c81b46ba-e050-4e43-a933-90a55ffcd087	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	Alfadanga	alfadanga	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7c2ddd9a-3934-4462-9a5b-f5ec840510c7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	আলফাডাঙ্গা	আলফাডাঙ্গা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e63fb314-55de-4544-9021-a1a34bfdeb16	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	Gopalganj Sadar	gopalganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
de2ee864-b579-485f-8112-d198ea605f28	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	গোপালগঞ্জ সদর	গোপালগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
890fbc8d-c42b-4654-b928-9d377c85f9dc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	Tungipara	tungipara	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c431eff6-dafe-4197-a136-42333aee79f7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	টুঙ্গিপাড়া	টুঙ্গিপাড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
eca46cdb-5bb5-4d5e-ad5e-8c6d3d533c01	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	Kotalipara	kotalipara	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
eca5aa0e-d269-4b0a-8c6e-1279b6fcdf4e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	কোটালীপাড়া	কোটালীপাড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f6b4e030-3bc2-464a-9852-4c82b938d3b7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f9332172-7447-450d-987d-c849b5ae8e5b	Madaripur Sadar	madaripur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
67815af9-a312-4731-a9fc-b83c712eacb0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f9332172-7447-450d-987d-c849b5ae8e5b	মাদারীপুর সদর	মাদারীপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
1270b63a-cdfb-4ce2-96e5-558efbaa0774	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f9332172-7447-450d-987d-c849b5ae8e5b	Shibchar	shibchar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3859a4ce-d190-4ba6-8002-582d1a80e91e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f9332172-7447-450d-987d-c849b5ae8e5b	শিবচর	শিবচর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
aab0cb34-78e5-47d3-83ce-dcf4c13dacf1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f9332172-7447-450d-987d-c849b5ae8e5b	Kalkini	kalkini	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
1b2496e5-afcd-4342-b7f8-19cf9bfea556	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f9332172-7447-450d-987d-c849b5ae8e5b	কালকিনি	কালকিনি	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
12afd45e-ff10-488e-8789-cf7ce28d26ea	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	12cbb80c-f6a8-4df5-a815-9b06d991e233	Rajbari Sadar	rajbari sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c2de2192-3bf9-470d-ac3e-6ef68fe9d4fe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	12cbb80c-f6a8-4df5-a815-9b06d991e233	রাজবাড়ী সদর	রাজবাড়ী সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
460c30ac-6c0c-4874-91a1-02f1fc289e82	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	12cbb80c-f6a8-4df5-a815-9b06d991e233	Pangsha	pangsha	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
130d0734-50e9-4f9e-b698-4b64446c0edb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	12cbb80c-f6a8-4df5-a815-9b06d991e233	পাংশা	পাংশা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9eaf2b72-aa4b-42a2-a80f-3fa9749c7501	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	12cbb80c-f6a8-4df5-a815-9b06d991e233	Goalanda	goalanda	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
a75976d8-cbae-4bc8-94e8-6077cb80435c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	12cbb80c-f6a8-4df5-a815-9b06d991e233	গোয়ালন্দ	গোয়ালন্দ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
092421a0-0e47-4c74-8f1e-ac3d70653753	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	Shariatpur Sadar	shariatpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
a39b67fb-39ad-452b-8f6b-670bafd0bce0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	শরীয়তপুর সদর	শরীয়তপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
1753b0e4-c47e-4013-a07a-caa21a420f57	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	palong	palong	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7af57264-9f07-4ae8-bb7b-fd880905e637	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	Naria	naria	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
cdd8089d-f55d-4061-80b8-5872cb22a302	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	নড়িয়া	নড়িয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0477a67d-9c2e-4cf9-98c5-30b42c49c048	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	Zajira	zajira	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e352e24f-4349-4c67-b703-3850aad7ebf4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	জাজিরা	জাজিরা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
dae18cf0-5b5b-4c63-943e-c5f2bb29992f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	Noakhali Sadar	noakhali sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7a739b93-5ced-4b86-9ed8-d0e14632a5a8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	নোয়াখালী সদর	নোয়াখালী সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
727538a0-1235-4ae4-be24-51b2fb0d2aed	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	sudharam	sudharam	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
608df845-171a-4dbc-ad9c-aac1e8620d0f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	Begumganj	begumganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b934d3d7-6743-49b8-a6c4-99cb1c1fa1f6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	বেগমগঞ্জ	বেগমগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a8a673c8-6c05-4df6-80c6-685d4d6b6d24	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	Senbagh	senbagh	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
87a0b4a6-7ab7-4263-9a4a-a762fb0725c9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	সেনবাগ	সেনবাগ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
425d93d5-566b-4b65-9ce9-a92cd93c1361	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	Hatiya	hatiya	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c7688479-7440-4761-b556-76959b5798a2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	হাতিয়া	হাতিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a9f192dc-b5ef-4229-a845-8be428f63edb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	398507b3-880a-4968-aa70-0d515b8b505b	Feni Sadar	feni sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
ccb42e74-a90a-4d12-9866-3a0884be2ed4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	398507b3-880a-4968-aa70-0d515b8b505b	ফেনী সদর	ফেনী সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
50010b1f-7eeb-422b-b417-3c78429bca37	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	398507b3-880a-4968-aa70-0d515b8b505b	Daganbhuiyan	daganbhuiyan	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b1d43b8b-2164-4284-9e72-a31a6fec61d0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	398507b3-880a-4968-aa70-0d515b8b505b	দাগনভূঞা	দাগনভূঞা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a261a6a5-7ece-4be0-8d4c-3f6dbb990687	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	398507b3-880a-4968-aa70-0d515b8b505b	Sonagazi	sonagazi	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
69b61634-9823-444c-b41a-c75ab5c054e6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	398507b3-880a-4968-aa70-0d515b8b505b	সোনাগাজী	সোনাগাজী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
31e937b2-4dc6-47a2-8684-dd5395dd53e7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	Lakshmipur Sadar	lakshmipur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
2b39087a-9477-4c74-8a91-98e38cd257ad	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	লক্ষ্মীপুর সদর	লক্ষ্মীপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
83559cf0-add9-488a-b83b-c45dbc35895a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	Raipur	raipur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c4871d79-1b70-4649-9fc9-b107fa8b8182	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	রায়পুর	রায়পুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
3f17a5cd-d266-48f3-8f48-ef1642edb711	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	Ramganj	ramganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
660141c5-2ca5-496b-9f9f-6f1c1df5b007	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	রামগঞ্জ	রামগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
47a0d287-885f-45f0-9f20-c25ebb8fddc6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cddba755-8413-4e3e-8961-dc9fdef4f38d	Chandpur Sadar	chandpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
6c207fa9-908a-4d41-9c23-d25b724fdc97	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cddba755-8413-4e3e-8961-dc9fdef4f38d	চাঁদপুর সদর	চাঁদপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
4d5a3cd6-30b9-45c9-8a56-f83e83cbfe7a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cddba755-8413-4e3e-8961-dc9fdef4f38d	Hajiganj	hajiganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
cdb7da09-60f9-4aa9-896c-a3dc31b78831	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cddba755-8413-4e3e-8961-dc9fdef4f38d	হাজীগঞ্জ	হাজীগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e6cd8647-4e51-488d-85ed-a8796bd2deec	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cddba755-8413-4e3e-8961-dc9fdef4f38d	Matlab Dakshin	matlab dakshin	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
ed477fae-ac0c-4afa-8179-106137920009	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cddba755-8413-4e3e-8961-dc9fdef4f38d	মতলব দক্ষিণ	মতলব দক্ষিণ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f82c3758-c9a1-4c28-9490-55e279f94cd8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cddba755-8413-4e3e-8961-dc9fdef4f38d	matlab	matlab	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c014bc91-362a-4d15-b2bd-8ba63fb8208b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	cddba755-8413-4e3e-8961-dc9fdef4f38d	মতলব	মতলব	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
4d759a76-e1be-4f4b-9ead-fb0b96598127	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	Brahmanbaria Sadar	brahmanbaria sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
04fccffc-42b2-47e2-99dc-ae9804b7aa0a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	ব্রাহ্মণবাড়িয়া সদর	ব্রাহ্মণবাড়িয়া সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
aa8cf9cd-a51d-4240-a1f8-1301ae1c4392	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	Ashuganj	ashuganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
18d9d20b-f18f-4650-a41c-4a1c9782bebf	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	আশুগঞ্জ	আশুগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6fa8d6fc-e3b3-4d85-a774-c671972f1f72	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	Nabinagar	nabinagar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
752382f4-4658-481b-b8c4-172bd73d0364	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	নবীনগর	নবীনগর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6abccd70-11e3-4614-8111-ccff54c83820	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	Khagrachhari Sadar	khagrachhari sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
48130b39-e599-46dd-ab4e-de183dff85c3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	খাগড়াছড়ি সদর	খাগড়াছড়ি সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
5fe201eb-d60b-4e04-8876-32f6c4c32a50	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	Dighinala	dighinala	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
fc06ab6f-99eb-404b-98c8-54adf2908121	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	দীঘিনালা	দীঘিনালা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
79fb9bd9-e2b2-4dd4-ba7e-adc9d2e1c3d3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	Matiranga	matiranga	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
720a1ec1-e67b-4c59-b112-d57a76231dda	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	মাটিরাঙ্গা	মাটিরাঙ্গা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c9c46989-b557-46cd-9774-0f4f2285f407	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	799329f2-bcfd-4262-ac22-bc32971b7ac1	Rangamati Sadar	rangamati sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
522769ef-05e1-4cf6-95e1-0f6965ecb3a2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	799329f2-bcfd-4262-ac22-bc32971b7ac1	রাঙ্গামাটি সদর	রাঙ্গামাটি সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
d2f8986c-82a8-47eb-a83d-c9ccc76f1fe6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	799329f2-bcfd-4262-ac22-bc32971b7ac1	Kaptai	kaptai	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e3a9a973-57ec-4590-920a-b407603a502e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	799329f2-bcfd-4262-ac22-bc32971b7ac1	কাপ্তাই	কাপ্তাই	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
09e14bfa-4780-46ed-b3d4-d1dfbc18bb12	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	799329f2-bcfd-4262-ac22-bc32971b7ac1	Baghaichhari	baghaichhari	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
59f512b9-355d-4d11-995d-fc0de6d0a9c5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	799329f2-bcfd-4262-ac22-bc32971b7ac1	বাঘাইছড়ি	বাঘাইছড়ি	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
cff4c20d-32de-4416-ba3b-799c815d8620	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	Bandarban Sadar	bandarban sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
faed7c00-2560-49f4-a310-c4ab97b72aba	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	বান্দরবান সদর	বান্দরবান সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
092b23a0-9173-4b2f-9a86-c59d16f72b90	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	Lama	lama	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
782be653-6866-487c-8954-36d9cf1cd138	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	লামা	লামা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c740905c-8325-479d-9ddf-dc94319ece35	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	Alikadam	alikadam	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
57c1a147-a57d-42cd-9d5b-2e607619046c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	আলীকদম	আলীকদম	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
279a2344-e103-4bcf-a0a4-17d99a46a7bc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93a865dd-5097-4db1-9692-f8cee696b7ca	Pabna Sadar	pabna sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e06275eb-65c5-4ed9-b092-1fccba35b7ff	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93a865dd-5097-4db1-9692-f8cee696b7ca	পাবনা সদর	পাবনা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
5e34df5d-2a8c-4f43-99b9-64ea2d3556d0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93a865dd-5097-4db1-9692-f8cee696b7ca	Ishwardi	ishwardi	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
29964490-f045-4b4c-996d-e527b86943f2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93a865dd-5097-4db1-9692-f8cee696b7ca	ঈশ্বরদী	ঈশ্বরদী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
36f81b31-4d8b-4054-bbab-5094e16e26ba	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93a865dd-5097-4db1-9692-f8cee696b7ca	Bera	bera	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e62e6819-a3e3-47d7-807c-a555bcf81bd1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	93a865dd-5097-4db1-9692-f8cee696b7ca	বেড়া	বেড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
08c0612b-dd88-4343-813c-b27e77e9272a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d91c986-0ec2-47cf-9345-13ac0419e3b5	Natore Sadar	natore sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
98a90a44-c0f1-46ab-9b72-06e2375e3de6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d91c986-0ec2-47cf-9345-13ac0419e3b5	নাটোর সদর	নাটোর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c15fd90f-3414-40b4-a6f8-75b19b1f7bb4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d91c986-0ec2-47cf-9345-13ac0419e3b5	Singra	singra	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
78c309c9-4f29-40d1-baa6-cc5a762e8d7e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d91c986-0ec2-47cf-9345-13ac0419e3b5	সিংড়া	সিংড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0c7ff464-e7e5-4b0d-baf9-405e3b447a65	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d91c986-0ec2-47cf-9345-13ac0419e3b5	Baraigram	baraigram	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
c5950526-ebf6-4871-a2a9-6a1224fff181	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2d91c986-0ec2-47cf-9345-13ac0419e3b5	বড়াইগ্রাম	বড়াইগ্রাম	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c75a09b6-e771-4a12-8534-6b3419ed6647	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	Naogaon Sadar	naogaon sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8826fa41-e685-468e-ad84-39b628f7a2b7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	নওগাঁ সদর	নওগাঁ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c3a5cd3f-ea07-411a-a552-449e0033bbec	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	Manda	manda	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b58afa9f-5ce5-4f6b-9caa-ae4cf86aaf8e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	মান্দা	মান্দা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6a440960-a440-4e09-91b0-8042b61364c3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	Sapahar	sapahar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
59e585e4-9b71-4d7e-b30a-bcb938b226f9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	সাপাহার	সাপাহার	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a8a7e7ce-9c2a-46aa-91f5-4d8ef7c1f6fe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	Chapai Nawabganj Sadar	chapai nawabganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
32dc6723-13db-4b20-8eeb-303a3552cf42	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	চাঁপাইনবাবগঞ্জ সদর	চাঁপাইনবাবগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
10316145-55a2-4263-a8a0-ebc507c4ae91	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	Shibganj	shibganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
fbc9b04c-5ba3-4991-ab03-36dff2c05111	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	শিবগঞ্জ	শিবগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
ea9a953f-d0f8-4754-8e7b-51ff8c9d784a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	Gomastapur	gomastapur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7fb1b71e-61a5-4daf-b46d-b107ccbcad01	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	গোমস্তাপুর	গোমস্তাপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
bce962d5-bf41-463b-a33a-978a879f183f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d361886e-886a-4ac1-aa62-3a03bb1be9d8	Sirajganj Sadar	sirajganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d5939e18-f068-4ef2-a2cb-cdbe2443cff6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d361886e-886a-4ac1-aa62-3a03bb1be9d8	সিরাজগঞ্জ সদর	সিরাজগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e84b6dc3-623d-450e-9266-957ddfded671	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d361886e-886a-4ac1-aa62-3a03bb1be9d8	Shahjadpur	shahjadpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
bfd2d40e-3ce9-4c8d-8b99-09289cecde71	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d361886e-886a-4ac1-aa62-3a03bb1be9d8	শাহজাদপুর	শাহজাদপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
fc559a97-ae91-448f-9ae8-f389981cb4c2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d361886e-886a-4ac1-aa62-3a03bb1be9d8	Ullapara	ullapara	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
53434ae7-e80a-4a0e-a8bb-cb909183ef83	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	d361886e-886a-4ac1-aa62-3a03bb1be9d8	উল্লাপাড়া	উল্লাপাড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
ba0dca21-ed9f-4a1a-858c-dd476e6cbef2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3bc060c0-b52c-49fb-8631-d54450363041	Joypurhat Sadar	joypurhat sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
5d2e10ae-9abc-48d3-999a-1f0a1adcbf1c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3bc060c0-b52c-49fb-8631-d54450363041	জয়পুরহাট সদর	জয়পুরহাট সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0dcabded-64e7-426e-9424-aea493ff8d1c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3bc060c0-b52c-49fb-8631-d54450363041	Akkelpur	akkelpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
44821716-07d2-4267-8ee6-ca9dd6a58f9e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3bc060c0-b52c-49fb-8631-d54450363041	আক্কেলপুর	আক্কেলপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
776137c6-1fb7-4a6e-9425-b43e04ade3de	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3bc060c0-b52c-49fb-8631-d54450363041	Panchbibi	panchbibi	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
aa08060b-efc0-469e-9883-dcfc3a8ca02e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3bc060c0-b52c-49fb-8631-d54450363041	পাঁচবিবি	পাঁচবিবি	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
2f68e76a-6285-43aa-9850-9f92ab50fb1c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	31942bcd-34c5-4d34-87ce-ac399a67065e	Satkhira Sadar	satkhira sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
1b7cf22b-00e0-4098-a374-ce69634e5c67	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	31942bcd-34c5-4d34-87ce-ac399a67065e	সাতক্ষীরা সদর	সাতক্ষীরা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9cf2af90-82b5-451c-99d5-dabfa5220a2f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	31942bcd-34c5-4d34-87ce-ac399a67065e	Kalaroa	kalaroa	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d6a570bf-86b2-486c-a476-da390dc8e426	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	31942bcd-34c5-4d34-87ce-ac399a67065e	কলারোয়া	কলারোয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e0bee17a-33ae-4861-b32b-66eabed76557	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	31942bcd-34c5-4d34-87ce-ac399a67065e	Tala	tala	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
6179c489-c37a-4cbe-b045-83eaf39e2057	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	31942bcd-34c5-4d34-87ce-ac399a67065e	তালা	তালা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
af2ff605-a300-4101-babe-f0b00515bf36	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4d8a938d-b0fa-475b-ac82-3f6d323516f1	Bagerhat Sadar	bagerhat sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
6df9c362-b5b0-4fd0-a143-78b3ede96a15	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4d8a938d-b0fa-475b-ac82-3f6d323516f1	বাগেরহাট সদর	বাগেরহাট সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f3c04fa9-d20d-4b81-96b1-ee908922b874	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4d8a938d-b0fa-475b-ac82-3f6d323516f1	Mongla	mongla	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
64b0268d-e54b-4190-adcd-adbea6fb36f6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4d8a938d-b0fa-475b-ac82-3f6d323516f1	মোংলা	মোংলা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
84ec0a6c-aad0-4665-9d59-4b8f6677177e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4d8a938d-b0fa-475b-ac82-3f6d323516f1	Morrelganj	morrelganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
0924986c-b656-4557-9d44-6dc2289add0d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4d8a938d-b0fa-475b-ac82-3f6d323516f1	মোড়েলগঞ্জ	মোড়েলগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a120499a-3844-4e70-9276-a9311440ac07	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9d6d4592-6300-44bd-9417-4de213c18a82	Kushtia Sadar	kushtia sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
1d4f469e-967a-4bfd-b3b7-73771a944006	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9d6d4592-6300-44bd-9417-4de213c18a82	কুষ্টিয়া সদর	কুষ্টিয়া সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f0c8c67a-2f5d-4a19-b548-7b70a1ff60fa	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9d6d4592-6300-44bd-9417-4de213c18a82	Bheramara	bheramara	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3a4078ed-c0f1-4291-99a1-3af63f84c60b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9d6d4592-6300-44bd-9417-4de213c18a82	ভেড়ামারা	ভেড়ামারা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
cb82bb42-0a66-47bb-ba4e-737fe2eb2b83	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9d6d4592-6300-44bd-9417-4de213c18a82	Kumarkhali	kumarkhali	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
887743c1-29c9-4111-b87d-aac80d68fadc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9d6d4592-6300-44bd-9417-4de213c18a82	কুমারখালী	কুমারখালী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
5d344a0e-f100-466d-8e3f-e4829d08b812	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	65b9be11-ba52-4d61-9ecd-272daa645fb5	Jhenaidah Sadar	jhenaidah sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e9f36d4a-875b-4ed2-bafd-1912413a070e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	65b9be11-ba52-4d61-9ecd-272daa645fb5	ঝিনাইদহ সদর	ঝিনাইদহ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
9a2a9b0a-0f0c-4974-9fa8-a0f7475e67e5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	65b9be11-ba52-4d61-9ecd-272daa645fb5	Shailkupa	shailkupa	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
859ac695-25b6-4764-b391-1a6fc230d7b5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	65b9be11-ba52-4d61-9ecd-272daa645fb5	শৈলকুপা	শৈলকুপা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f93ec57f-991e-4929-af16-322e53b197e6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	65b9be11-ba52-4d61-9ecd-272daa645fb5	Kaliganj	kaliganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b1f295bb-1f74-439c-93b9-2ff25f58c46f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	65b9be11-ba52-4d61-9ecd-272daa645fb5	কালীগঞ্জ	কালীগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6101d059-7511-4fc7-93fe-2f0b5e7c498c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9e4d49f5-b61b-4ee0-853f-6a243cd5699a	Magura Sadar	magura sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
04d8ca9e-41d1-42c9-9292-287573dccf45	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9e4d49f5-b61b-4ee0-853f-6a243cd5699a	মাগুরা সদর	মাগুরা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
cb8fca50-97c5-4043-a3c6-9e63a9b0cdf3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	9e4d49f5-b61b-4ee0-853f-6a243cd5699a	মহম্মদপুর	মহম্মদপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
14e2690e-7397-40a3-a3e7-81610f80ad38	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	Narail Sadar	narail sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
fc5557d4-9148-4784-8d9a-e202c97faa67	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	নড়াইল সদর	নড়াইল সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
89478606-d7bd-4506-b0b0-3400a62545fe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	Lohagara	lohagara	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
785f144f-7ed4-4a8e-88e3-e23d73985be8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	লোহাগড়া	লোহাগড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
b909dc26-b834-4a2e-a96f-743864e46271	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	Kalia	kalia	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
37199c0c-5e22-405e-b3e6-343311133565	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	কালিয়া	কালিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
8ccc51ad-e032-4557-aa1b-968f654edae8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	Meherpur Sadar	meherpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
34be1109-ca9e-452b-ade8-02b472240aac	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	মেহেরপুর সদর	মেহেরপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
20c436c3-733c-47d1-9c5b-6be516a5acc6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	Gangni	gangni	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
f44ed462-2203-4840-9bc5-620a8a1d20d5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	গাংনী	গাংনী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
5138c1e4-fbf8-4bb2-a35b-d060a88a62ca	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	Mujibnagar	mujibnagar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
047e0cf6-4a18-412c-822a-1bcd9a29783e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	মুজিবনগর	মুজিবনগর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
fc0587c6-fe1c-4ed6-b966-ea13e344555e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b99d4225-b6a0-403e-b138-84e734975ea7	Chuadanga Sadar	chuadanga sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
a459c0ca-3967-4c8d-acd3-db0ee2b9a0f8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b99d4225-b6a0-403e-b138-84e734975ea7	চুয়াডাঙ্গা সদর	চুয়াডাঙ্গা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6a28477d-a9d0-45cc-93c1-70c2a29d3598	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b99d4225-b6a0-403e-b138-84e734975ea7	Alamdanga	alamdanga	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
14c3d97a-d031-46c3-bbcc-422e2be4afd3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b99d4225-b6a0-403e-b138-84e734975ea7	আলমডাঙ্গা	আলমডাঙ্গা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
3c15c04c-349e-44b0-85a1-cfa0e56742a2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b99d4225-b6a0-403e-b138-84e734975ea7	Damurhuda	damurhuda	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
22f31d5c-2d5b-4343-aabd-3b330dd4f4dc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b99d4225-b6a0-403e-b138-84e734975ea7	দামুড়হুদা	দামুড়হুদা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
ef7d8a21-8a5a-4c23-86f9-4142fc1ea5ab	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	Bhola Sadar	bhola sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
fcd90cd1-c421-4600-95e7-6e800f85bb2e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	ভোলা সদর	ভোলা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
d2bc9eb7-a4d2-42f6-bb90-9a68aa3da450	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	Char Fasson	char fasson	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
2a975473-4790-4834-aa6c-a9a5d2f3f9a1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	চরফ্যাশন	চরফ্যাশন	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
8bed5b5b-a631-48f1-b99a-54709725650b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	charfasson	charfasson	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b0d53989-88f0-4adb-ab57-0e29d238e05d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	Lalmohan	lalmohan	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
2176feee-e758-4e23-97ff-172ce6721a02	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	লালমোহন	লালমোহন	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
d171cc91-67a9-4747-aa6f-58d35c83a3a0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	Borhanuddin	borhanuddin	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8358924a-b851-4176-9111-630085f9400a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	8b41bdf4-1cba-451f-a25d-62e99b9af88d	বোরহানউদ্দিন	বোরহানউদ্দিন	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
8a554b64-3432-485b-ad5f-79f6d9d1e463	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	Patuakhali Sadar	patuakhali sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8ef7f805-678d-46be-90c7-b35b5216610e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	পটুয়াখালী সদর	পটুয়াখালী সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
ca86f9b4-1845-45f7-bbc4-0058dce1dcec	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	Kalapara	kalapara	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
782c66f5-54fb-46c6-b834-5f6a09146f6c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	কলাপাড়া	কলাপাড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
934d9eef-c2c4-4aac-9588-8ccfd642e1f3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	kuakata	kuakata	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
19af8d91-1921-4de8-8335-f23cd34be868	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	কুয়াকাটা	কুয়াকাটা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
54df0cdc-edfa-43ec-8f8f-7ea3cfb1be8e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	Galachipa	galachipa	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d7d5a363-5128-4696-be65-07963c5190aa	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	গলাচিপা	গলাচিপা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
1c6759f1-b94e-490c-b57e-7fc4cbc3e7fe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	23897e3b-5f63-4161-aca6-ffb21181e901	Pirojpur Sadar	pirojpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
19556c1e-f590-4678-86e1-b09542efceca	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	23897e3b-5f63-4161-aca6-ffb21181e901	পিরোজপুর সদর	পিরোজপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
2c842eeb-987b-4744-a296-88b49c72f644	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	23897e3b-5f63-4161-aca6-ffb21181e901	Mathbaria	mathbaria	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
9a11c441-71d3-4d7a-b017-e66d347c223b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	23897e3b-5f63-4161-aca6-ffb21181e901	মঠবাড়িয়া	মঠবাড়িয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
28c01702-f6f9-4136-99bb-638f3e90e731	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	23897e3b-5f63-4161-aca6-ffb21181e901	Bhandaria	bhandaria	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
733b70a9-c15c-4ffd-821a-a341b761dd4b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	23897e3b-5f63-4161-aca6-ffb21181e901	ভান্ডারিয়া	ভান্ডারিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
dc2c5689-b6bf-46df-8115-a33ebaee379c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	03fa0d8a-a7e9-40aa-9152-b31a22192497	Barguna Sadar	barguna sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
2b11441f-37c2-4be1-aa7b-085c75b1181f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	03fa0d8a-a7e9-40aa-9152-b31a22192497	বরগুনা সদর	বরগুনা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
02344c4b-16a3-4834-94da-4882f683bb4c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	03fa0d8a-a7e9-40aa-9152-b31a22192497	Amtali	amtali	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d3571637-c348-4bfc-91b4-adcb9bdfb438	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	03fa0d8a-a7e9-40aa-9152-b31a22192497	আমতলী	আমতলী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
91af085b-2daa-4ead-b832-934a2d9dacaf	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	03fa0d8a-a7e9-40aa-9152-b31a22192497	Patharghata	patharghata	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
adebcbcc-0742-44ab-a0fe-d2622ba59f0f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	03fa0d8a-a7e9-40aa-9152-b31a22192497	পাথরঘাটা	পাথরঘাটা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
18f059e1-fbee-4719-bd13-2f5de502af42	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ef5f135a-d519-420c-a78d-bb9f25faffdb	Jhalokati Sadar	jhalokati sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e8a82e5a-44e8-4a4f-95b7-00aee0ba0b88	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ef5f135a-d519-420c-a78d-bb9f25faffdb	ঝালকাঠি সদর	ঝালকাঠি সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f042606d-9eea-4886-b915-15af7aa15109	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ef5f135a-d519-420c-a78d-bb9f25faffdb	Nalchity	nalchity	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
f19d68ab-5e6f-4f61-b83a-d81b5e983e0f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ef5f135a-d519-420c-a78d-bb9f25faffdb	নলছিটি	নলছিটি	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a8c10e33-8e55-4f6b-bbb5-67e272e4b5de	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ef5f135a-d519-420c-a78d-bb9f25faffdb	Rajapur	rajapur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
56d8c534-e57f-4df2-963e-9db530a0c7ca	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	ef5f135a-d519-420c-a78d-bb9f25faffdb	রাজাপুর	রাজাপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
20894876-eb13-44fd-bb49-d60b403298bf	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2b89df30-5a4f-4753-9946-f9b65c2311e6	Moulvibazar Sadar	moulvibazar sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7b2eb2c2-0a65-4ed0-86ba-1c895afef2e7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2b89df30-5a4f-4753-9946-f9b65c2311e6	মৌলভীবাজার সদর	মৌলভীবাজার সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
c9ce958c-da2e-4098-a33e-2a932022045c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2b89df30-5a4f-4753-9946-f9b65c2311e6	Sreemangal	sreemangal	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
462eb62a-2c51-443e-9648-be57cd0a8786	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2b89df30-5a4f-4753-9946-f9b65c2311e6	শ্রীমঙ্গল	শ্রীমঙ্গল	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f58df424-4cca-4114-89cf-74caa6cc976a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2b89df30-5a4f-4753-9946-f9b65c2311e6	srimangal	srimangal	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
1bf10d43-7799-48ba-8a4c-e488baa272e1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2b89df30-5a4f-4753-9946-f9b65c2311e6	Kulaura	kulaura	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e8b46a7d-61db-4411-8238-48e6c4d9b70a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	2b89df30-5a4f-4753-9946-f9b65c2311e6	কুলাউড়া	কুলাউড়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
354212ce-8f36-403f-a407-ee5214efa711	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	34c73b14-00a1-4bbc-9155-b63041f52855	Habiganj Sadar	habiganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
4ab53b38-cbb6-4beb-b8f2-1c4b7496b45d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	34c73b14-00a1-4bbc-9155-b63041f52855	হবিগঞ্জ সদর	হবিগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
14dbb346-c346-42b6-9877-ee5de40c7529	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	34c73b14-00a1-4bbc-9155-b63041f52855	Madhabpur	madhabpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
5f1ee56a-97e7-4519-a9bb-7f3df5c13f51	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	34c73b14-00a1-4bbc-9155-b63041f52855	মাধবপুর	মাধবপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
897e3ffd-400d-482b-872e-68995c6d72f9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	34c73b14-00a1-4bbc-9155-b63041f52855	Chunarughat	chunarughat	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
73326da8-1131-4fcf-ab2e-5723b6ad4f2e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	34c73b14-00a1-4bbc-9155-b63041f52855	চুনারুঘাট	চুনারুঘাট	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
cf40f66c-9012-40a3-bfb4-e12727b3351e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6aab33a2-3888-438c-90b3-e7755f8609c5	Sunamganj Sadar	sunamganj sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d938f519-0744-4ce3-b38c-26b3c974411a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6aab33a2-3888-438c-90b3-e7755f8609c5	সুনামগঞ্জ সদর	সুনামগঞ্জ সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a426d133-f822-44d5-a875-528fd46aac3b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6aab33a2-3888-438c-90b3-e7755f8609c5	Chhatak	chhatak	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
12beda34-3484-444d-838b-b814f41d5340	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6aab33a2-3888-438c-90b3-e7755f8609c5	ছাতক	ছাতক	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a87de60b-1116-45c8-a235-e1303ed26a9e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6aab33a2-3888-438c-90b3-e7755f8609c5	Jagannathpur	jagannathpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
846e9267-decd-4603-b772-646eb90ae82f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	6aab33a2-3888-438c-90b3-e7755f8609c5	জগন্নাথপুর	জগন্নাথপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
6d81204e-44eb-4612-bc53-96769859c596	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b28e59e6-7e07-415c-9062-65cf37a2f3ad	Dinajpur Sadar	dinajpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
6b8a54ac-88a2-4885-b3f5-0f9c6174b6db	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b28e59e6-7e07-415c-9062-65cf37a2f3ad	দিনাজপুর সদর	দিনাজপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
1a6b625c-2cc3-4603-87e5-563a45735d7a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b28e59e6-7e07-415c-9062-65cf37a2f3ad	Birampur	birampur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
ab18b0df-4d20-47a8-b07a-3a4195fd81fe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b28e59e6-7e07-415c-9062-65cf37a2f3ad	বিরামপুর	বিরামপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
da9dc2cb-c705-47c9-ba8c-3476e9295bf6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b28e59e6-7e07-415c-9062-65cf37a2f3ad	Phulbari	phulbari	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8597b8fc-b741-4ced-aa19-86cd31d8ad29	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	b28e59e6-7e07-415c-9062-65cf37a2f3ad	ফুলবাড়ী	ফুলবাড়ী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
3d67d5be-bbcb-4fc9-ba74-5bbdc42663d3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4309fb15-1262-4fed-8877-c599278a2441	Kurigram Sadar	kurigram sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
96ba6939-e88f-43db-939c-12c45cc5babe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4309fb15-1262-4fed-8877-c599278a2441	কুড়িগ্রাম সদর	কুড়িগ্রাম সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
4107f874-ad00-4e54-97f2-45272c5533f4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4309fb15-1262-4fed-8877-c599278a2441	Ulipur	ulipur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
ce6c878c-0241-48d4-aa20-1fd267242319	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4309fb15-1262-4fed-8877-c599278a2441	উলিপুর	উলিপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
02adca6f-80a4-4273-aa81-e3c26d269d7d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4309fb15-1262-4fed-8877-c599278a2441	Nageshwari	nageshwari	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3350908b-5a78-4e93-8b15-2ff02a4ab329	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4309fb15-1262-4fed-8877-c599278a2441	নাগেশ্বরী	নাগেশ্বরী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
43365152-473d-4777-ba32-10ca469c03d7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e0b7e5e8-5d93-492d-976c-076c102511e0	Lalmonirhat Sadar	lalmonirhat sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d1e7f11c-8093-4d36-ada9-1589e7e6020e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e0b7e5e8-5d93-492d-976c-076c102511e0	লালমনিরহাট সদর	লালমনিরহাট সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
b217a3ee-2aff-4ac4-a8f0-0aed6e3dcd85	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e0b7e5e8-5d93-492d-976c-076c102511e0	Patgram	patgram	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
81c43f9a-483c-48fb-9c29-2c147c80e9dd	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e0b7e5e8-5d93-492d-976c-076c102511e0	পাটগ্রাম	পাটগ্রাম	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
7f914efc-1435-44f8-ac12-fa23b5649cc5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e0b7e5e8-5d93-492d-976c-076c102511e0	Hatibandha	hatibandha	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
09d1cf30-14fa-473f-9a2d-154884fadf5e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e0b7e5e8-5d93-492d-976c-076c102511e0	হাতীবান্ধা	হাতীবান্ধা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f88b2e15-1ff0-4d02-89c4-c7d8c5fd2824	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	Gaibandha Sadar	gaibandha sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
f9b8b3b6-cfa0-4701-bf8e-f59b875453ae	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	গাইবান্ধা সদর	গাইবান্ধা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
10a50f2a-4906-45d8-be7c-60449cadc372	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	Gobindaganj	gobindaganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
90e267bf-8571-4c77-bb3b-46aa4b2e2b58	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	গোবিন্দগঞ্জ	গোবিন্দগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f15cdd72-e3a8-4b76-8720-6b954a7781c2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	Sundarganj	sundarganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
8947e207-b160-4f67-a874-772c43937c07	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	সুন্দরগঞ্জ	সুন্দরগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
63a89923-93ad-4796-9744-e7b02ebd00d8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4eb6019a-63ad-4425-9097-700662e08aa4	Nilphamari Sadar	nilphamari sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
77897af9-6393-47ac-948f-6ed197676c54	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4eb6019a-63ad-4425-9097-700662e08aa4	নীলফামারী সদর	নীলফামারী সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f518c578-65af-400c-ab9d-45f1925e2b6a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4eb6019a-63ad-4425-9097-700662e08aa4	Saidpur	saidpur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
07315378-593a-4778-8ecd-03c8a3d8ecf4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4eb6019a-63ad-4425-9097-700662e08aa4	সৈয়দপুর	সৈয়দপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
8dbe86f7-7603-433a-b0d9-6955c2a63d89	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4eb6019a-63ad-4425-9097-700662e08aa4	Domar	domar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
329c3599-202c-4fdc-bd0e-87465d34d3a2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	4eb6019a-63ad-4425-9097-700662e08aa4	ডোমার	ডোমার	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f8b6d7a9-9171-4e15-a098-572762ab57b0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f650439e-97d0-4cd0-97d0-2c8a46c49b32	Thakurgaon Sadar	thakurgaon sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b7b2aa52-65ae-4fba-9639-55b5c66f964a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f650439e-97d0-4cd0-97d0-2c8a46c49b32	ঠাকুরগাঁও সদর	ঠাকুরগাঁও সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
77cc19ed-e954-481e-83ef-5b9fbca861f1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f650439e-97d0-4cd0-97d0-2c8a46c49b32	Ranisankail	ranisankail	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
66126ab9-0082-47d7-b57c-0eeb9995590b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	f650439e-97d0-4cd0-97d0-2c8a46c49b32	রাণীশংকৈল	রাণীশংকৈল	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
573b5e44-558b-416d-bb93-c21b11c9788c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Panchagarh Sadar	panchagarh sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
d3c84616-1c87-4b42-a26e-937077750a88	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	পঞ্চগড় সদর	পঞ্চগড় সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
7700ff89-505c-4e9e-bb62-4c8871bfc987	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Debiganj	debiganj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
75a6ab2e-7b5c-4605-9884-44d77595e9c1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	দেবীগঞ্জ	দেবীগঞ্জ	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
a19e44e8-fffd-4677-9d47-95f0caaf8296	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	debijanj	debijanj	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
187b2023-5735-4c43-91db-9770e8bb69d6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Boda	boda	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
e81fd3c8-5367-4c77-b65e-903263cdad6c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	বোদা	বোদা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
0e824fbb-ae39-4175-b961-0ae1a6e2483a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Tetulia	tetulia	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
20278552-bb67-4aba-a8f8-5105c829a8f3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	তেঁতুলিয়া	তেঁতুলিয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
fb424a5f-e637-4213-8a2c-d210cf133d5a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Atwari	atwari	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
3f640917-5e72-42f5-ae2c-0cbdf1834c1d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	7c56a91a-f23a-49dd-ae22-ba8cd866947f	আটোয়ারী	আটোয়ারী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
def57578-e9e5-44d5-b062-c1d20d8de08e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1bae3279-070c-4ffc-a294-2af6a01630c5	Jamalpur Sadar	jamalpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
bddcfea2-2e13-445f-a7ec-7464754dc794	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1bae3279-070c-4ffc-a294-2af6a01630c5	জামালপুর সদর	জামালপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
332cfc30-9d0b-49cd-8cd5-32ddbe513717	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1bae3279-070c-4ffc-a294-2af6a01630c5	Islampur	islampur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
43e3629e-ded9-477d-ba0d-7ec8e59445f5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1bae3279-070c-4ffc-a294-2af6a01630c5	ইসলামপুর	ইসলামপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
e5a61517-ec0f-4a79-9c53-03b851167138	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1bae3279-070c-4ffc-a294-2af6a01630c5	Sarishabari	sarishabari	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
ea5ea83f-2c4f-40af-9476-1220dbf53a8b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	1bae3279-070c-4ffc-a294-2af6a01630c5	সরিষাবাড়ী	সরিষাবাড়ী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
ba055f14-846d-4f52-bc04-40867929a7a1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	60e5f082-3a45-40f5-b408-bd0d9058838f	Netrokona Sadar	netrokona sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
079797a2-3662-48ab-8732-f8ce8457a531	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	60e5f082-3a45-40f5-b408-bd0d9058838f	নেত্রকোণা সদর	নেত্রকোণা সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
2eeedb07-f7ab-43b4-ac0f-bcdbb7a1effa	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	60e5f082-3a45-40f5-b408-bd0d9058838f	Kendua	kendua	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
9abb8b3c-5ebd-4eec-8deb-29e63d087f14	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	60e5f082-3a45-40f5-b408-bd0d9058838f	কেন্দুয়া	কেন্দুয়া	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f103d8aa-c373-4c66-a4af-b6b6066d8662	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	60e5f082-3a45-40f5-b408-bd0d9058838f	Durgapur	durgapur	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
7e19f149-19fa-44c3-bcee-b61754d1911d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	60e5f082-3a45-40f5-b408-bd0d9058838f	দুর্গাপুর	দুর্গাপুর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
f86450fb-1973-4cf2-aa04-4e3380395818	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df1f4ec8-e2af-444a-be21-610084d7e9cc	Sherpur Sadar	sherpur sadar	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
b40666c3-6f8c-4b79-be65-f8e443639388	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df1f4ec8-e2af-444a-be21-610084d7e9cc	শেরপুর সদর	শেরপুর সদর	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
695ee3c1-311f-4414-a49f-06f1d8c2147f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df1f4ec8-e2af-444a-be21-610084d7e9cc	Nakla	nakla	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
ac08bce3-1c21-4eff-b41b-6e3e3b588f01	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df1f4ec8-e2af-444a-be21-610084d7e9cc	নকলা	নকলা	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
349aa843-a138-449e-ba6e-415598ec4dcc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df1f4ec8-e2af-444a-be21-610084d7e9cc	Nalitabari	nalitabari	en	common_usage	BBS administrative hierarchy (compiled sadar reference)
890fbe4a-d1c3-42f5-a402-de31d9bb4d36	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	df1f4ec8-e2af-444a-be21-610084d7e9cc	নালিতাবাড়ী	নালিতাবাড়ী	bn	common_usage	BBS administrative hierarchy (compiled sadar reference)
\.


--
-- Data for Name: address_confirmations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address_confirmations (id, "createdAt", "updatedAt", parse_id, parcel_id, confirmed_by, confirmation_source, structure, candidate_index, reason) FROM stdin;
\.


--
-- Data for Name: address_parses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address_parses (id, "createdAt", "updatedAt", parcel_id, original_address, normalized_address, normalized_hash, structured, confidence, matched_by, has_conflict, conflict_detail, candidates, parser_version, dataset_version, language) FROM stdin;
a929fa64-0a6e-4fce-bf6a-c0c9a27ab78c	2026-10-10 17:24:10.61064+06	2026-10-10 17:24:10.61064+06	4b73ac51-38c2-4c60-8db8-eb8a052166ef	House 12, Road 5, Dhanmondi BACKMV2B3Q9J7KZ9	house 12 road 5 dhanmondi backmv2b3q9j7kz9	a28baae53256a462ee95e4e1ef3cc22c2fe7349dbfd9f7ac7cda85ff85a887bf	{"area": "Road 5, Dhanmondi BACKMV2B3Q9J7KZ9", "flat": null, "road": "5", "ward": null, "house": "12", "thana": "Dhanmondi", "union": null, "upazila": "Dhanmondi", "village": null, "building": null, "district": "Dhaka", "division": "Dhaka", "landmark": null, "postalCode": "1205", "municipality": null, "cityCorporation": null}	0.65	ALIAS	f	\N	[{"thana": "Dhanmondi", "placeId": null, "upazila": "Dhanmondi", "district": "Dhaka", "division": "Dhaka", "matchedBy": "ALIAS", "confidence": 0.65, "districtBn": "ঢাকা", "hasConflict": false}]	address-parser-v1.0	bd-geo-2026-10	EN
\.


--
-- Data for Name: analytics_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analytics_alerts (id, "createdAt", "updatedAt", alert_key, severity, status, scope, scope_id, metric_value, threshold, dedup_key, triggered_at, acknowledged_by, acknowledged_at, resolved_at) FROM stdin;
\.


--
-- Data for Name: bag_parcels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bag_parcels (id, "createdAt", "updatedAt", bag_id, parcel_id, is_active) FROM stdin;
\.


--
-- Data for Name: bags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bags (id, "createdAt", "updatedAt", bag_code, origin_hub_id, destination_hub_id, status, seal_tag, sealed_at, dispatched_at, received_at, notes, created_by, sealed_by, cancelled_at) FROM stdin;
\.


--
-- Data for Name: cash_discrepancies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_discrepancies (id, "createdAt", "updatedAt", cash_ledger_id, handin_id, type, status, expected_minor, actual_minor, difference_minor, currency, reason, notes, reported_by, resolved_by, resolved_at) FROM stdin;
\.


--
-- Data for Name: cash_handin_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_handin_items (id, "createdAt", "updatedAt", handin_id, cash_ledger_id, amount_minor) FROM stdin;
\.


--
-- Data for Name: cash_handins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_handins (id, "createdAt", "updatedAt", handin_code, rider_id, hub_id, status, expected_minor, verified_minor, currency, submitted_at, verified_at, verified_by, notes) FROM stdin;
\.


--
-- Data for Name: cash_ledgers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_ledgers (id, "createdAt", "updatedAt", parcel_id, rider_id, hub_id, amount, collected_at, hand_in_status, verified_by, verified_at, verified_amount) FROM stdin;
e0d72651-c660-4494-9d89-0b55fdefac3e	2026-10-10 15:01:41.921493+06	2026-10-10 15:01:41.921493+06	89dded52-d5f7-464a-8af8-8b0c26091dec	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	1850.00	2026-10-08 23:01:40.945+06	VERIFIED	605e5c84-a443-4c41-9452-8e57d27a969b	2026-10-09 00:01:40.945+06	\N
7f23cd5e-2c19-4843-9a06-29db283853d2	2026-10-10 15:01:41.9272+06	2026-10-10 15:01:41.9272+06	1efa9ffb-acca-4ec4-8729-c678e325d215	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	2450.00	2026-10-09 01:01:40.945+06	VERIFIED	605e5c84-a443-4c41-9452-8e57d27a969b	2026-10-09 02:01:40.945+06	\N
ffe11bc8-2519-40d5-83b1-f533472df22d	2026-10-10 15:01:41.93098+06	2026-10-10 15:01:41.93098+06	0251b4c7-da39-4de7-a0c4-419b902280cf	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	3200.00	2026-10-09 07:01:40.945+06	VERIFIED	605e5c84-a443-4c41-9452-8e57d27a969b	2026-10-09 08:01:40.945+06	\N
de485fdf-a8f5-431d-bab2-82e8a0e3d663	2026-10-10 15:01:41.935698+06	2026-10-10 15:01:41.935698+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	1450.00	2026-10-09 13:01:40.945+06	HANDED_IN	605e5c84-a443-4c41-9452-8e57d27a969b	\N	\N
229c49b7-d18d-4950-be57-50325c72901d	2026-10-10 15:01:41.941128+06	2026-10-10 15:01:41.941128+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	23790d2d-77e6-43bb-8c61-c67d5039bcd9	8b7bfed1-6ee0-4f8e-8bfa-a10be808dd91	5600.00	2026-10-09 15:01:40.945+06	VERIFIED	8b7bfed1-6ee0-4f8e-8bfa-a10be808dd91	2026-10-09 16:01:40.945+06	\N
ae85bcf0-03c6-4b28-a757-6243e441fefb	2026-10-10 15:01:41.945506+06	2026-10-10 15:01:41.945506+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	950.00	2026-10-09 19:01:40.945+06	PENDING	605e5c84-a443-4c41-9452-8e57d27a969b	\N	\N
\.


--
-- Data for Name: delivery_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_attempts (id, "createdAt", "updatedAt", parcel_id, rider_id, attempt_number, outcome, failure_reason, notes, rescheduled_for, metadata) FROM stdin;
b0762265-d206-4ad4-b8e5-5c1481e604f0	2026-10-06 21:01:40.945+06	2026-10-10 15:01:42.023945+06	993fdaf7-4056-4d1e-9dea-c7b02d490643	a14628fd-0ffa-4615-8561-81d34dd104ef	1	FAILED	CUSTOMER_UNAVAILABLE	Gate locked, phone switched off	\N	{"seeded": true}
edc66611-61d8-45cb-beef-e7831cd387bc	2026-10-06 23:01:40.945+06	2026-10-10 15:01:42.029991+06	993fdaf7-4056-4d1e-9dea-c7b02d490643	a14628fd-0ffa-4615-8561-81d34dd104ef	2	FAILED	CUSTOMER_REFUSED	Refused high COD at doorstep	\N	{"seeded": true}
ffa839fc-363f-4d0b-a2d4-b1876113dfa1	2026-10-07 21:01:40.945+06	2026-10-10 15:01:42.033932+06	b6ffcb07-11cd-4759-a0c3-c6f6461ccd65	a14628fd-0ffa-4615-8561-81d34dd104ef	1	FAILED	PAYMENT_NOT_READY	Cash not ready	\N	{"seeded": true}
c839b421-8816-4f13-8dab-6af47ff01926	2026-10-08 17:01:40.945+06	2026-10-10 15:01:42.038361+06	42b3be24-9dc7-428c-8e2a-f0d557ac3818	98d02dbf-e366-400e-8b4e-ac3622da0aab	1	FAILED	ADDRESS_INCORRECT	Typo address, could not locate	\N	{"seeded": true}
4b654c5a-0fad-4151-ab93-fdd2c35f3e6f	2026-10-09 11:01:40.945+06	2026-10-10 15:01:42.042752+06	81bc6343-45a2-4f51-8be1-a0223c796918	a14628fd-0ffa-4615-8561-81d34dd104ef	1	FAILED	CUSTOMER_UNAVAILABLE	\N	\N	{"seeded": true}
323eefe5-8ec7-431b-93cb-0a2043e5aaa4	2026-10-06 23:01:40.945+06	2026-10-10 15:01:42.046619+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	a14628fd-0ffa-4615-8561-81d34dd104ef	1	DELIVERED	\N	\N	\N	{"seeded": true}
a29d3525-295a-4f63-a255-5439198c12f3	2026-10-08 05:01:40.945+06	2026-10-10 15:01:42.050278+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	a14628fd-0ffa-4615-8561-81d34dd104ef	1	DELIVERED	\N	\N	\N	{"seeded": true}
bc0f825d-7639-40ea-8449-80fd8fa8ed69	2026-10-09 05:01:40.945+06	2026-10-10 15:01:42.054346+06	eb898186-4310-41fa-b8b4-18949a95420a	98d02dbf-e366-400e-8b4e-ac3622da0aab	1	DELIVERED	\N	\N	\N	{"seeded": true}
\.


--
-- Data for Name: event_outbox; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_outbox (id, "createdAt", "updatedAt", event_id, event_type, aggregate_type, aggregate_id, request_id, actor_id, payload, status, attempt_count, available_at, published_at, last_error) FROM stdin;
564c1d72-be1a-4ce1-bb79-2f37d73c406b	2026-10-10 17:23:24.198536+06	2026-10-10 17:23:24.872365+06	fff033be-572f-468c-8282-c703a11a82c7	parcel.created.v1	PARCEL	31119a40-c334-47e2-8f31-12c6f6cd2d79	ac4805eb-7f40-4c69-b705-5fb547af4a92	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "31119a40-c334-47e2-8f31-12c6f6cd2d79", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-ZCXWHG", "recipientName": "Test Recipient LISTMV2B2UPEH8TK", "recipientPhone": "01731403762", "deliveryAddress": "House 12, Road 5, Dhanmondi LISTMV2B2UPEH8TK"}	PUBLISHED	0	2026-10-10 17:23:24.304+06	2026-10-10 17:23:25.09+06	\N
a656444b-d12f-43a4-912b-dbf10d12d8e3	2026-10-10 17:23:59.193706+06	2026-10-10 17:24:00.215564+06	2a75860f-516c-43d5-bd89-2525898a40ba	parcel.created.v1	PARCEL	312013ca-8cdc-4f72-960d-7abbe0850658	57077e1d-7224-476b-bd53-519d17e05626	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "312013ca-8cdc-4f72-960d-7abbe0850658", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-JK4L96", "recipientName": "Test Recipient PAGEMV2B3LO63RXA", "recipientPhone": "01731438710", "deliveryAddress": "House 12, Road 5, Dhanmondi PAGEMV2B3LO63RXA"}	PUBLISHED	0	2026-10-10 17:23:59.212+06	2026-10-10 17:24:00.636+06	\N
f01a1e26-7777-4c2c-b1b7-c6010f996fa2	2026-10-10 17:24:04.910541+06	2026-10-10 17:24:06.236474+06	20ff9fa0-f8ce-4437-b169-8aa8f96854f7	parcel.created.v1	PARCEL	4b73ac51-38c2-4c60-8db8-eb8a052166ef	fb65bacc-1e2d-498b-816a-f389c42fabb5	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "4b73ac51-38c2-4c60-8db8-eb8a052166ef", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-8PQX5E", "recipientName": "Test Recipient BACKMV2B3Q9J7KZ9", "recipientPhone": "01731444663", "deliveryAddress": "House 12, Road 5, Dhanmondi BACKMV2B3Q9J7KZ9"}	PUBLISHED	0	2026-10-10 17:24:04.939+06	2026-10-10 17:24:06.382+06	\N
b7dab819-62b4-442e-a838-02276fd95852	2026-10-10 17:24:14.368111+06	2026-10-10 17:24:15.24868+06	84572fd5-7970-40f9-a94a-eab32d928641	parcel.created.v1	PARCEL	7aedf5da-1226-4fdb-96bd-67867c6cbcbe	f76d6871-1462-4f07-9952-6d110d2d6ec1	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "7aedf5da-1226-4fdb-96bd-67867c6cbcbe", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-TK2P7R", "recipientName": "Test Recipient SHAREMV2B3XJYSF6R", "recipientPhone": "01731454110", "deliveryAddress": "House 12, Road 5, Dhanmondi SHAREMV2B3XJYSF6R"}	PUBLISHED	0	2026-10-10 17:24:14.384+06	2026-10-10 17:24:15.444+06	\N
1254d577-dfee-4af2-bd52-e1627fc63cdb	2026-10-10 17:24:25.567574+06	2026-10-10 17:24:27.289842+06	294328a2-66d8-4181-bc9d-70827732a12b	parcel.created.v1	PARCEL	cc14599e-9601-4b01-a39d-beb18f60deb7	48e1ea00-0c76-492d-8389-29b3311c0caf	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "cc14599e-9601-4b01-a39d-beb18f60deb7", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-BC8QHZ", "recipientName": "Test Recipient RELOADMV2B4630376I", "recipientPhone": "01731465164", "deliveryAddress": "House 12, Road 5, Dhanmondi RELOADMV2B4630376I"}	PUBLISHED	0	2026-10-10 17:24:25.588+06	2026-10-10 17:24:27.424+06	\N
a8f74bef-46b4-4494-bdaa-db47ec84aaf0	2026-10-10 17:25:09.630061+06	2026-10-10 17:25:10.18609+06	605ed557-1086-40f8-b022-8f5b1e87373e	parcel.created.v1	PARCEL	08170f21-a7e3-4c32-b05b-ce4e770bb4ef	c380e393-c7e8-413e-bc07-926cd1ade3d3	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "08170f21-a7e3-4c32-b05b-ce4e770bb4ef", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-LJUGTX", "recipientName": "Test Recipient LISTMV2B546CO4N0", "recipientPhone": "01731509348", "deliveryAddress": "House 12, Road 5, Dhanmondi LISTMV2B546CO4N0"}	PUBLISHED	0	2026-10-10 17:25:09.643+06	2026-10-10 17:25:10.334+06	\N
0e45a48d-6c7c-42dc-b4b3-e80d23a4047b	2026-10-10 17:28:22.43748+06	2026-10-10 17:28:24.815699+06	75068e8d-16c5-4d4e-ae30-e9d538b974b2	parcel.created.v1	PARCEL	23e1de97-7721-461a-a94c-a623c7bc294b	23f6bd47-758f-4758-9e44-908b6e090ae4	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "23e1de97-7721-461a-a94c-a623c7bc294b", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-PGFTGK", "recipientName": "Test Recipient PROBEMV2B98L6", "recipientPhone": "01731701690", "deliveryAddress": "House 1 PROBEMV2B98L6"}	PUBLISHED	0	2026-10-10 17:28:22.448+06	2026-10-10 17:28:25.782+06	\N
ea271e92-d5a5-485f-bda9-1228ed2f09cd	2026-10-10 17:28:51.482974+06	2026-10-10 17:28:51.903191+06	9ae9a7c4-44ee-4a31-a35d-a8f2c415182f	parcel.created.v1	PARCEL	40f4d68d-4804-473d-8ebf-699ebe222473	2fae1aba-f7d5-4cf7-964e-9d857a265faf	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "40f4d68d-4804-473d-8ebf-699ebe222473", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-D56LZV", "recipientName": "Test Recipient PROBEMV2B9UDV", "recipientPhone": "01731729940", "deliveryAddress": "House 1 PROBEMV2B9UDV"}	PUBLISHED	0	2026-10-10 17:28:51.495+06	2026-10-10 17:28:52.055+06	\N
5f24c68a-9324-4f76-b22a-acba31ac45e5	2026-10-10 17:31:01.038932+06	2026-10-10 17:31:01.235541+06	53a02fbf-858f-47a4-ae71-f5cfdaad1549	parcel.created.v1	PARCEL	40fe8418-db67-4ab2-9e99-325e6bebf9f0	a4ae8482-5d16-47fb-adba-ee86b6cd01a1	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "40fe8418-db67-4ab2-9e99-325e6bebf9f0", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-EGC4FF", "recipientName": "Test Recipient PROBEMV2BCMTM", "recipientPhone": "01731860107", "deliveryAddress": "House 1 PROBEMV2BCMTM"}	PUBLISHED	0	2026-10-10 17:31:01.064+06	2026-10-10 17:31:01.401+06	\N
208fe640-c6ea-4cfb-bc88-7553a56fdd0a	2026-10-10 17:32:33.393114+06	2026-10-10 17:32:33.822471+06	2a3b6c33-8465-412a-9a36-3214dcf9be2c	parcel.created.v1	PARCEL	c80d00dc-80cd-4a54-b76e-7de34cd998d7	1fc6603a-e47c-4190-ade9-f52502303d54	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "c80d00dc-80cd-4a54-b76e-7de34cd998d7", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-B62QC3", "recipientName": "Test Recipient PROBEMV2BEM0D", "recipientPhone": "01731952367", "deliveryAddress": "House 1 PROBEMV2BEM0D"}	PUBLISHED	0	2026-10-10 17:32:33.434+06	2026-10-10 17:32:33.983+06	\N
b0449e86-ac55-4a82-95c6-d7ef5e20ba89	2026-10-10 17:33:15.0066+06	2026-10-10 17:33:15.911562+06	808ecf44-db67-41cd-b2c2-f09a73184b21	parcel.created.v1	PARCEL	95a3cba9-831c-4ebf-aca7-1397afeff187	eea2aabe-8577-4b81-823e-0168a66bf36c	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "95a3cba9-831c-4ebf-aca7-1397afeff187", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-2BM7TS", "recipientName": "Test Recipient PROBEMV2BFIOW", "recipientPhone": "01731994721", "deliveryAddress": "House 1 PROBEMV2BFIOW"}	PUBLISHED	0	2026-10-10 17:33:15.02+06	2026-10-10 17:33:16.056+06	\N
602f3581-93b7-43a6-a464-67dd19319a9c	2026-10-10 17:34:41.817966+06	2026-10-10 17:34:43.172721+06	bb886d42-e37a-4e10-90cc-a11b551540da	parcel.created.v1	PARCEL	b98dd832-1012-4c74-a985-0a8998dbda2a	19dcb66f-d292-48df-b754-e06d7568ce31	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "b98dd832-1012-4c74-a985-0a8998dbda2a", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-H3P77D", "recipientName": "Test Recipient PROBEMV2BHDLB", "recipientPhone": "01732081424", "deliveryAddress": "House 1 PROBEMV2BHDLB"}	PUBLISHED	0	2026-10-10 17:34:41.832+06	2026-10-10 17:34:43.314+06	\N
ea9b7500-8903-414c-8646-4be272734625	2026-10-10 17:35:58.65615+06	2026-10-10 17:35:59.216363+06	9f33b8e3-5612-4304-98bd-acb61cca2998	parcel.created.v1	PARCEL	28339e53-3fc5-4631-9e03-4202d1c52554	2e086239-22ad-4cc7-b40f-481ffe2f96ea	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "28339e53-3fc5-4631-9e03-4202d1c52554", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-7ZUKFW", "recipientName": "Test Recipient PROBEMV2BJ0VD", "recipientPhone": "01732158250", "deliveryAddress": "House 1 PROBEMV2BJ0VD"}	PUBLISHED	0	2026-10-10 17:35:58.678+06	2026-10-10 17:35:59.395+06	\N
754d1eff-451b-4730-88db-327b0b51f3dc	2026-10-10 17:37:10.294174+06	2026-10-10 17:37:10.687788+06	b0ecb5f7-9a56-4a58-806f-189c039db8db	parcel.created.v1	PARCEL	b817b5cd-e112-4a4e-96cd-98c72d55bd20	112c62b3-2a2e-46df-8e17-0a165e659ab7	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "b817b5cd-e112-4a4e-96cd-98c72d55bd20", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-CWDTRR", "recipientName": "Test Recipient PROBEMV2BKK24", "recipientPhone": "01732229773", "deliveryAddress": "House 1 PROBEMV2BKK24"}	PUBLISHED	0	2026-10-10 17:37:10.306+06	2026-10-10 17:37:10.884+06	\N
f8c9d6fd-61a7-4170-b8e1-4fb3ca8b07a0	2026-10-10 17:38:30.447922+06	2026-10-10 17:38:31.865451+06	0f454e6f-99be-4532-b71b-790a49508eff	parcel.created.v1	PARCEL	1a17de77-1411-4910-aef4-bc272f7aec05	274dd311-dc22-4dea-ac94-323ebc066bea	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "1a17de77-1411-4910-aef4-bc272f7aec05", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-YJ8ASB", "recipientName": "Test Recipient PROBEMV2BM9YN", "recipientPhone": "01732310000", "deliveryAddress": "House 1 PROBEMV2BM9YN"}	PUBLISHED	0	2026-10-10 17:38:30.467+06	2026-10-10 17:38:32.037+06	\N
4f130cfe-8d2b-4933-a36f-de4b98d2407b	2026-10-10 17:39:39.296677+06	2026-10-10 17:39:41.035733+06	75336f17-445f-4ca3-a5da-579bcb8c6ef1	parcel.created.v1	PARCEL	9d826076-322d-43b4-bddf-0951b52f459d	11d5dcc0-326f-458b-bd62-29107b2cc0fe	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "9d826076-322d-43b4-bddf-0951b52f459d", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-7GPR74", "recipientName": "Test Recipient PROBEMV2BNR2S", "recipientPhone": "01732378836", "deliveryAddress": "House 1 PROBEMV2BNR2S"}	PUBLISHED	0	2026-10-10 17:39:39.316+06	2026-10-10 17:39:41.16+06	\N
47af5102-dfcc-4be8-a403-9c4790ecb0a6	2026-10-10 17:40:21.474604+06	2026-10-10 17:40:23.214194+06	994b1ecb-8ca9-4e86-a21c-73f86eb8e92b	parcel.created.v1	PARCEL	ce82d560-935e-4e91-9d63-805c4bed0ba7	dcd6e22d-b042-495c-af66-b9216976f9a3	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "ce82d560-935e-4e91-9d63-805c4bed0ba7", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-EBY4VC", "recipientName": "Test Recipient LISTMV2BONS1YVSK", "recipientPhone": "01732421217", "deliveryAddress": "House 12, Road 5, Dhanmondi LISTMV2BONS1YVSK"}	PUBLISHED	0	2026-10-10 17:40:21.491+06	2026-10-10 17:40:23.352+06	\N
9f7933cf-91f2-4021-8648-f97a23ebfde5	2026-10-10 17:40:53.680731+06	2026-10-10 17:40:53.979587+06	13e8cbda-769f-4ee7-b02f-8ffcabad5d75	parcel.created.v1	PARCEL	32fdb0f2-ca79-4e9c-ab89-5a04daa5aac0	26a59ded-cb68-46b2-b2ce-126dd741a9b2	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "32fdb0f2-ca79-4e9c-ab89-5a04daa5aac0", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-4QPYHT", "recipientName": "Test Recipient PAGEMV2BPCHXDS5N", "recipientPhone": "01732453253", "deliveryAddress": "House 12, Road 5, Dhanmondi PAGEMV2BPCHXDS5N"}	PUBLISHED	0	2026-10-10 17:40:53.709+06	2026-10-10 17:40:54.163+06	\N
fe9130b1-776e-4f99-ba34-f8c7def1fe46	2026-10-10 17:41:01.597989+06	2026-10-10 17:41:02.314298+06	d45f27f2-20c8-4f00-b7d8-4a7d5d889f7d	parcel.created.v1	PARCEL	689b57e6-30c4-48ba-ae76-2ba648d16cb2	c889795a-6716-4979-9adb-c0d2841dda82	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "689b57e6-30c4-48ba-ae76-2ba648d16cb2", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-MJ7WS6", "recipientName": "Test Recipient BACKMV2BPIPEWW1E", "recipientPhone": "01732461298", "deliveryAddress": "House 12, Road 5, Dhanmondi BACKMV2BPIPEWW1E"}	PUBLISHED	0	2026-10-10 17:41:01.613+06	2026-10-10 17:41:02.46+06	\N
eafa1b5a-9661-4cc4-9e58-0fc46970daff	2026-10-10 17:41:13.428556+06	2026-10-10 17:41:14.34072+06	5c2345f3-9d3d-4f6d-a43b-84eea67a2901	parcel.created.v1	PARCEL	5f550109-a36b-4dca-94be-b6594c62879f	2c966407-abca-4d70-849c-7d282ed547da	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "5f550109-a36b-4dca-94be-b6594c62879f", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-JPX758", "recipientName": "Test Recipient SHAREMV2BPRULRE7S", "recipientPhone": "01732473149", "deliveryAddress": "House 12, Road 5, Dhanmondi SHAREMV2BPRULRE7S"}	PUBLISHED	0	2026-10-10 17:41:13.449+06	2026-10-10 17:41:14.49+06	\N
6a66ac10-8fff-4499-8e6f-b27ba7e9604c	2026-10-10 17:41:47.771076+06	2026-10-10 17:41:48.147419+06	3d4a4393-58ac-49e2-aedf-38987013350c	parcel.created.v1	PARCEL	2da4f6aa-3e04-4210-8dca-8abb1cc35b09	dcda5a0a-cba4-4527-8464-412225ee5fed	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "2da4f6aa-3e04-4210-8dca-8abb1cc35b09", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-5T7DLF", "recipientName": "Test Recipient RELOADMV2BQIBY7VY1", "recipientPhone": "01732507470", "deliveryAddress": "House 12, Road 5, Dhanmondi RELOADMV2BQIBY7VY1"}	PUBLISHED	0	2026-10-10 17:41:47.783+06	2026-10-10 17:41:48.362+06	\N
e11eb96c-f1c7-4b1f-b0a0-94b4b62e47eb	2026-10-10 17:42:15.92795+06	2026-10-10 17:42:17.515643+06	c03cbe75-53ff-47b3-b7bf-a43ed17af5ae	parcel.created.v1	PARCEL	4582e06d-4420-49d1-8788-cc58763022d8	a08cb201-ced7-4946-a161-e7e11523691a	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "4582e06d-4420-49d1-8788-cc58763022d8", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-DTXL85", "recipientName": "Test Recipient LISTMV2BR3WRSGJ2", "recipientPhone": "01732535435", "deliveryAddress": "House 12, Road 5, Dhanmondi LISTMV2BR3WRSGJ2"}	PUBLISHED	0	2026-10-10 17:42:15.945+06	2026-10-10 17:42:17.645+06	\N
de78170e-53b5-4884-8f98-2890473bf875	2026-10-10 17:42:27.570466+06	2026-10-10 17:42:29.566897+06	4c8d2d51-0ce3-41c5-a3c7-a892a9973d58	parcel.created.v1	PARCEL	b8716788-f0a6-45a5-a5fc-fd59d860f8b1	59b15170-9cea-4887-a999-f9deffdc5b0f	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "b8716788-f0a6-45a5-a5fc-fd59d860f8b1", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-VTYPAW", "recipientName": "Test Recipient PAGEMV2BRD226O87", "recipientPhone": "01732547290", "deliveryAddress": "House 12, Road 5, Dhanmondi PAGEMV2BRD226O87"}	PUBLISHED	0	2026-10-10 17:42:27.583+06	2026-10-10 17:42:29.742+06	\N
00783e06-9dae-4eff-ad82-156dc93dc3c8	2026-10-10 17:42:35.714116+06	2026-10-10 17:42:36.273806+06	870688b7-e33c-4488-8e7e-564f9e0e7fb8	parcel.created.v1	PARCEL	39a1d3e9-c47d-41d2-8fa1-68983af68e4e	8a5928b5-700f-4e1a-b109-f5acdb6a1279	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "39a1d3e9-c47d-41d2-8fa1-68983af68e4e", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-732NSL", "recipientName": "Test Recipient BACKMV2BRJ3XPXAD", "recipientPhone": "01732555133", "deliveryAddress": "House 12, Road 5, Dhanmondi BACKMV2BRJ3XPXAD"}	PUBLISHED	0	2026-10-10 17:42:35.728+06	2026-10-10 17:42:36.447+06	\N
eecfbd7f-d2e1-436b-b623-1ffeda1e02f5	2026-10-10 17:43:03.100204+06	2026-10-10 17:43:05.871587+06	e093ae38-9149-4dd8-b9ce-9f80fb081f00	parcel.created.v1	PARCEL	a3c2b3e2-e0b8-4545-ad11-c560cddda2e3	09a15150-f55e-43fc-a442-c75457fe144e	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "a3c2b3e2-e0b8-4545-ad11-c560cddda2e3", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-APYHPS", "recipientName": "Test Recipient RELOADMV2BS44055KT", "recipientPhone": "01732582352", "deliveryAddress": "House 12, Road 5, Dhanmondi RELOADMV2BS44055KT"}	PUBLISHED	0	2026-10-10 17:43:03.279+06	2026-10-10 17:43:06.039+06	\N
b99c10e2-a71a-4a30-a474-74a91c17287f	2026-10-10 17:42:47.797055+06	2026-10-10 17:42:50.805334+06	1432f799-0835-420e-822a-48ae4923f66b	parcel.created.v1	PARCEL	4d35d4c4-a705-453b-a67a-4fd47559e2c1	0c1cc828-a6a6-4266-b5bf-2aa362f76961	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	{"thana": "Dhanmondi", "weight": 1, "district": "Dhaka", "parcelId": "4d35d4c4-a705-453b-a67a-4fd47559e2c1", "codAmount": 1000, "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "deliveryFee": 60, "trackingCode": "DHR-20261010-JYVB34", "recipientName": "Test Recipient SHAREMV2BRSALFMA3", "recipientPhone": "01732567037", "deliveryAddress": "House 12, Road 5, Dhanmondi SHAREMV2BRSALFMA3"}	PUBLISHED	0	2026-10-10 17:42:47.982+06	2026-10-10 17:42:51.005+06	\N
\.


--
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.financial_entries (id, "createdAt", "updatedAt", transaction_id, account, direction, amount_minor, currency, merchant_id, memo) FROM stdin;
02e67dff-5b0d-479b-a2f5-75c858c4f892	2026-10-10 15:01:40.884328+06	2026-10-10 15:01:40.884328+06	5ea19045-0dca-4c7d-95cc-475e0b409cd5	ADJUSTMENT	DEBIT	4850000	BDT	\N	Seed opening balance adoption
f87f0b90-5fa4-467f-af92-c10c8609cf6b	2026-10-10 15:01:40.884328+06	2026-10-10 15:01:40.884328+06	5ea19045-0dca-4c7d-95cc-475e0b409cd5	MERCHANT_AVAILABLE	CREDIT	4850000	BDT	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	Seed opening balance adoption
d8c9cb27-b9cf-44fc-a67f-80a866ab18f8	2026-10-10 15:01:40.899852+06	2026-10-10 15:01:40.899852+06	faaa8eaf-edd0-48ba-aa8a-e0356bd91e55	ADJUSTMENT	DEBIT	1520000	BDT	\N	Seed opening balance adoption
d6ab024c-17f8-4f34-82d1-3d2aa97c28b5	2026-10-10 15:01:40.899852+06	2026-10-10 15:01:40.899852+06	faaa8eaf-edd0-48ba-aa8a-e0356bd91e55	MERCHANT_AVAILABLE	CREDIT	1520000	BDT	b2610025-c66e-4c17-9e5b-439fca2a40ac	Seed opening balance adoption
20060465-85cc-454c-adc6-a9a32ed8b025	2026-10-10 15:01:40.915434+06	2026-10-10 15:01:40.915434+06	98648e3f-be97-43fa-b026-72f5a70f8875	ADJUSTMENT	DEBIT	9340000	BDT	\N	Seed opening balance adoption
d3615e46-4dcd-4f82-8c60-01e3b893202c	2026-10-10 15:01:40.915434+06	2026-10-10 15:01:40.915434+06	98648e3f-be97-43fa-b026-72f5a70f8875	MERCHANT_AVAILABLE	CREDIT	9340000	BDT	98b1f798-a67b-40d9-abd9-54d3492fbbd9	Seed opening balance adoption
\.


--
-- Data for Name: financial_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.financial_transactions (id, "createdAt", "updatedAt", transaction_code, type, status, reference_type, reference_id, description, reversal_of_id, reversed_by_id, created_by) FROM stdin;
5ea19045-0dca-4c7d-95cc-475e0b409cd5	2026-10-10 15:01:40.87847+06	2026-10-10 15:01:40.87847+06	FIN-OP90087697	ADJUSTMENT	POSTED	OPENING_BALANCE	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	Seed opening balance adoption	\N	\N	\N
faaa8eaf-edd0-48ba-aa8a-e0356bd91e55	2026-10-10 15:01:40.896926+06	2026-10-10 15:01:40.896926+06	FIN-OP90089543	ADJUSTMENT	POSTED	OPENING_BALANCE	b2610025-c66e-4c17-9e5b-439fca2a40ac	Seed opening balance adoption	\N	\N	\N
98648e3f-be97-43fa-b026-72f5a70f8875	2026-10-10 15:01:40.912244+06	2026-10-10 15:01:40.912244+06	FIN-OP90091011	ADJUSTMENT	POSTED	OPENING_BALANCE	98b1f798-a67b-40d9-abd9-54d3492fbbd9	Seed opening balance adoption	\N	\N	\N
\.


--
-- Data for Name: geo_dataset_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.geo_dataset_versions (id, "createdAt", "updatedAt", version, source, imported_at, divisions, districts, upazilas, aliases, status) FROM stdin;
ce9fe7a1-3ffe-451c-a9db-ba1af5a70db6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	bd-geo-2026-10	BBS administrative hierarchy (compiled sadar reference)	2026-10-10 15:01:42.06+06	8	64	242	501	ACTIVE
\.


--
-- Data for Name: geo_places; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.geo_places (id, "createdAt", "updatedAt", kind, code, name, name_bn, parent_id, division, zone, aliases, postal_codes, dataset_version) FROM stdin;
aaf54bfb-c64b-404f-935e-7e10b499c441	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DIVISION	BD-DIV-DHAK	Dhaka	\N	\N	Dhaka	\N	[]	[]	bd-geo-2026-10
3479bf47-6c3c-4ba0-98cf-7b2866e12eac	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-DHK	Dhaka	ঢাকা	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	INSIDE_DHAKA	["Dhaka", "ঢাকা", "dhaka", "dhka", "dhk", "ঢাকা", "ঢাকায়"]	[]	bd-geo-2026-10
4585e24e-eb75-49f5-a4ae-56efc46c7bbf	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-DHANMO	Dhanmondi	ধানমন্ডি	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Dhanmondi", "ধানমন্ডি", "dhanmondi", "dhanmandi", "ধানমন্ডি"]	["1205"]	bd-geo-2026-10
b7170c9a-c41a-4482-80d3-cb7e544541f8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-GULSHA	Gulshan	গুলশান	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Gulshan", "গুলশান", "gulshan", "গুলশান"]	["1212"]	bd-geo-2026-10
be398c72-8637-48cd-82ca-a8182fe8b256	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-BANANI	Banani	বনানী	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Banani", "বনানী", "banani", "বনানী"]	["1213"]	bd-geo-2026-10
8e5251f9-d4c5-4af9-89c6-03713fa485b1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-UTTARA	Uttara	উত্তরা	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Uttara", "উত্তরা", "uttara", "utora", "উত্তরা"]	["1230"]	bd-geo-2026-10
e0451eb8-3aca-4ab9-938c-6b15b0ca4eb7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-MIRPUR	Mirpur	মিরপুর	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Mirpur", "মিরপুর", "mirpur", "meerpur", "মিরপুর"]	["1216"]	bd-geo-2026-10
6cd8e3e7-6151-4ba8-bf9e-ded3f84d5177	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-MOHAMM	Mohammadpur	মোহাম্মদপুর	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Mohammadpur", "মোহাম্মদপুর", "mohammadpur", "mohammodpur", "মোহাম্মদপুর"]	["1207"]	bd-geo-2026-10
a200c937-3be3-4d4b-959d-27daea56ef53	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-MOTIJH	Motijheel	মতিঝিল	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Motijheel", "মতিঝিল", "motijheel", "motijhil", "মতিঝিল"]	["1000"]	bd-geo-2026-10
5a7e2e0f-940d-4a5c-8b5f-5a4b6dde7293	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-BADDA	Badda	বাড্ডা	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Badda", "বাড্ডা", "badda", "বাড্ডা"]	["1212"]	bd-geo-2026-10
2f8b895b-7f93-4b9c-8ebd-ae8d35ad6f4f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-KHILGA	Khilgaon	খিলগাঁও	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Khilgaon", "খিলগাঁও", "khilgaon", "খিলগাঁও"]	["1219"]	bd-geo-2026-10
8a7d05d5-e011-4dcf-bd12-03eb3a3be856	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-RAMPUR	Rampura	রামপুরা	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Rampura", "রামপুরা", "rampura", "রামপুরা"]	["1219"]	bd-geo-2026-10
ecb016e0-3613-40af-a2c1-1a0a70b38226	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-TEJGAO	Tejgaon	তেজগাঁও	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Tejgaon", "তেজগাঁও", "tejgaon", "তেজগাঁও"]	["1208"]	bd-geo-2026-10
bf709f4f-0044-4184-8ff4-c0d358e875d2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-LALBAG	Lalbagh	লালবাগ	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Lalbagh", "লালবাগ", "lalbagh", "lalbag", "লালবাগ"]	["1211"]	bd-geo-2026-10
ded2c9cd-c4f6-40f6-bc44-e340ba055974	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-PALTAN	Paltan	পল্টন	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Paltan", "পল্টন", "paltan", "পল্টন"]	["1000"]	bd-geo-2026-10
7eec312c-47bc-4936-87d6-61b2f61f06ed	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-SHAHBA	Shahbagh	শাহবাগ	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Shahbagh", "শাহবাগ", "shahbagh", "shahbag", "শাহবাগ"]	["1000"]	bd-geo-2026-10
29114cfb-3b39-4868-8c66-d2ab57a8f4cc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-JATRAB	Jatrabari	যাত্রাবাড়ী	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Jatrabari", "যাত্রাবাড়ী", "jatrabari", "যাত্রাবাড়ী", "যাত্রাবাড়ি"]	["1204"]	bd-geo-2026-10
c197269d-1aed-4c2a-932c-d43a459e2812	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-DEMRA	Demra	ডেমরা	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Demra", "ডেমরা", "demra", "ডেমরা"]	["1360"]	bd-geo-2026-10
a61f9d85-872c-45b9-9a72-3606ada4749d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-SAVAR	Savar	সাভার	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Savar", "সাভার", "savar", "shavar", "সাভার"]	["1340"]	bd-geo-2026-10
c3774372-1ac1-4d41-aed4-e1d9d1c10434	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-KERANI	Keraniganj	কেরানীগঞ্জ	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Keraniganj", "কেরানীগঞ্জ", "keraniganj", "কেরানীগঞ্জ"]	["1310"]	bd-geo-2026-10
43468cd1-6149-4779-9b7b-5a772094de12	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-DHAMRA	Dhamrai	ধামরাই	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Dhamrai", "ধামরাই", "dhamrai", "ধামরাই"]	["1350"]	bd-geo-2026-10
89e3906b-62f8-43dd-afab-9965ecb55af0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-NAWABG	Nawabganj	নবাবগঞ্জ	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Nawabganj", "নবাবগঞ্জ", "nawabganj", "নবাবগঞ্জ"]	["1320"]	bd-geo-2026-10
abf8bcf1-0baf-4b06-a43d-024c84318960	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-DHK-DOHAR	Dohar	দোহার	3479bf47-6c3c-4ba0-98cf-7b2866e12eac	Dhaka	INSIDE_DHAKA	["Dohar", "দোহার", "dohar", "দোহার"]	["1330"]	bd-geo-2026-10
1408b9d6-a9dd-409d-a484-558181bdac8f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-GAZ	Gazipur	গাজীপুর	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	DHAKA_SUBURBS	["Gazipur", "গাজীপুর", "gazipur", "gajipur", "গাজীপুর"]	[]	bd-geo-2026-10
01b0957f-383c-4ebf-840e-14082d95c701	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-GAZ-GAZIPU	Gazipur Sadar	গাজীপুর সদর	1408b9d6-a9dd-409d-a484-558181bdac8f	Dhaka	DHAKA_SUBURBS	["Gazipur Sadar", "গাজীপুর সদর", "sadar", "joydebpur", "জয়দেবপুর"]	["1700"]	bd-geo-2026-10
9b917e82-71a2-406a-9edd-71e22236c5b5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-GAZ-TONGI	Tongi	টঙ্গী	1408b9d6-a9dd-409d-a484-558181bdac8f	Dhaka	DHAKA_SUBURBS	["Tongi", "টঙ্গী", "tongi", "টঙ্গী"]	["1710"]	bd-geo-2026-10
c476f168-90ae-4441-96c5-bf8ec111cd4f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-GAZ-KALIAK	Kaliakair	কালিয়াকৈর	1408b9d6-a9dd-409d-a484-558181bdac8f	Dhaka	DHAKA_SUBURBS	["Kaliakair", "কালিয়াকৈর", "kaliakair", "কালিয়াকৈর"]	["1750"]	bd-geo-2026-10
a6879115-94d7-422e-bba8-319ab7be942e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-GAZ-KAPASI	Kapasia	কাপাসিয়া	1408b9d6-a9dd-409d-a484-558181bdac8f	Dhaka	DHAKA_SUBURBS	["Kapasia", "কাপাসিয়া", "kapasia", "কাপাসিয়া"]	["1730"]	bd-geo-2026-10
81f5d28f-c3a8-4f3e-9833-3a6e267ceff9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-GAZ-SREEPU	Sreepur	শ্রীপুর	1408b9d6-a9dd-409d-a484-558181bdac8f	Dhaka	DHAKA_SUBURBS	["Sreepur", "শ্রীপুর", "sreepur", "shreepur", "শ্রীপুর"]	["1740"]	bd-geo-2026-10
0c8d797a-86dd-4632-9e61-586850c803f6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-NGJ	Narayanganj	নারায়ণগঞ্জ	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	DHAKA_SUBURBS	["Narayanganj", "নারায়ণগঞ্জ", "narayanganj", "narayangonj", "নারায়ণগঞ্জ"]	[]	bd-geo-2026-10
f23ec3ff-ac07-460b-b1ea-35ca4fa8de94	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NGJ-NARAYA	Narayanganj Sadar	নারায়ণগঞ্জ সদর	0c8d797a-86dd-4632-9e61-586850c803f6	Dhaka	DHAKA_SUBURBS	["Narayanganj Sadar", "নারায়ণগঞ্জ সদর", "sadar", "শহর"]	["1400"]	bd-geo-2026-10
3da246fd-8c6e-4fc5-8e8e-4f4f471ef5f2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NGJ-FATULL	Fatullah	ফতুল্লা	0c8d797a-86dd-4632-9e61-586850c803f6	Dhaka	DHAKA_SUBURBS	["Fatullah", "ফতুল্লা", "fatullah", "fatulla", "ফতুল্লা"]	["1420"]	bd-geo-2026-10
255ac95c-410c-4e37-8a6f-3a5c15a06e8b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NGJ-SIDDHI	Siddhirganj	সিদ্ধিরগঞ্জ	0c8d797a-86dd-4632-9e61-586850c803f6	Dhaka	DHAKA_SUBURBS	["Siddhirganj", "সিদ্ধিরগঞ্জ", "siddhirganj", "সিদ্ধিরগঞ্জ"]	["1430"]	bd-geo-2026-10
e73cf31e-8cd9-4e1f-aedd-2453174ec56c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NGJ-BANDAR	Bandar	বন্দর	0c8d797a-86dd-4632-9e61-586850c803f6	Dhaka	DHAKA_SUBURBS	["Bandar", "বন্দর", "bandar", "বন্দর"]	["1410"]	bd-geo-2026-10
d371f8fa-5766-4252-9f6f-ba4518ebce56	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NGJ-RUPGAN	Rupganj	রূপগঞ্জ	0c8d797a-86dd-4632-9e61-586850c803f6	Dhaka	DHAKA_SUBURBS	["Rupganj", "রূপগঞ্জ", "rupganj", "রূপগঞ্জ"]	["1460"]	bd-geo-2026-10
19392582-0c07-4c28-a3da-2d1ae74c385e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NGJ-ARAIHA	Araihazar	আড়াইহাজার	0c8d797a-86dd-4632-9e61-586850c803f6	Dhaka	DHAKA_SUBURBS	["Araihazar", "আড়াইহাজার", "araihazar", "আড়াইহাজার"]	["1450"]	bd-geo-2026-10
1c8bcdf0-de81-4504-b904-7bf738666121	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NGJ-SONARG	Sonargaon	সোনারগাঁও	0c8d797a-86dd-4632-9e61-586850c803f6	Dhaka	DHAKA_SUBURBS	["Sonargaon", "সোনারগাঁও", "sonargaon", "সোনারগাঁও"]	["1440"]	bd-geo-2026-10
d5b52c9b-3942-41d3-8337-9d1da68e7266	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DIVISION	BD-DIV-CHAT	Chattogram	\N	\N	Chattogram	\N	[]	[]	bd-geo-2026-10
96472eb8-29be-40df-b0e4-68bb08b09a75	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-CTG	Chittagong	চট্টগ্রাম	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Chittagong", "চট্টগ্রাম", "chittagong", "chattogram", "ctg", "চট্টগ্রাম"]	[]	bd-geo-2026-10
7d52e28b-f94f-4a01-b46a-05cf7c74e259	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-AGRABA	Agrabad	আগ্রাবাদ	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Agrabad", "আগ্রাবাদ", "agrabad", "আগ্রাবাদ"]	["4100"]	bd-geo-2026-10
5f81ffe3-8f48-4d46-baff-cad4b7048dc8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-PANCHL	Panchlaish	পাঁচলাইশ	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Panchlaish", "পাঁচলাইশ", "panchlaish", "পাঁচলাইশ"]	["4203"]	bd-geo-2026-10
cfdcbad5-ed9b-484e-8163-be70ec4ea0b2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-KOTWAL	Kotwali	কোতোয়ালী	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Kotwali", "কোতোয়ালী", "kotwali", "কোতোয়ালী"]	["4000"]	bd-geo-2026-10
221656b8-6bbd-4531-9c68-c013ee47a33e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-HALISH	Halishahar	হালিশহর	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Halishahar", "হালিশহর", "halishahar", "হালিশহর"]	["4216"]	bd-geo-2026-10
8a351ef9-cdc8-49cd-abfd-8595c9686d66	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-KHULSH	Khulshi	খুলশী	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Khulshi", "খুলশী", "khulshi", "খুলশী"]	["4225"]	bd-geo-2026-10
5d6a1f68-6bfb-4689-b07c-a521644e5d43	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-BAKALI	Bakalia	বাকলিয়া	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Bakalia", "বাকলিয়া", "bakalia", "বাকলিয়া"]	["4218"]	bd-geo-2026-10
63885b26-a8e8-4f9e-a01d-d457cdad2d96	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-DOUBLE	Double Mooring	ডবলমুরিং	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Double Mooring", "ডবলমুরিং", "double mooring", "ডবলমুরিং"]	["4100"]	bd-geo-2026-10
23f603d8-10d4-41e3-a161-340afe9c7f36	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-HATHAZ	Hathazari	হাটহাজারী	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Hathazari", "হাটহাজারী", "hathazari", "হাটহাজারী"]	["4330"]	bd-geo-2026-10
9dd2248b-d194-4f47-817b-377482776c8b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-PATIYA	Patiya	পটিয়া	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Patiya", "পটিয়া", "patiya", "পটিয়া"]	["4370"]	bd-geo-2026-10
4375c484-7745-442b-9baa-509d186683e1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CTG-SITAKU	Sitakunda	সীতাকুণ্ড	96472eb8-29be-40df-b0e4-68bb08b09a75	Chattogram	OUTSIDE_DHAKA	["Sitakunda", "সীতাকুণ্ড", "sitakunda", "sitakund", "সীতাকুণ্ড"]	["4310"]	bd-geo-2026-10
994c7338-f03f-4925-bfb0-8c205d7d5ad9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DIVISION	BD-DIV-SYLH	Sylhet	\N	\N	Sylhet	\N	[]	[]	bd-geo-2026-10
7c157b25-0029-48cf-ba83-b199c6dfe492	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-SY-SYL	Sylhet	সিলেট	994c7338-f03f-4925-bfb0-8c205d7d5ad9	Sylhet	OUTSIDE_DHAKA	["Sylhet", "সিলেট", "sylhet", "silhet", "সিলেট"]	[]	bd-geo-2026-10
ad982d55-00a8-4b28-8c4c-6ddc643bacbe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SYL-SYLHET	Sylhet Sadar	সিলেট সদর	7c157b25-0029-48cf-ba83-b199c6dfe492	Sylhet	OUTSIDE_DHAKA	["Sylhet Sadar", "সিলেট সদর", "sadar", "সদর"]	["3100"]	bd-geo-2026-10
d7e2163f-7e58-41f7-b749-728b65871de4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SYL-ZINDAB	Zindabazar	জিন্দাবাজার	7c157b25-0029-48cf-ba83-b199c6dfe492	Sylhet	OUTSIDE_DHAKA	["Zindabazar", "জিন্দাবাজার", "zindabazar", "জিন্দাবাজার"]	["3100"]	bd-geo-2026-10
00d0dec7-78ef-4376-908a-0be5060dd111	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SYL-SHAHPA	Shah Paran	শাহপরাণ	7c157b25-0029-48cf-ba83-b199c6dfe492	Sylhet	OUTSIDE_DHAKA	["Shah Paran", "শাহপরাণ", "shah paran", "শাহপরাণ"]	["3104"]	bd-geo-2026-10
2a6565dc-b069-4eac-ba9e-66d0335056f4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SYL-BEANIB	Beanibazar	বিয়ানীবাজার	7c157b25-0029-48cf-ba83-b199c6dfe492	Sylhet	OUTSIDE_DHAKA	["Beanibazar", "বিয়ানীবাজার", "beanibazar", "বিয়ানীবাজার"]	["3170"]	bd-geo-2026-10
912cc170-0ab5-4525-b21e-35c45a3c528c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SYL-GOLAPG	Golapganj	গোলাপগঞ্জ	7c157b25-0029-48cf-ba83-b199c6dfe492	Sylhet	OUTSIDE_DHAKA	["Golapganj", "গোলাপগঞ্জ", "golapganj", "গোলাপগঞ্জ"]	["3160"]	bd-geo-2026-10
8df4b762-714d-4dbd-ab35-a5832e802f91	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SYL-SOUTHS	South Surma	দক্ষিণ সুরমা	7c157b25-0029-48cf-ba83-b199c6dfe492	Sylhet	OUTSIDE_DHAKA	["South Surma", "দক্ষিণ সুরমা", "south surma", "দক্ষিণ সুরমা"]	["3111"]	bd-geo-2026-10
b2b3e3fd-1023-4974-98d1-39f338cb4343	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DIVISION	BD-DIV-RAJS	Rajshahi	\N	\N	Rajshahi	\N	[]	[]	bd-geo-2026-10
de99a84a-5e46-40b1-afcf-6255435adba5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RJ-RAJ	Rajshahi	রাজশাহী	b2b3e3fd-1023-4974-98d1-39f338cb4343	Rajshahi	OUTSIDE_DHAKA	["Rajshahi", "রাজশাহী", "rajshahi", "রাজশাহী"]	[]	bd-geo-2026-10
1527e0e8-d4dc-4ed2-aa2e-80da2e68e30f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-RAJ-BOALIA	Boalia	বোয়ালিয়া	de99a84a-5e46-40b1-afcf-6255435adba5	Rajshahi	OUTSIDE_DHAKA	["Boalia", "বোয়ালিয়া", "boalia", "বোয়ালিয়া"]	["6000"]	bd-geo-2026-10
fd7a9485-f6ab-4a9c-8f8a-5aa9d4aae23f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-RAJ-MOTIHA	Motihar	মতিহার	de99a84a-5e46-40b1-afcf-6255435adba5	Rajshahi	OUTSIDE_DHAKA	["Motihar", "মতিহার", "motihar", "মতিহার"]	["6204"]	bd-geo-2026-10
d38b6bcb-5fa5-4caf-b150-733a8d09d4db	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-BAN-LAMA	Lama	লামা	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	Chattogram	OUTSIDE_DHAKA	["Lama", "লামা", "lama", "লামা"]	["4640"]	bd-geo-2026-10
0aa7c8d6-cc08-4eac-97e5-16b204a5e8ff	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-RAJ-RAJPAR	Rajpara	রাজপাড়া	de99a84a-5e46-40b1-afcf-6255435adba5	Rajshahi	OUTSIDE_DHAKA	["Rajpara", "রাজপাড়া", "rajpara", "রাজপাড়া"]	["6000"]	bd-geo-2026-10
859d94cc-0584-4309-a882-1a4f49f5380e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-RAJ-SHAHMA	Shah Makhdum	শাহ মখদুম	de99a84a-5e46-40b1-afcf-6255435adba5	Rajshahi	OUTSIDE_DHAKA	["Shah Makhdum", "শাহ মখদুম", "shah makhdum", "শাহ মখদুম"]	["6207"]	bd-geo-2026-10
f9595eff-1751-4a0e-a870-daae690ee6bf	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-RAJ-PABA	Paba	পবা	de99a84a-5e46-40b1-afcf-6255435adba5	Rajshahi	OUTSIDE_DHAKA	["Paba", "পবা", "paba", "পবা"]	["6210"]	bd-geo-2026-10
b1aa7f83-fe3d-4530-8849-70bdcf8d6268	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DIVISION	BD-DIV-KHUL	Khulna	\N	\N	Khulna	\N	[]	[]	bd-geo-2026-10
df253017-5eee-4c9e-b445-652266f12ef4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-KHU	Khulna	খুলনা	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Khulna", "খুলনা", "khulna", "খুলনা"]	[]	bd-geo-2026-10
325a254f-a652-4dab-882b-9fb2e25dc9d2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-KHU-KHULNA	Khulna Sadar	খুলনা সদর	df253017-5eee-4c9e-b445-652266f12ef4	Khulna	OUTSIDE_DHAKA	["Khulna Sadar", "খুলনা সদর", "sadar", "সদর"]	["9100"]	bd-geo-2026-10
ad94891d-6c0d-4b65-8f6a-27c31129335f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-KHU-SONADA	Sonadanga	সোনাডাঙ্গা	df253017-5eee-4c9e-b445-652266f12ef4	Khulna	OUTSIDE_DHAKA	["Sonadanga", "সোনাডাঙ্গা", "sonadanga", "সোনাডাঙ্গা"]	["9000"]	bd-geo-2026-10
a8ca354b-d978-4bc2-8ebe-99a9df4d4c42	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-KHU-KHALIS	Khalishpur	খালিশপুর	df253017-5eee-4c9e-b445-652266f12ef4	Khulna	OUTSIDE_DHAKA	["Khalishpur", "খালিশপুর", "khalishpur", "খালিশপুর"]	["9000"]	bd-geo-2026-10
55cb538a-191b-4962-849c-855eb55b126e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-KHU-DAULAT	Daulatpur	দৌলতপুর	df253017-5eee-4c9e-b445-652266f12ef4	Khulna	OUTSIDE_DHAKA	["Daulatpur", "দৌলতপুর", "daulatpur", "দৌলতপুর"]	["9202"]	bd-geo-2026-10
768cfa34-7791-42f0-8fff-da7f95a1ea45	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-KHU-RUPSHA	Rupsha	রূপসা	df253017-5eee-4c9e-b445-652266f12ef4	Khulna	OUTSIDE_DHAKA	["Rupsha", "রূপসা", "rupsha", "রূপসা"]	["9240"]	bd-geo-2026-10
902fcb60-98af-4406-8f15-98248e1c06c4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DIVISION	BD-DIV-BARI	Barishal	\N	\N	Barishal	\N	[]	[]	bd-geo-2026-10
4489fad5-9652-4a36-a268-bc41d4f56703	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-BA-BSL	Barisal	বরিশাল	902fcb60-98af-4406-8f15-98248e1c06c4	Barishal	OUTSIDE_DHAKA	["Barisal", "বরিশাল", "barisal", "barishal", "borishal", "বরিশাল"]	[]	bd-geo-2026-10
5019c7dc-bb89-411d-8ed2-cf109a2b7192	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BSL-BARISA	Barisal Sadar	বরিশাল সদর	4489fad5-9652-4a36-a268-bc41d4f56703	Barishal	OUTSIDE_DHAKA	["Barisal Sadar", "বরিশাল সদর", "sadar", "কোতোয়ালী"]	["8200"]	bd-geo-2026-10
de53b7f3-92e4-412a-887d-d922a3b20fcb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BSL-AIRPOR	Airport	বিমানবন্দর	4489fad5-9652-4a36-a268-bc41d4f56703	Barishal	OUTSIDE_DHAKA	["Airport", "বিমানবন্দর", "airport", "এয়ারপোর্ট"]	["8200"]	bd-geo-2026-10
47320250-a72f-48f9-9b01-66fe3ef8942d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BSL-BAKERG	Bakerganj	বাকেরগঞ্জ	4489fad5-9652-4a36-a268-bc41d4f56703	Barishal	OUTSIDE_DHAKA	["Bakerganj", "বাকেরগঞ্জ", "bakerganj", "বাকেরগঞ্জ"]	["8280"]	bd-geo-2026-10
2bfecef8-d08f-40a3-9e67-acb1dbf66ed0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BSL-BABUGA	Babuganj	বাবুগঞ্জ	4489fad5-9652-4a36-a268-bc41d4f56703	Barishal	OUTSIDE_DHAKA	["Babuganj", "বাবুগঞ্জ", "babuganj", "বাবুগঞ্জ"]	["8210"]	bd-geo-2026-10
c944e62f-5447-4da2-ac53-f956caa6332b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DIVISION	BD-DIV-RANG	Rangpur	\N	\N	Rangpur	\N	[]	[]	bd-geo-2026-10
cc645738-2185-4057-9500-bd2a753b3043	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RG-RGP	Rangpur	রংপুর	c944e62f-5447-4da2-ac53-f956caa6332b	Rangpur	OUTSIDE_DHAKA	["Rangpur", "রংপুর", "rangpur", "রংপুর"]	[]	bd-geo-2026-10
82c940a0-d778-47c1-837c-8e92d6e634a4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-RGP-RANGPU	Rangpur Sadar	রংপুর সদর	cc645738-2185-4057-9500-bd2a753b3043	Rangpur	OUTSIDE_DHAKA	["Rangpur Sadar", "রংপুর সদর", "sadar", "সদর"]	["5400"]	bd-geo-2026-10
fed14d6f-7f8c-429d-8634-3a87bd67adff	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-RGP-KOTWAL	Kotwali	কোতোয়ালী	cc645738-2185-4057-9500-bd2a753b3043	Rangpur	OUTSIDE_DHAKA	["Kotwali", "কোতোয়ালী", "kotwali", "কোতোয়ালী"]	["5400"]	bd-geo-2026-10
26d40e18-8feb-439a-849c-913427f88031	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-RGP-TAJHAT	Tajhat	তাজহাট	cc645738-2185-4057-9500-bd2a753b3043	Rangpur	OUTSIDE_DHAKA	["Tajhat", "তাজহাট", "tajhat", "তাজহাট"]	["5404"]	bd-geo-2026-10
72acb39a-ef49-4655-a2b9-4afeb17d47a9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-RGP-MITHAP	Mithapukur	মিঠাপুকুর	cc645738-2185-4057-9500-bd2a753b3043	Rangpur	OUTSIDE_DHAKA	["Mithapukur", "মিঠাপুকুর", "mithapukur", "মিঠাপুকুর"]	["5460"]	bd-geo-2026-10
bc01916e-f748-40a7-a72f-b05ecc3fbe6b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-RGP-PIRGAN	Pirganj	পীরগঞ্জ	cc645738-2185-4057-9500-bd2a753b3043	Rangpur	OUTSIDE_DHAKA	["Pirganj", "পীরগঞ্জ", "pirganj", "পীরগঞ্জ"]	["5470"]	bd-geo-2026-10
8de9b39e-667c-4a4d-a960-cab42193c49b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DIVISION	BD-DIV-MYME	Mymensingh	\N	\N	Mymensingh	\N	[]	[]	bd-geo-2026-10
3f8e2eb2-9723-43f5-a22f-ba24a8a44965	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-MY-MYM	Mymensingh	ময়মনসিংহ	8de9b39e-667c-4a4d-a960-cab42193c49b	Mymensingh	OUTSIDE_DHAKA	["Mymensingh", "ময়মনসিংহ", "mymensingh", "ময়মনসিংহ"]	[]	bd-geo-2026-10
d738484c-2cbd-4f55-a047-250f105c2afa	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-MYM-KOTWAL	Kotwali	কোতোয়ালী	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	Mymensingh	OUTSIDE_DHAKA	["Kotwali", "কোতোয়ালী", "kotwali", "সদর"]	["2200"]	bd-geo-2026-10
f77867e4-7150-49e0-a2c9-594f21c92705	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-MYM-MUKTAG	Muktagacha	মুক্তাগাছা	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	Mymensingh	OUTSIDE_DHAKA	["Muktagacha", "মুক্তাগাছা", "muktagacha", "মুক্তাগাছা"]	["2210"]	bd-geo-2026-10
d922d545-2a0c-462b-ad04-ddb2f1137ac8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-MYM-TRISHA	Trishal	ত্রিশাল	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	Mymensingh	OUTSIDE_DHAKA	["Trishal", "ত্রিশাল", "trishal", "ত্রিশাল"]	["2220"]	bd-geo-2026-10
07118ad3-9ba2-4df8-8755-be1013face0b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-MYM-BHALUK	Bhaluka	ভালুকা	3f8e2eb2-9723-43f5-a22f-ba24a8a44965	Mymensingh	OUTSIDE_DHAKA	["Bhaluka", "ভালুকা", "bhaluka", "ভালুকা"]	["2240"]	bd-geo-2026-10
fea9e74e-92b2-44ba-be49-37a7343b169d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-COM	Cumilla	কুমিল্লা	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Cumilla", "কুমিল্লা", "cumilla", "comilla", "কুমিল্লা"]	[]	bd-geo-2026-10
d5d71dd0-3c2f-4db9-a46f-e15310c877b4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-COM-CUMILL	Cumilla Adarsha Sadar	কুমিল্লা আদর্শ সদর	fea9e74e-92b2-44ba-be49-37a7343b169d	Chattogram	OUTSIDE_DHAKA	["Cumilla Adarsha Sadar", "কুমিল্লা আদর্শ সদর", "sadar", "সদর"]	["3500"]	bd-geo-2026-10
519bdb84-fe78-4087-9fb2-76d7005da1a4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-COM-LAKSAM	Laksam	লাকসাম	fea9e74e-92b2-44ba-be49-37a7343b169d	Chattogram	OUTSIDE_DHAKA	["Laksam", "লাকসাম", "laksam", "লাকসাম"]	["3570"]	bd-geo-2026-10
761e61a8-72be-4e20-a2a4-6988448e173c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-COM-DAUDKA	Daudkandi	দাউদকান্দি	fea9e74e-92b2-44ba-be49-37a7343b169d	Chattogram	OUTSIDE_DHAKA	["Daudkandi", "দাউদকান্দি", "daudkandi", "দাউদকান্দি"]	["3516"]	bd-geo-2026-10
a26a2632-e6b2-4bff-8fe8-f67332c73a49	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RJ-BOG	Bogura	বগুড়া	b2b3e3fd-1023-4974-98d1-39f338cb4343	Rajshahi	OUTSIDE_DHAKA	["Bogura", "বগুড়া", "bogura", "bogra", "বগুড়া", "বগুড়া"]	[]	bd-geo-2026-10
a4b21748-3e2b-4cd4-977d-432513c18a57	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-BOG-BOGURA	Bogura Sadar	বগুড়া সদর	a26a2632-e6b2-4bff-8fe8-f67332c73a49	Rajshahi	OUTSIDE_DHAKA	["Bogura Sadar", "বগুড়া সদর", "sadar", "সদর"]	["5800"]	bd-geo-2026-10
5156a8a4-515e-401d-8014-20875d097dd5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-BOG-SHAJAH	Shajahanpur	শাজাহানপুর	a26a2632-e6b2-4bff-8fe8-f67332c73a49	Rajshahi	OUTSIDE_DHAKA	["Shajahanpur", "শাজাহানপুর", "shajahanpur", "শাজাহানপুর"]	["5801"]	bd-geo-2026-10
4b78f064-2681-4dcd-b1fc-025627c91404	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-BOG-SHERPU	Sherpur	শেরপুর	a26a2632-e6b2-4bff-8fe8-f67332c73a49	Rajshahi	OUTSIDE_DHAKA	["Sherpur", "শেরপুর", "sherpur", "শেরপুর"]	["5840"]	bd-geo-2026-10
21556bc1-34c9-4c01-8479-469178a3d6a8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-COX	Cox's Bazar	কক্সবাজার	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Cox's Bazar", "কক্সবাজার", "cox's bazar", "coxs bazar", "coxsbazar", "কক্সবাজার"]	[]	bd-geo-2026-10
a4687d4e-691a-45d9-a802-ea5b3e7ef905	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-COX-COXSBA	Cox's Bazar Sadar	কক্সবাজার সদর	21556bc1-34c9-4c01-8479-469178a3d6a8	Chattogram	OUTSIDE_DHAKA	["Cox's Bazar Sadar", "কক্সবাজার সদর", "sadar", "সদর"]	["4700"]	bd-geo-2026-10
c06807f4-560a-4390-a435-5c90a8baf9ec	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-COX-TEKNAF	Teknaf	টেকনাফ	21556bc1-34c9-4c01-8479-469178a3d6a8	Chattogram	OUTSIDE_DHAKA	["Teknaf", "টেকনাফ", "teknaf", "টেকনাফ"]	["4760"]	bd-geo-2026-10
d9202e12-6beb-4f03-a816-5f2468717379	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-COX-RAMU	Ramu	রামু	21556bc1-34c9-4c01-8479-469178a3d6a8	Chattogram	OUTSIDE_DHAKA	["Ramu", "রামু", "ramu", "রামু"]	["4730"]	bd-geo-2026-10
34e4157d-31a8-429d-abe7-2bbc447d6522	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-COX-CHAKAR	Chakaria	চকোরিয়া	21556bc1-34c9-4c01-8479-469178a3d6a8	Chattogram	OUTSIDE_DHAKA	["Chakaria", "চকোরিয়া", "chakaria", "চকোরিয়া"]	["4740"]	bd-geo-2026-10
37e47064-a709-4827-a511-58b10aec2dc7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-JES	Jessore	যশোর	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Jessore", "যশোর", "jessore", "jashore", "যশোর"]	[]	bd-geo-2026-10
86efba33-5a99-447e-a96b-9739afb35d04	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-JES-KOTWAL	Kotwali	কোতোয়ালী	37e47064-a709-4827-a511-58b10aec2dc7	Khulna	OUTSIDE_DHAKA	["Kotwali", "কোতোয়ালী", "kotwali", "সদর"]	["7400"]	bd-geo-2026-10
d8ab52ee-6177-4fa1-be04-d3dcad6d04e1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-JES-JHIKAR	Jhikargachha	ঝিকরগাছা	37e47064-a709-4827-a511-58b10aec2dc7	Khulna	OUTSIDE_DHAKA	["Jhikargachha", "ঝিকরগাছা", "jhikargachha", "ঝিকরগাছা"]	["7420"]	bd-geo-2026-10
78ac7d6a-dec2-4afb-8b09-f322a234b8b7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-JES-BENAPO	Benapole	বেনাপোল	37e47064-a709-4827-a511-58b10aec2dc7	Khulna	OUTSIDE_DHAKA	["Benapole", "বেনাপোল", "benapole", "বেনাপোল"]	["7431"]	bd-geo-2026-10
eeeebdab-25f2-46ce-b544-938c3438bd80	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-MUN	Munshiganj	মুন্সীগঞ্জ	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	DHAKA_SUBURBS	["Munshiganj", "মুন্সীগঞ্জ", "munshiganj", "munshigonj", "মুন্সীগঞ্জ"]	[]	bd-geo-2026-10
1ecbad5e-59f1-4f80-aadf-1e384c98dbe4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MUN-MUNSHI	Munshiganj Sadar	মুন্সীগঞ্জ সদর	eeeebdab-25f2-46ce-b544-938c3438bd80	Dhaka	DHAKA_SUBURBS	["Munshiganj Sadar", "মুন্সীগঞ্জ সদর", "sadar", "সদর"]	["1500"]	bd-geo-2026-10
7ebfe366-eccb-416a-ad4a-4c39f228b50d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MUN-SRINAG	Srinagar	শ্রীনগর	eeeebdab-25f2-46ce-b544-938c3438bd80	Dhaka	DHAKA_SUBURBS	["Srinagar", "শ্রীনগর", "srinagar", "শ্রীনগর"]	["1550"]	bd-geo-2026-10
b7e97562-f9f5-4a25-a8ee-d5ef9a20ac68	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MUN-LOHAJA	Lohajang	লৌহজং	eeeebdab-25f2-46ce-b544-938c3438bd80	Dhaka	DHAKA_SUBURBS	["Lohajang", "লৌহজং", "lohajang", "লৌহজং"]	["1530"]	bd-geo-2026-10
99d66c7f-27bc-4478-8c18-547224d7bb91	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MUN-GAJARI	Gajaria	গজারিয়া	eeeebdab-25f2-46ce-b544-938c3438bd80	Dhaka	DHAKA_SUBURBS	["Gajaria", "গজারিয়া", "gajaria", "গজারিয়া"]	["1510"]	bd-geo-2026-10
2d841529-90e8-45b5-9afa-32d2e326b281	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-MAN	Manikganj	মানিকগঞ্জ	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	DHAKA_SUBURBS	["Manikganj", "মানিকগঞ্জ", "manikganj", "মানিকগঞ্জ"]	[]	bd-geo-2026-10
48e303b2-3f6b-4e04-8ecd-46966ed6212d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MAN-MANIKG	Manikganj Sadar	মানিকগঞ্জ সদর	2d841529-90e8-45b5-9afa-32d2e326b281	Dhaka	DHAKA_SUBURBS	["Manikganj Sadar", "মানিকগঞ্জ সদর", "sadar", "সদর"]	["1800"]	bd-geo-2026-10
4d60fdc8-06ea-461d-bcea-74acedfaf867	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MAN-SINGAI	Singair	সিংগাইর	2d841529-90e8-45b5-9afa-32d2e326b281	Dhaka	DHAKA_SUBURBS	["Singair", "সিংগাইর", "singair", "সিংগাইর"]	["1820"]	bd-geo-2026-10
ce0144b9-87fe-45f5-8ce3-75b2cb98dbf5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MAN-SATURI	Saturia	সাটুরিয়া	2d841529-90e8-45b5-9afa-32d2e326b281	Dhaka	DHAKA_SUBURBS	["Saturia", "সাটুরিয়া", "saturia", "সাটুরিয়া"]	["1810"]	bd-geo-2026-10
9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-NAR	Narsingdi	নরসিংদী	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	DHAKA_SUBURBS	["Narsingdi", "নরসিংদী", "narsingdi", "norshingdi", "নরসিংদী"]	[]	bd-geo-2026-10
8cf4f23a-cef7-4a23-b3cd-c275fb71fbc1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NAR-NARSIN	Narsingdi Sadar	নরসিংদী সদর	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	Dhaka	DHAKA_SUBURBS	["Narsingdi Sadar", "নরসিংদী সদর", "sadar", "সদর"]	["1600"]	bd-geo-2026-10
ff08127a-9795-421b-a05f-84a37769b09f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NAR-PALASH	Palash	পলাশ	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	Dhaka	DHAKA_SUBURBS	["Palash", "পলাশ", "palash", "পলাশ"]	["1610"]	bd-geo-2026-10
b9643047-21e7-4318-9e87-158b5dbfc6ad	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-NAR-RAIPUR	Raipura	রায়পুরা	9da0acfa-2ba6-45cd-8a17-ffd2bd4a78f3	Dhaka	DHAKA_SUBURBS	["Raipura", "রায়পুরা", "raipura", "রায়পুরা"]	["1630"]	bd-geo-2026-10
3affb216-2d28-4d61-82b4-c1c9d03be816	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-TAN	Tangail	টাঙ্গাইল	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	OUTSIDE_DHAKA	["Tangail", "টাঙ্গাইল", "tangail", "টাঙ্গাইল"]	[]	bd-geo-2026-10
44f6182a-1e61-4fe8-b35d-330c88c25bc5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-TAN-TANGAI	Tangail Sadar	টাঙ্গাইল সদর	3affb216-2d28-4d61-82b4-c1c9d03be816	Dhaka	OUTSIDE_DHAKA	["Tangail Sadar", "টাঙ্গাইল সদর", "sadar", "সদর"]	["1900"]	bd-geo-2026-10
778ff1e1-2945-477c-aaa7-a642aee8edde	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-TAN-MIRZAP	Mirzapur	মির্জাপুর	3affb216-2d28-4d61-82b4-c1c9d03be816	Dhaka	OUTSIDE_DHAKA	["Mirzapur", "মির্জাপুর", "mirzapur", "মির্জাপুর"]	["1940"]	bd-geo-2026-10
ab8ca718-c7fa-4bd0-af72-8809ca8cb903	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-TAN-KALIHA	Kalihati	কালিহাতী	3affb216-2d28-4d61-82b4-c1c9d03be816	Dhaka	OUTSIDE_DHAKA	["Kalihati", "কালিহাতী", "kalihati", "কালিহাতী"]	["1970"]	bd-geo-2026-10
9deefa82-0afc-4f7a-8798-87c6481658bb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-TAN-SAKHIP	Sakhipur	সখীপুর	3affb216-2d28-4d61-82b4-c1c9d03be816	Dhaka	OUTSIDE_DHAKA	["Sakhipur", "সখীপুর", "sakhipur", "সখীপুর"]	["1950"]	bd-geo-2026-10
7e685835-f96a-45af-b3f1-27aa0e1f5084	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-KIS	Kishoreganj	কিশোরগঞ্জ	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	OUTSIDE_DHAKA	["Kishoreganj", "কিশোরগঞ্জ", "kishoreganj", "kishoregonj", "কিশোরগঞ্জ"]	[]	bd-geo-2026-10
ec83bcee-cc21-4cdd-8404-3b04b56f8aad	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-KIS-KISHOR	Kishoreganj Sadar	কিশোরগঞ্জ সদর	7e685835-f96a-45af-b3f1-27aa0e1f5084	Dhaka	OUTSIDE_DHAKA	["Kishoreganj Sadar", "কিশোরগঞ্জ সদর", "sadar", "সদর"]	["2300"]	bd-geo-2026-10
03b4b120-2d76-4578-b5e7-e0075383ea04	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-KIS-BHAIRA	Bhairab	ভৈরব	7e685835-f96a-45af-b3f1-27aa0e1f5084	Dhaka	OUTSIDE_DHAKA	["Bhairab", "ভৈরব", "bhairab", "ভৈরব"]	["2350"]	bd-geo-2026-10
17f43242-3a24-4385-8ade-5149394acdf8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-KIS-KULIAR	Kuliarchar	কুলিয়ারচর	7e685835-f96a-45af-b3f1-27aa0e1f5084	Dhaka	OUTSIDE_DHAKA	["Kuliarchar", "কুলিয়ারচর", "kuliarchar", "কুলিয়ারচর"]	["2340"]	bd-geo-2026-10
f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-FAR	Faridpur	ফরিদপুর	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	OUTSIDE_DHAKA	["Faridpur", "ফরিদপুর", "faridpur", "ফরিদপুর"]	[]	bd-geo-2026-10
11200fe1-45a2-4f5e-88d6-0418ac03d594	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-FAR-FARIDP	Faridpur Sadar	ফরিদপুর সদর	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	Dhaka	OUTSIDE_DHAKA	["Faridpur Sadar", "ফরিদপুর সদর", "kotwali", "sadar", "সদর"]	["7800"]	bd-geo-2026-10
33976f23-ed8c-4c65-b813-ad5662d7b430	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-FAR-BHANGA	Bhanga	ভাঙ্গা	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	Dhaka	OUTSIDE_DHAKA	["Bhanga", "ভাঙ্গা", "bhanga", "ভাঙ্গা"]	["7830"]	bd-geo-2026-10
6c45a0c2-549a-4ba7-a5bf-caa46f74228f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-FAR-ALFADA	Alfadanga	আলফাডাঙ্গা	f83b6d0d-9b7b-442c-9ea4-0a6336d70a43	Dhaka	OUTSIDE_DHAKA	["Alfadanga", "আলফাডাঙ্গা", "alfadanga", "আলফাডাঙ্গা"]	["7870"]	bd-geo-2026-10
8f24e9c1-07cf-41c7-aa00-9f18dade01b6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-GOP	Gopalganj	গোপালগঞ্জ	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	OUTSIDE_DHAKA	["Gopalganj", "গোপালগঞ্জ", "gopalganj", "gopalgonj", "গোপালগঞ্জ"]	[]	bd-geo-2026-10
bacd6a15-f91b-4836-b89f-e2f3aada8697	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-GOP-GOPALG	Gopalganj Sadar	গোপালগঞ্জ সদর	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	Dhaka	OUTSIDE_DHAKA	["Gopalganj Sadar", "গোপালগঞ্জ সদর", "sadar", "সদর"]	["8100"]	bd-geo-2026-10
84cedd73-429f-4842-8263-30a8b813a96e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-GOP-TUNGIP	Tungipara	টুঙ্গিপাড়া	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	Dhaka	OUTSIDE_DHAKA	["Tungipara", "টুঙ্গিপাড়া", "tungipara", "টুঙ্গিপাড়া"]	["8120"]	bd-geo-2026-10
1cb81e7a-1e65-41be-8afd-b638a873e443	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-GOP-KOTALI	Kotalipara	কোটালীপাড়া	8f24e9c1-07cf-41c7-aa00-9f18dade01b6	Dhaka	OUTSIDE_DHAKA	["Kotalipara", "কোটালীপাড়া", "kotalipara", "কোটালীপাড়া"]	["8110"]	bd-geo-2026-10
f9332172-7447-450d-987d-c849b5ae8e5b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-MAD	Madaripur	মাদারীপুর	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	OUTSIDE_DHAKA	["Madaripur", "মাদারীপুর", "madaripur", "মাদারীপুর"]	[]	bd-geo-2026-10
6d497de5-7daf-4467-a75c-99dbc5faabdf	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MAD-MADARI	Madaripur Sadar	মাদারীপুর সদর	f9332172-7447-450d-987d-c849b5ae8e5b	Dhaka	OUTSIDE_DHAKA	["Madaripur Sadar", "মাদারীপুর সদর", "sadar", "সদর"]	["7900"]	bd-geo-2026-10
d19d094b-2033-47e3-9cb6-cb07fb399749	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MAD-SHIBCH	Shibchar	শিবচর	f9332172-7447-450d-987d-c849b5ae8e5b	Dhaka	OUTSIDE_DHAKA	["Shibchar", "শিবচর", "shibchar", "শিবচর"]	["7930"]	bd-geo-2026-10
2cfff030-d141-4656-a8b4-7e673a56449c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-MAD-KALKIN	Kalkini	কালকিনি	f9332172-7447-450d-987d-c849b5ae8e5b	Dhaka	OUTSIDE_DHAKA	["Kalkini", "কালকিনি", "kalkini", "কালকিনি"]	["7920"]	bd-geo-2026-10
12cbb80c-f6a8-4df5-a815-9b06d991e233	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-RAJ	Rajbari	রাজবাড়ী	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	OUTSIDE_DHAKA	["Rajbari", "রাজবাড়ী", "rajbari", "রাজবাড়ী"]	[]	bd-geo-2026-10
6d01a124-6a6e-4326-aabb-4897a5709ceb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-RAJ-RAJBAR	Rajbari Sadar	রাজবাড়ী সদর	12cbb80c-f6a8-4df5-a815-9b06d991e233	Dhaka	OUTSIDE_DHAKA	["Rajbari Sadar", "রাজবাড়ী সদর", "sadar", "সদর"]	["7700"]	bd-geo-2026-10
b9fc7ec3-3004-4523-8d0a-f921aa3b61ed	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-RAJ-PANGSH	Pangsha	পাংশা	12cbb80c-f6a8-4df5-a815-9b06d991e233	Dhaka	OUTSIDE_DHAKA	["Pangsha", "পাংশা", "pangsha", "পাংশা"]	["7720"]	bd-geo-2026-10
a7af0fcb-87f2-482b-99a3-9545244b9714	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-RAJ-GOALAN	Goalanda	গোয়ালন্দ	12cbb80c-f6a8-4df5-a815-9b06d991e233	Dhaka	OUTSIDE_DHAKA	["Goalanda", "গোয়ালন্দ", "goalanda", "গোয়ালন্দ"]	["7710"]	bd-geo-2026-10
8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-DH-SHA	Shariatpur	শরীয়তপুর	aaf54bfb-c64b-404f-935e-7e10b499c441	Dhaka	OUTSIDE_DHAKA	["Shariatpur", "শরীয়তপুর", "shariatpur", "শরীয়তপুর"]	[]	bd-geo-2026-10
d823daba-b8f9-495b-bf8c-67bbd1ad0b89	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-SHA-SHARIA	Shariatpur Sadar	শরীয়তপুর সদর	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	Dhaka	OUTSIDE_DHAKA	["Shariatpur Sadar", "শরীয়তপুর সদর", "palong", "sadar", "সদর"]	["8000"]	bd-geo-2026-10
2351083b-7d19-492e-85f1-288cc594c88e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-SHA-NARIA	Naria	নড়িয়া	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	Dhaka	OUTSIDE_DHAKA	["Naria", "নড়িয়া", "naria", "নড়িয়া"]	["8020"]	bd-geo-2026-10
67a0373e-a682-4634-810e-3012a7e3cb47	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-DH-SHA-ZAJIRA	Zajira	জাজিরা	8c8aaaf8-e9a2-4adc-9f0e-448bc4318348	Dhaka	OUTSIDE_DHAKA	["Zajira", "জাজিরা", "zajira", "জাজিরা"]	["8010"]	bd-geo-2026-10
01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-NOA	Noakhali	নোয়াখালী	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Noakhali", "নোয়াখালী", "noakhali", "নোয়াখালী"]	[]	bd-geo-2026-10
eebccfdb-b052-4648-9670-00d16ddd99aa	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-NOA-NOAKHA	Noakhali Sadar	নোয়াখালী সদর	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	Chattogram	OUTSIDE_DHAKA	["Noakhali Sadar", "নোয়াখালী সদর", "sudharam", "sadar", "সদর"]	["3800"]	bd-geo-2026-10
1fb54d67-6b62-4991-b169-a3af0d103a37	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-NOA-BEGUMG	Begumganj	বেগমগঞ্জ	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	Chattogram	OUTSIDE_DHAKA	["Begumganj", "বেগমগঞ্জ", "begumganj", "বেগমগঞ্জ"]	["3820"]	bd-geo-2026-10
6fecc019-2516-431d-ab2f-d9d7676851e8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-NOA-SENBAG	Senbagh	সেনবাগ	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	Chattogram	OUTSIDE_DHAKA	["Senbagh", "সেনবাগ", "senbagh", "সেনবাগ"]	["3830"]	bd-geo-2026-10
af22716f-5b01-4991-a809-462634ec33b8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-NOA-HATIYA	Hatiya	হাতিয়া	01d97a51-88d5-4a2c-99f6-d6a7aaf09ffa	Chattogram	OUTSIDE_DHAKA	["Hatiya", "হাতিয়া", "hatiya", "হাতিয়া"]	["3890"]	bd-geo-2026-10
398507b3-880a-4968-aa70-0d515b8b505b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-FEN	Feni	ফেনী	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Feni", "ফেনী", "feni", "ফেনী"]	[]	bd-geo-2026-10
d7cc6192-5250-4fc6-92c2-eaa656c06d9c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-FEN-FENISA	Feni Sadar	ফেনী সদর	398507b3-880a-4968-aa70-0d515b8b505b	Chattogram	OUTSIDE_DHAKA	["Feni Sadar", "ফেনী সদর", "sadar", "সদর"]	["3900"]	bd-geo-2026-10
3ad15d56-8eae-46be-af70-94759a470d6f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-FEN-DAGANB	Daganbhuiyan	দাগনভূঞা	398507b3-880a-4968-aa70-0d515b8b505b	Chattogram	OUTSIDE_DHAKA	["Daganbhuiyan", "দাগনভূঞা", "daganbhuiyan", "দাগনভূঞা"]	["3920"]	bd-geo-2026-10
bbc05303-7e7c-417f-803e-fd2893f47c4d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-FEN-SONAGA	Sonagazi	সোনাগাজী	398507b3-880a-4968-aa70-0d515b8b505b	Chattogram	OUTSIDE_DHAKA	["Sonagazi", "সোনাগাজী", "sonagazi", "সোনাগাজী"]	["3930"]	bd-geo-2026-10
93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-LAK	Lakshmipur	লক্ষ্মীপুর	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Lakshmipur", "লক্ষ্মীপুর", "lakshmipur", "laxmipur", "লক্ষ্মীপুর"]	[]	bd-geo-2026-10
b85fae15-c9bb-45e1-9a69-7fca781aea1d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-LAK-LAKSHM	Lakshmipur Sadar	লক্ষ্মীপুর সদর	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	Chattogram	OUTSIDE_DHAKA	["Lakshmipur Sadar", "লক্ষ্মীপুর সদর", "sadar", "সদর"]	["3700"]	bd-geo-2026-10
2758f92e-9d6a-4257-97d7-c7928b947914	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-LAK-RAIPUR	Raipur	রায়পুর	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	Chattogram	OUTSIDE_DHAKA	["Raipur", "রায়পুর", "raipur", "রায়পুর"]	["3710"]	bd-geo-2026-10
74310b8e-cb4d-4eb8-933a-0d84be3ee423	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-LAK-RAMGAN	Ramganj	রামগঞ্জ	93be36c7-9dc4-48a4-8c1a-7c41fe9e7f50	Chattogram	OUTSIDE_DHAKA	["Ramganj", "রামগঞ্জ", "ramganj", "রামগঞ্জ"]	["3720"]	bd-geo-2026-10
cddba755-8413-4e3e-8961-dc9fdef4f38d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-CHA	Chandpur	চাঁদপুর	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Chandpur", "চাঁদপুর", "chandpur", "চাঁদপুর"]	[]	bd-geo-2026-10
61bf1661-0f67-49cb-9dbf-e637621ed6f1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CHA-CHANDP	Chandpur Sadar	চাঁদপুর সদর	cddba755-8413-4e3e-8961-dc9fdef4f38d	Chattogram	OUTSIDE_DHAKA	["Chandpur Sadar", "চাঁদপুর সদর", "sadar", "সদর"]	["3600"]	bd-geo-2026-10
93722b4e-1f64-4240-8e18-b3fc0c322016	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CHA-HAJIGA	Hajiganj	হাজীগঞ্জ	cddba755-8413-4e3e-8961-dc9fdef4f38d	Chattogram	OUTSIDE_DHAKA	["Hajiganj", "হাজীগঞ্জ", "hajiganj", "হাজীগঞ্জ"]	["3610"]	bd-geo-2026-10
7847e841-7254-42be-9383-c9ed1de8491b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-CHA-MATLAB	Matlab Dakshin	মতলব দক্ষিণ	cddba755-8413-4e3e-8961-dc9fdef4f38d	Chattogram	OUTSIDE_DHAKA	["Matlab Dakshin", "মতলব দক্ষিণ", "matlab", "মতলব"]	["3640"]	bd-geo-2026-10
fe8ddadf-9391-45a7-b423-9b1d1caeba6e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-BRA	Brahmanbaria	ব্রাহ্মণবাড়িয়া	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Brahmanbaria", "ব্রাহ্মণবাড়িয়া", "brahmanbaria", "bbaria", "ব্রাহ্মণবাড়িয়া"]	[]	bd-geo-2026-10
56149e9f-d321-475a-bb46-43b01c9d58d7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-BRA-BRAHMA	Brahmanbaria Sadar	ব্রাহ্মণবাড়িয়া সদর	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	Chattogram	OUTSIDE_DHAKA	["Brahmanbaria Sadar", "ব্রাহ্মণবাড়িয়া সদর", "sadar", "সদর"]	["3400"]	bd-geo-2026-10
c6533510-86cf-48a8-9dae-152d8418c632	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-BRA-ASHUGA	Ashuganj	আশুগঞ্জ	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	Chattogram	OUTSIDE_DHAKA	["Ashuganj", "আশুগঞ্জ", "ashuganj", "আশুগঞ্জ"]	["3410"]	bd-geo-2026-10
3a42f2bb-669d-450a-ad42-ff6d819da400	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-BRA-NABINA	Nabinagar	নবীনগর	fe8ddadf-9391-45a7-b423-9b1d1caeba6e	Chattogram	OUTSIDE_DHAKA	["Nabinagar", "নবীনগর", "nabinagar", "নবীনগর"]	["3430"]	bd-geo-2026-10
7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-KHA	Khagrachhari	খাগড়াছড়ি	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Khagrachhari", "খাগড়াছড়ি", "khagrachhari", "khagrachari", "খাগড়াছড়ি"]	[]	bd-geo-2026-10
0b8e833a-f787-4865-9516-dd7c86ef0125	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-KHA-KHAGRA	Khagrachhari Sadar	খাগড়াছড়ি সদর	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	Chattogram	OUTSIDE_DHAKA	["Khagrachhari Sadar", "খাগড়াছড়ি সদর", "sadar", "সদর"]	["4400"]	bd-geo-2026-10
f7e3f0d7-780a-4cae-b809-42c6232d711b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-KHA-DIGHIN	Dighinala	দীঘিনালা	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	Chattogram	OUTSIDE_DHAKA	["Dighinala", "দীঘিনালা", "dighinala", "দীঘিনালা"]	["4420"]	bd-geo-2026-10
c18928af-8ac7-4c7b-9b31-d3be030aee8e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-KHA-MATIRA	Matiranga	মাটিরাঙ্গা	7b4b9b38-71a4-4178-a20f-1f6d0bc9d090	Chattogram	OUTSIDE_DHAKA	["Matiranga", "মাটিরাঙ্গা", "matiranga", "মাটিরাঙ্গা"]	["4450"]	bd-geo-2026-10
799329f2-bcfd-4262-ac22-bc32971b7ac1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-RAN	Rangamati	রাঙ্গামাটি	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Rangamati", "রাঙ্গামাটি", "rangamati", "রাঙ্গামাটি"]	[]	bd-geo-2026-10
09e925aa-31a5-4595-961a-7769bae4bf75	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-RAN-RANGAM	Rangamati Sadar	রাঙ্গামাটি সদর	799329f2-bcfd-4262-ac22-bc32971b7ac1	Chattogram	OUTSIDE_DHAKA	["Rangamati Sadar", "রাঙ্গামাটি সদর", "kotwali", "sadar", "সদর"]	["4500"]	bd-geo-2026-10
f5e6ec05-23a6-4150-81a3-dd87792cfdce	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-RAN-KAPTAI	Kaptai	কাপ্তাই	799329f2-bcfd-4262-ac22-bc32971b7ac1	Chattogram	OUTSIDE_DHAKA	["Kaptai", "কাপ্তাই", "kaptai", "কাপ্তাই"]	["4530"]	bd-geo-2026-10
73940b7c-a98c-4adc-bf20-469f24354675	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-RAN-BAGHAI	Baghaichhari	বাঘাইছড়ি	799329f2-bcfd-4262-ac22-bc32971b7ac1	Chattogram	OUTSIDE_DHAKA	["Baghaichhari", "বাঘাইছড়ি", "baghaichhari", "বাঘাইছড়ি"]	["4570"]	bd-geo-2026-10
a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-CH-BAN	Bandarban	বান্দরবান	d5b52c9b-3942-41d3-8337-9d1da68e7266	Chattogram	OUTSIDE_DHAKA	["Bandarban", "বান্দরবান", "bandarban", "বান্দরবান"]	[]	bd-geo-2026-10
f618fb4c-8356-4301-a35f-3fb1ecaebdee	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-BAN-BANDAR	Bandarban Sadar	বান্দরবান সদর	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	Chattogram	OUTSIDE_DHAKA	["Bandarban Sadar", "বান্দরবান সদর", "sadar", "সদর"]	["4600"]	bd-geo-2026-10
f1efa3e2-f244-45c8-8401-dc68a1269eb3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-CH-BAN-ALIKAD	Alikadam	আলীকদম	a7346b9a-2a2e-4b15-9f4e-a43716e7e61d	Chattogram	OUTSIDE_DHAKA	["Alikadam", "আলীকদম", "alikadam", "আলীকদম"]	["4650"]	bd-geo-2026-10
93a865dd-5097-4db1-9692-f8cee696b7ca	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RJ-PAB	Pabna	পাবনা	b2b3e3fd-1023-4974-98d1-39f338cb4343	Rajshahi	OUTSIDE_DHAKA	["Pabna", "পাবনা", "pabna", "পাবনা"]	[]	bd-geo-2026-10
fcad3bc9-4bfc-45f9-908d-30fd119e40fe	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-PAB-PABNAS	Pabna Sadar	পাবনা সদর	93a865dd-5097-4db1-9692-f8cee696b7ca	Rajshahi	OUTSIDE_DHAKA	["Pabna Sadar", "পাবনা সদর", "sadar", "সদর"]	["6600"]	bd-geo-2026-10
d006427a-0b5a-462a-b733-6890f7cd3adc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-PAB-ISHWAR	Ishwardi	ঈশ্বরদী	93a865dd-5097-4db1-9692-f8cee696b7ca	Rajshahi	OUTSIDE_DHAKA	["Ishwardi", "ঈশ্বরদী", "ishwardi", "ঈশ্বরদী"]	["6620"]	bd-geo-2026-10
bcb46d93-5b27-4692-b950-4c9f0504cd11	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-PAB-BERA	Bera	বেড়া	93a865dd-5097-4db1-9692-f8cee696b7ca	Rajshahi	OUTSIDE_DHAKA	["Bera", "বেড়া", "bera", "বেড়া"]	["6640"]	bd-geo-2026-10
2d91c986-0ec2-47cf-9345-13ac0419e3b5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RJ-NAT	Natore	নাটোর	b2b3e3fd-1023-4974-98d1-39f338cb4343	Rajshahi	OUTSIDE_DHAKA	["Natore", "নাটোর", "natore", "নাটোর"]	[]	bd-geo-2026-10
51087f68-3eeb-4bd3-a79f-930ea9c6579a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-NAT-NATORE	Natore Sadar	নাটোর সদর	2d91c986-0ec2-47cf-9345-13ac0419e3b5	Rajshahi	OUTSIDE_DHAKA	["Natore Sadar", "নাটোর সদর", "sadar", "সদর"]	["6400"]	bd-geo-2026-10
045cbeee-89de-4bc5-925e-8c444dd6e1c2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-NAT-SINGRA	Singra	সিংড়া	2d91c986-0ec2-47cf-9345-13ac0419e3b5	Rajshahi	OUTSIDE_DHAKA	["Singra", "সিংড়া", "singra", "সিংড়া"]	["6450"]	bd-geo-2026-10
e1052cc8-de10-4f0e-ae45-11ed7dfc5091	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-NAT-BARAIG	Baraigram	বড়াইগ্রাম	2d91c986-0ec2-47cf-9345-13ac0419e3b5	Rajshahi	OUTSIDE_DHAKA	["Baraigram", "বড়াইগ্রাম", "baraigram", "বড়াইগ্রাম"]	["6430"]	bd-geo-2026-10
6c8b5d44-4577-45e7-9253-40ec7ca6f55c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RJ-NAO	Naogaon	নওগাঁ	b2b3e3fd-1023-4974-98d1-39f338cb4343	Rajshahi	OUTSIDE_DHAKA	["Naogaon", "নওগাঁ", "naogaon", "নওগাঁ"]	[]	bd-geo-2026-10
3d119431-6b73-4cbe-99d1-540d7b1ca6b2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-NAO-NAOGAO	Naogaon Sadar	নওগাঁ সদর	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	Rajshahi	OUTSIDE_DHAKA	["Naogaon Sadar", "নওগাঁ সদর", "sadar", "সদর"]	["6500"]	bd-geo-2026-10
77da8327-3aed-48a3-87fb-8af7f68ac5c2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-NAO-MANDA	Manda	মান্দা	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	Rajshahi	OUTSIDE_DHAKA	["Manda", "মান্দা", "manda", "মান্দা"]	["6510"]	bd-geo-2026-10
df3813a5-e8d1-4c93-a5b4-549153d6a814	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-NAO-SAPAHA	Sapahar	সাপাহার	6c8b5d44-4577-45e7-9253-40ec7ca6f55c	Rajshahi	OUTSIDE_DHAKA	["Sapahar", "সাপাহার", "sapahar", "সাপাহার"]	["6570"]	bd-geo-2026-10
c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RJ-CHA	Chapai Nawabganj	চাঁপাইনবাবগঞ্জ	b2b3e3fd-1023-4974-98d1-39f338cb4343	Rajshahi	OUTSIDE_DHAKA	["Chapai Nawabganj", "চাঁপাইনবাবগঞ্জ", "chapai nawabganj", "chapainawabganj", "nawabganj", "চাঁপাইনবাবগঞ্জ"]	[]	bd-geo-2026-10
e257cd33-e12e-4344-b8ce-f29f6f07d796	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-CHA-CHAPAI	Chapai Nawabganj Sadar	চাঁপাইনবাবগঞ্জ সদর	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	Rajshahi	OUTSIDE_DHAKA	["Chapai Nawabganj Sadar", "চাঁপাইনবাবগঞ্জ সদর", "sadar", "সদর"]	["6300"]	bd-geo-2026-10
60d5398c-9628-4158-8ebf-b065739e4e93	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-CHA-SHIBGA	Shibganj	শিবগঞ্জ	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	Rajshahi	OUTSIDE_DHAKA	["Shibganj", "শিবগঞ্জ", "shibganj", "শিবগঞ্জ"]	["6340"]	bd-geo-2026-10
24465121-fd7a-4c81-9a35-d6ecd3f7dd43	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-CHA-GOMAST	Gomastapur	গোমস্তাপুর	c1bab6f5-4d77-47f2-8bfa-df4f225dd5aa	Rajshahi	OUTSIDE_DHAKA	["Gomastapur", "গোমস্তাপুর", "gomastapur", "গোমস্তাপুর"]	["6320"]	bd-geo-2026-10
d361886e-886a-4ac1-aa62-3a03bb1be9d8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RJ-SIR	Sirajganj	সিরাজগঞ্জ	b2b3e3fd-1023-4974-98d1-39f338cb4343	Rajshahi	OUTSIDE_DHAKA	["Sirajganj", "সিরাজগঞ্জ", "sirajganj", "সিরাজগঞ্জ"]	[]	bd-geo-2026-10
1c26e157-476e-4a5a-b807-5bcb98b59033	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-SIR-SIRAJG	Sirajganj Sadar	সিরাজগঞ্জ সদর	d361886e-886a-4ac1-aa62-3a03bb1be9d8	Rajshahi	OUTSIDE_DHAKA	["Sirajganj Sadar", "সিরাজগঞ্জ সদর", "sadar", "সদর"]	["6700"]	bd-geo-2026-10
3a6182a9-e113-41aa-b18d-65348d0afe3a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-SIR-SHAHJA	Shahjadpur	শাহজাদপুর	d361886e-886a-4ac1-aa62-3a03bb1be9d8	Rajshahi	OUTSIDE_DHAKA	["Shahjadpur", "শাহজাদপুর", "shahjadpur", "শাহজাদপুর"]	["6770"]	bd-geo-2026-10
e8a79546-69d3-453a-afdc-487f4278e48e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-SIR-ULLAPA	Ullapara	উল্লাপাড়া	d361886e-886a-4ac1-aa62-3a03bb1be9d8	Rajshahi	OUTSIDE_DHAKA	["Ullapara", "উল্লাপাড়া", "ullapara", "উল্লাপাড়া"]	["6760"]	bd-geo-2026-10
3bc060c0-b52c-49fb-8631-d54450363041	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RJ-JOY	Joypurhat	জয়পুরহাট	b2b3e3fd-1023-4974-98d1-39f338cb4343	Rajshahi	OUTSIDE_DHAKA	["Joypurhat", "জয়পুরহাট", "joypurhat", "জয়পুরহাট"]	[]	bd-geo-2026-10
18780175-910e-49e2-bd4d-514040ec4a87	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-JOY-JOYPUR	Joypurhat Sadar	জয়পুরহাট সদর	3bc060c0-b52c-49fb-8631-d54450363041	Rajshahi	OUTSIDE_DHAKA	["Joypurhat Sadar", "জয়পুরহাট সদর", "sadar", "সদর"]	["5900"]	bd-geo-2026-10
b320201b-97c1-4d79-9af8-a68b567e2c8e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-JOY-AKKELP	Akkelpur	আক্কেলপুর	3bc060c0-b52c-49fb-8631-d54450363041	Rajshahi	OUTSIDE_DHAKA	["Akkelpur", "আক্কেলপুর", "akkelpur", "আক্কেলপুর"]	["5940"]	bd-geo-2026-10
9091fd57-70b9-47ba-ad48-f755698d103a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RJ-JOY-PANCHB	Panchbibi	পাঁচবিবি	3bc060c0-b52c-49fb-8631-d54450363041	Rajshahi	OUTSIDE_DHAKA	["Panchbibi", "পাঁচবিবি", "panchbibi", "পাঁচবিবি"]	["5910"]	bd-geo-2026-10
31942bcd-34c5-4d34-87ce-ac399a67065e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-SAT	Satkhira	সাতক্ষীরা	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Satkhira", "সাতক্ষীরা", "satkhira", "সাতক্ষীরা"]	[]	bd-geo-2026-10
60eef0b3-6987-4e5d-9e4c-32a86b51fd13	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-SAT-SATKHI	Satkhira Sadar	সাতক্ষীরা সদর	31942bcd-34c5-4d34-87ce-ac399a67065e	Khulna	OUTSIDE_DHAKA	["Satkhira Sadar", "সাতক্ষীরা সদর", "sadar", "সদর"]	["9400"]	bd-geo-2026-10
ecf5cc7d-ad78-4fd8-a056-6d21394482a0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-SAT-KALARO	Kalaroa	কলারোয়া	31942bcd-34c5-4d34-87ce-ac399a67065e	Khulna	OUTSIDE_DHAKA	["Kalaroa", "কলারোয়া", "kalaroa", "কলারোয়া"]	["9410"]	bd-geo-2026-10
62456d0b-c054-4be9-a43b-6b793b2107cd	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-SAT-TALA	Tala	তালা	31942bcd-34c5-4d34-87ce-ac399a67065e	Khulna	OUTSIDE_DHAKA	["Tala", "তালা", "tala", "তালা"]	["9430"]	bd-geo-2026-10
5f2da97e-b12f-4ae1-b593-fed665c4254a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-PAN-BODA	Boda	বোদা	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Rangpur	OUTSIDE_DHAKA	["Boda", "বোদা", "boda", "বোদা"]	["5010"]	bd-geo-2026-10
4d8a938d-b0fa-475b-ac82-3f6d323516f1	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-BAG	Bagerhat	বাগেরহাট	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Bagerhat", "বাগেরহাট", "bagerhat", "বাগেরহাট"]	[]	bd-geo-2026-10
73700794-278b-41f8-8e8a-c387385a83d2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-BAG-BAGERH	Bagerhat Sadar	বাগেরহাট সদর	4d8a938d-b0fa-475b-ac82-3f6d323516f1	Khulna	OUTSIDE_DHAKA	["Bagerhat Sadar", "বাগেরহাট সদর", "sadar", "সদর"]	["9300"]	bd-geo-2026-10
9aeefeeb-c222-4f74-a189-dbea1214f2df	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-BAG-MONGLA	Mongla	মোংলা	4d8a938d-b0fa-475b-ac82-3f6d323516f1	Khulna	OUTSIDE_DHAKA	["Mongla", "মোংলা", "mongla", "মোংলা"]	["9350"]	bd-geo-2026-10
1f285d01-5530-48c1-8223-65f0c1f67d3d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-BAG-MORREL	Morrelganj	মোড়েলগঞ্জ	4d8a938d-b0fa-475b-ac82-3f6d323516f1	Khulna	OUTSIDE_DHAKA	["Morrelganj", "মোড়েলগঞ্জ", "morrelganj", "মোড়েলগঞ্জ"]	["9320"]	bd-geo-2026-10
9d6d4592-6300-44bd-9417-4de213c18a82	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-KUS	Kushtia	কুষ্টিয়া	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Kushtia", "কুষ্টিয়া", "kushtia", "কুষ্টিয়া"]	[]	bd-geo-2026-10
85183850-6bc0-4107-a3c4-8cf1e3ccaf45	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-KUS-KUSHTI	Kushtia Sadar	কুষ্টিয়া সদর	9d6d4592-6300-44bd-9417-4de213c18a82	Khulna	OUTSIDE_DHAKA	["Kushtia Sadar", "কুষ্টিয়া সদর", "sadar", "সদর"]	["7000"]	bd-geo-2026-10
41155b2d-6ca5-48f2-84ed-a7ed433be919	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-KUS-BHERAM	Bheramara	ভেড়ামারা	9d6d4592-6300-44bd-9417-4de213c18a82	Khulna	OUTSIDE_DHAKA	["Bheramara", "ভেড়ামারা", "bheramara", "ভেড়ামারা"]	["7040"]	bd-geo-2026-10
27569240-e6ac-4302-a412-d74a0685a238	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-KUS-KUMARK	Kumarkhali	কুমারখালী	9d6d4592-6300-44bd-9417-4de213c18a82	Khulna	OUTSIDE_DHAKA	["Kumarkhali", "কুমারখালী", "kumarkhali", "কুমারখালী"]	["7010"]	bd-geo-2026-10
65b9be11-ba52-4d61-9ecd-272daa645fb5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-JHE	Jhenaidah	ঝিনাইদহ	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Jhenaidah", "ঝিনাইদহ", "jhenaidah", "jhenidah", "ঝিনাইদহ"]	[]	bd-geo-2026-10
d7852bab-7681-44e5-8ad6-4f933c7c960c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-JHE-JHENAI	Jhenaidah Sadar	ঝিনাইদহ সদর	65b9be11-ba52-4d61-9ecd-272daa645fb5	Khulna	OUTSIDE_DHAKA	["Jhenaidah Sadar", "ঝিনাইদহ সদর", "sadar", "সদর"]	["7300"]	bd-geo-2026-10
6689b13c-a8df-4ca7-9831-58ac0c505172	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-JHE-SHAILK	Shailkupa	শৈলকুপা	65b9be11-ba52-4d61-9ecd-272daa645fb5	Khulna	OUTSIDE_DHAKA	["Shailkupa", "শৈলকুপা", "shailkupa", "শৈলকুপা"]	["7320"]	bd-geo-2026-10
e2484f46-c622-42db-98e5-e8ecb95dd9da	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-JHE-KALIGA	Kaliganj	কালীগঞ্জ	65b9be11-ba52-4d61-9ecd-272daa645fb5	Khulna	OUTSIDE_DHAKA	["Kaliganj", "কালীগঞ্জ", "kaliganj", "কালীগঞ্জ"]	["7350"]	bd-geo-2026-10
9e4d49f5-b61b-4ee0-853f-6a243cd5699a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-MAG	Magura	মাগুরা	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Magura", "মাগুরা", "magura", "মাগুরা"]	[]	bd-geo-2026-10
25b0cd5d-2009-4026-9d3d-2111ffdc5ca9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-MAG-MAGURA	Magura Sadar	মাগুরা সদর	9e4d49f5-b61b-4ee0-853f-6a243cd5699a	Khulna	OUTSIDE_DHAKA	["Magura Sadar", "মাগুরা সদর", "sadar", "সদর"]	["7600"]	bd-geo-2026-10
0e7afe97-f70a-4458-bb30-930fad0ac98b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-MAG-SREEPU	Sreepur	শ্রীপুর	9e4d49f5-b61b-4ee0-853f-6a243cd5699a	Khulna	OUTSIDE_DHAKA	["Sreepur", "শ্রীপুর", "sreepur", "শ্রীপুর"]	["7620"]	bd-geo-2026-10
5232a1b8-8be1-4564-9a37-b02529a1d5dc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-MAG-MOHAMM	Mohammadpur	মহম্মদপুর	9e4d49f5-b61b-4ee0-853f-6a243cd5699a	Khulna	OUTSIDE_DHAKA	["Mohammadpur", "মহম্মদপুর", "mohammadpur", "মহম্মদপুর"]	["7630"]	bd-geo-2026-10
ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-NAR	Narail	নড়াইল	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Narail", "নড়াইল", "narail", "নড়াইল"]	[]	bd-geo-2026-10
a4a45319-4342-455b-b453-eb75916b82f9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-NAR-NARAIL	Narail Sadar	নড়াইল সদর	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	Khulna	OUTSIDE_DHAKA	["Narail Sadar", "নড়াইল সদর", "sadar", "সদর"]	["7500"]	bd-geo-2026-10
f499fc38-745e-469e-a41a-d6b07eef93a2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-NAR-LOHAGA	Lohagara	লোহাগড়া	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	Khulna	OUTSIDE_DHAKA	["Lohagara", "লোহাগড়া", "lohagara", "লোহাগড়া"]	["7510"]	bd-geo-2026-10
6241b0a5-2b88-4f77-a2ef-e365d0532c9a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-NAR-KALIA	Kalia	কালিয়া	ce7ff7cc-9af2-4c7e-a2a3-ae8cfacc7207	Khulna	OUTSIDE_DHAKA	["Kalia", "কালিয়া", "kalia", "কালিয়া"]	["7520"]	bd-geo-2026-10
6bd99fe3-5e17-431d-8f42-fb1ca50d303c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-MEH	Meherpur	মেহেরপুর	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Meherpur", "মেহেরপুর", "meherpur", "মেহেরপুর"]	[]	bd-geo-2026-10
d1f04553-67d7-4e93-be84-1adf8caff703	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-MEH-MEHERP	Meherpur Sadar	মেহেরপুর সদর	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	Khulna	OUTSIDE_DHAKA	["Meherpur Sadar", "মেহেরপুর সদর", "sadar", "সদর"]	["7100"]	bd-geo-2026-10
0b73acd7-3e46-4c97-a6b1-b0a8f84c1071	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-MEH-GANGNI	Gangni	গাংনী	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	Khulna	OUTSIDE_DHAKA	["Gangni", "গাংনী", "gangni", "গাংনী"]	["7110"]	bd-geo-2026-10
4f708393-bb01-4c2b-850f-070f8fb73904	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-MEH-MUJIBN	Mujibnagar	মুজিবনগর	6bd99fe3-5e17-431d-8f42-fb1ca50d303c	Khulna	OUTSIDE_DHAKA	["Mujibnagar", "মুজিবনগর", "mujibnagar", "মুজিবনগর"]	["7120"]	bd-geo-2026-10
b99d4225-b6a0-403e-b138-84e734975ea7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-KH-CHU	Chuadanga	চুয়াডাঙ্গা	b1aa7f83-fe3d-4530-8849-70bdcf8d6268	Khulna	OUTSIDE_DHAKA	["Chuadanga", "চুয়াডাঙ্গা", "chuadanga", "চুয়াডাঙ্গা"]	[]	bd-geo-2026-10
1dd49291-c672-4f90-b39d-744a67e9618b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-CHU-CHUADA	Chuadanga Sadar	চুয়াডাঙ্গা সদর	b99d4225-b6a0-403e-b138-84e734975ea7	Khulna	OUTSIDE_DHAKA	["Chuadanga Sadar", "চুয়াডাঙ্গা সদর", "sadar", "সদর"]	["7200"]	bd-geo-2026-10
4f80cc3d-c75d-463b-ac11-bea04ee08ec3	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-CHU-ALAMDA	Alamdanga	আলমডাঙ্গা	b99d4225-b6a0-403e-b138-84e734975ea7	Khulna	OUTSIDE_DHAKA	["Alamdanga", "আলমডাঙ্গা", "alamdanga", "আলমডাঙ্গা"]	["7210"]	bd-geo-2026-10
e3287f12-3bcb-476a-9c35-e71826cdc787	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-KH-CHU-DAMURH	Damurhuda	দামুড়হুদা	b99d4225-b6a0-403e-b138-84e734975ea7	Khulna	OUTSIDE_DHAKA	["Damurhuda", "দামুড়হুদা", "damurhuda", "দামুড়হুদা"]	["7220"]	bd-geo-2026-10
8b41bdf4-1cba-451f-a25d-62e99b9af88d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-BA-BHO	Bhola	ভোলা	902fcb60-98af-4406-8f15-98248e1c06c4	Barishal	OUTSIDE_DHAKA	["Bhola", "ভোলা", "bhola", "ভোলা"]	[]	bd-geo-2026-10
a71c1547-6eb4-4895-aa2c-1c836b80fc87	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BHO-BHOLAS	Bhola Sadar	ভোলা সদর	8b41bdf4-1cba-451f-a25d-62e99b9af88d	Barishal	OUTSIDE_DHAKA	["Bhola Sadar", "ভোলা সদর", "sadar", "সদর"]	["8300"]	bd-geo-2026-10
8a1fd4fd-5450-4305-9b0e-43d53668fdb4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BHO-CHARFA	Char Fasson	চরফ্যাশন	8b41bdf4-1cba-451f-a25d-62e99b9af88d	Barishal	OUTSIDE_DHAKA	["Char Fasson", "চরফ্যাশন", "char fasson", "charfasson", "চরফ্যাশন"]	["8340"]	bd-geo-2026-10
83488659-705d-4685-9b81-35dd4a26c929	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BHO-LALMOH	Lalmohan	লালমোহন	8b41bdf4-1cba-451f-a25d-62e99b9af88d	Barishal	OUTSIDE_DHAKA	["Lalmohan", "লালমোহন", "lalmohan", "লালমোহন"]	["8330"]	bd-geo-2026-10
72f0ce65-5bd8-4f59-8c0c-800dd0058f2a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BHO-BORHAN	Borhanuddin	বোরহানউদ্দিন	8b41bdf4-1cba-451f-a25d-62e99b9af88d	Barishal	OUTSIDE_DHAKA	["Borhanuddin", "বোরহানউদ্দিন", "borhanuddin", "বোরহানউদ্দিন"]	["8320"]	bd-geo-2026-10
3e30e3ed-4666-4e5d-8368-79ff464bfbc9	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-BA-PAT	Patuakhali	পটুয়াখালী	902fcb60-98af-4406-8f15-98248e1c06c4	Barishal	OUTSIDE_DHAKA	["Patuakhali", "পটুয়াখালী", "patuakhali", "পটুয়াখালী"]	[]	bd-geo-2026-10
1e3711e0-2fef-4056-b03b-f955d7f7b269	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-PAT-PATUAK	Patuakhali Sadar	পটুয়াখালী সদর	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	Barishal	OUTSIDE_DHAKA	["Patuakhali Sadar", "পটুয়াখালী সদর", "sadar", "সদর"]	["8600"]	bd-geo-2026-10
f7ab3261-02eb-484b-a570-2de9c8f7c2f8	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-PAT-KALAPA	Kalapara	কলাপাড়া	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	Barishal	OUTSIDE_DHAKA	["Kalapara", "কলাপাড়া", "kalapara", "কলাপাড়া", "kuakata", "কুয়াকাটা"]	["8630"]	bd-geo-2026-10
5ed45199-cbfa-4642-b7f5-6b6c14f2ac64	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-PAT-GALACH	Galachipa	গলাচিপা	3e30e3ed-4666-4e5d-8368-79ff464bfbc9	Barishal	OUTSIDE_DHAKA	["Galachipa", "গলাচিপা", "galachipa", "গলাচিপা"]	["8640"]	bd-geo-2026-10
23897e3b-5f63-4161-aca6-ffb21181e901	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-BA-PIR	Pirojpur	পিরোজপুর	902fcb60-98af-4406-8f15-98248e1c06c4	Barishal	OUTSIDE_DHAKA	["Pirojpur", "পিরোজপুর", "pirojpur", "পিরোজপুর"]	[]	bd-geo-2026-10
f3654945-80fa-4c97-b422-5d1990b3a79c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-PIR-PIROJP	Pirojpur Sadar	পিরোজপুর সদর	23897e3b-5f63-4161-aca6-ffb21181e901	Barishal	OUTSIDE_DHAKA	["Pirojpur Sadar", "পিরোজপুর সদর", "sadar", "সদর"]	["8500"]	bd-geo-2026-10
b30cfd0d-16eb-4061-9873-0801732f0d34	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-PIR-MATHBA	Mathbaria	মঠবাড়িয়া	23897e3b-5f63-4161-aca6-ffb21181e901	Barishal	OUTSIDE_DHAKA	["Mathbaria", "মঠবাড়িয়া", "mathbaria", "মঠবাড়িয়া"]	["8560"]	bd-geo-2026-10
43f9dfa1-78b1-4f5e-8925-d447075eb330	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-PIR-BHANDA	Bhandaria	ভান্ডারিয়া	23897e3b-5f63-4161-aca6-ffb21181e901	Barishal	OUTSIDE_DHAKA	["Bhandaria", "ভান্ডারিয়া", "bhandaria", "ভান্ডারিয়া"]	["8530"]	bd-geo-2026-10
03fa0d8a-a7e9-40aa-9152-b31a22192497	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-BA-BAR	Barguna	বরগুনা	902fcb60-98af-4406-8f15-98248e1c06c4	Barishal	OUTSIDE_DHAKA	["Barguna", "বরগুনা", "barguna", "বরগুনা"]	[]	bd-geo-2026-10
23e264a3-bc80-4d30-aab4-06ed69cedd25	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BAR-BARGUN	Barguna Sadar	বরগুনা সদর	03fa0d8a-a7e9-40aa-9152-b31a22192497	Barishal	OUTSIDE_DHAKA	["Barguna Sadar", "বরগুনা সদর", "sadar", "সদর"]	["8700"]	bd-geo-2026-10
c4c1f281-5de9-4568-bc86-6afb72535ccc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BAR-AMTALI	Amtali	আমতলী	03fa0d8a-a7e9-40aa-9152-b31a22192497	Barishal	OUTSIDE_DHAKA	["Amtali", "আমতলী", "amtali", "আমতলী"]	["8710"]	bd-geo-2026-10
05be7d68-c8a5-4cd2-8abe-b15f323bc0e5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-BAR-PATHAR	Patharghata	পাথরঘাটা	03fa0d8a-a7e9-40aa-9152-b31a22192497	Barishal	OUTSIDE_DHAKA	["Patharghata", "পাথরঘাটা", "patharghata", "পাথরঘাটা"]	["8720"]	bd-geo-2026-10
ef5f135a-d519-420c-a78d-bb9f25faffdb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-BA-JHA	Jhalokati	ঝালকাঠি	902fcb60-98af-4406-8f15-98248e1c06c4	Barishal	OUTSIDE_DHAKA	["Jhalokati", "ঝালকাঠি", "jhalokati", "ঝালকাঠি"]	[]	bd-geo-2026-10
b883ed46-f1ad-4a4d-8d86-06b17ff16885	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-JHA-JHALOK	Jhalokati Sadar	ঝালকাঠি সদর	ef5f135a-d519-420c-a78d-bb9f25faffdb	Barishal	OUTSIDE_DHAKA	["Jhalokati Sadar", "ঝালকাঠি সদর", "sadar", "সদর"]	["8400"]	bd-geo-2026-10
0523b0f4-4539-4dcd-b547-0c02ce716490	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-JHA-NALCHI	Nalchity	নলছিটি	ef5f135a-d519-420c-a78d-bb9f25faffdb	Barishal	OUTSIDE_DHAKA	["Nalchity", "নলছিটি", "nalchity", "নলছিটি"]	["8410"]	bd-geo-2026-10
de0ae8a9-5bb6-4540-a52c-895bd20b4e2c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-BA-JHA-RAJAPU	Rajapur	রাজাপুর	ef5f135a-d519-420c-a78d-bb9f25faffdb	Barishal	OUTSIDE_DHAKA	["Rajapur", "রাজাপুর", "rajapur", "রাজাপুর"]	["8420"]	bd-geo-2026-10
2b89df30-5a4f-4753-9946-f9b65c2311e6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-SY-MOU	Moulvibazar	মৌলভীবাজার	994c7338-f03f-4925-bfb0-8c205d7d5ad9	Sylhet	OUTSIDE_DHAKA	["Moulvibazar", "মৌলভীবাজার", "moulvibazar", "moulvibajar", "মৌলভীবাজার"]	[]	bd-geo-2026-10
e3a7f2e3-f62a-4e90-9abb-68acfef61c90	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-MOU-MOULVI	Moulvibazar Sadar	মৌলভীবাজার সদর	2b89df30-5a4f-4753-9946-f9b65c2311e6	Sylhet	OUTSIDE_DHAKA	["Moulvibazar Sadar", "মৌলভীবাজার সদর", "sadar", "সদর"]	["3200"]	bd-geo-2026-10
b8913b85-9933-4730-bb5d-e0b43cbdbb97	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-MOU-SREEMA	Sreemangal	শ্রীমঙ্গল	2b89df30-5a4f-4753-9946-f9b65c2311e6	Sylhet	OUTSIDE_DHAKA	["Sreemangal", "শ্রীমঙ্গল", "sreemangal", "srimangal", "শ্রীমঙ্গল"]	["3210"]	bd-geo-2026-10
a45fcc18-aae7-4abb-b9a8-df3ba4c92f9c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-MOU-KULAUR	Kulaura	কুলাউড়া	2b89df30-5a4f-4753-9946-f9b65c2311e6	Sylhet	OUTSIDE_DHAKA	["Kulaura", "কুলাউড়া", "kulaura", "কুলাউড়া"]	["3230"]	bd-geo-2026-10
34c73b14-00a1-4bbc-9155-b63041f52855	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-SY-HAB	Habiganj	হবিগঞ্জ	994c7338-f03f-4925-bfb0-8c205d7d5ad9	Sylhet	OUTSIDE_DHAKA	["Habiganj", "হবিগঞ্জ", "habiganj", "hobiganj", "হবিগঞ্জ"]	[]	bd-geo-2026-10
06010bc1-43e5-4983-a9dd-1914a735fe07	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-HAB-HABIGA	Habiganj Sadar	হবিগঞ্জ সদর	34c73b14-00a1-4bbc-9155-b63041f52855	Sylhet	OUTSIDE_DHAKA	["Habiganj Sadar", "হবিগঞ্জ সদর", "sadar", "সদর"]	["3300"]	bd-geo-2026-10
8e03abbc-5db0-4e68-8a62-768512fcd5c2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-HAB-MADHAB	Madhabpur	মাধবপুর	34c73b14-00a1-4bbc-9155-b63041f52855	Sylhet	OUTSIDE_DHAKA	["Madhabpur", "মাধবপুর", "madhabpur", "মাধবপুর"]	["3330"]	bd-geo-2026-10
8259a3dc-c275-4436-9d64-6441dedad9bb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-HAB-CHUNAR	Chunarughat	চুনারুঘাট	34c73b14-00a1-4bbc-9155-b63041f52855	Sylhet	OUTSIDE_DHAKA	["Chunarughat", "চুনারুঘাট", "chunarughat", "চুনারুঘাট"]	["3320"]	bd-geo-2026-10
6aab33a2-3888-438c-90b3-e7755f8609c5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-SY-SUN	Sunamganj	সুনামগঞ্জ	994c7338-f03f-4925-bfb0-8c205d7d5ad9	Sylhet	OUTSIDE_DHAKA	["Sunamganj", "সুনামগঞ্জ", "sunamganj", "সুনামগঞ্জ"]	[]	bd-geo-2026-10
381d2750-0d64-41ab-b7f1-a1b66243d824	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SUN-SUNAMG	Sunamganj Sadar	সুনামগঞ্জ সদর	6aab33a2-3888-438c-90b3-e7755f8609c5	Sylhet	OUTSIDE_DHAKA	["Sunamganj Sadar", "সুনামগঞ্জ সদর", "sadar", "সদর"]	["3000"]	bd-geo-2026-10
21836c2d-e820-4701-8c8e-216e90ed4118	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SUN-CHHATA	Chhatak	ছাতক	6aab33a2-3888-438c-90b3-e7755f8609c5	Sylhet	OUTSIDE_DHAKA	["Chhatak", "ছাতক", "chhatak", "ছাতক"]	["3080"]	bd-geo-2026-10
b532f18f-ea0f-45e5-b23f-fab80574ceee	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-SY-SUN-JAGANN	Jagannathpur	জগন্নাথপুর	6aab33a2-3888-438c-90b3-e7755f8609c5	Sylhet	OUTSIDE_DHAKA	["Jagannathpur", "জগন্নাথপুর", "jagannathpur", "জগন্নাথপুর"]	["3060"]	bd-geo-2026-10
b28e59e6-7e07-415c-9062-65cf37a2f3ad	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RG-DIN	Dinajpur	দিনাজপুর	c944e62f-5447-4da2-ac53-f956caa6332b	Rangpur	OUTSIDE_DHAKA	["Dinajpur", "দিনাজপুর", "dinajpur", "দিনাজপুর"]	[]	bd-geo-2026-10
8ceccfad-ad63-483e-b3b9-b0c3d3eb5727	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-DIN-DINAJP	Dinajpur Sadar	দিনাজপুর সদর	b28e59e6-7e07-415c-9062-65cf37a2f3ad	Rangpur	OUTSIDE_DHAKA	["Dinajpur Sadar", "দিনাজপুর সদর", "kotwali", "sadar", "সদর"]	["5200"]	bd-geo-2026-10
7a25a3c4-793f-4078-9f7a-912db2ad65d2	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-DIN-BIRAMP	Birampur	বিরামপুর	b28e59e6-7e07-415c-9062-65cf37a2f3ad	Rangpur	OUTSIDE_DHAKA	["Birampur", "বিরামপুর", "birampur", "বিরামপুর"]	["5260"]	bd-geo-2026-10
cd3a04a5-2584-4155-8d3b-684582fca2ef	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-DIN-PHULBA	Phulbari	ফুলবাড়ী	b28e59e6-7e07-415c-9062-65cf37a2f3ad	Rangpur	OUTSIDE_DHAKA	["Phulbari", "ফুলবাড়ী", "phulbari", "ফুলবাড়ী"]	["5270"]	bd-geo-2026-10
4309fb15-1262-4fed-8877-c599278a2441	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RG-KUR	Kurigram	কুড়িগ্রাম	c944e62f-5447-4da2-ac53-f956caa6332b	Rangpur	OUTSIDE_DHAKA	["Kurigram", "কুড়িগ্রাম", "kurigram", "কুড়িগ্রাম"]	[]	bd-geo-2026-10
7d2d9d95-a6ce-4df6-b231-57cecf60cac7	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-KUR-KURIGR	Kurigram Sadar	কুড়িগ্রাম সদর	4309fb15-1262-4fed-8877-c599278a2441	Rangpur	OUTSIDE_DHAKA	["Kurigram Sadar", "কুড়িগ্রাম সদর", "sadar", "সদর"]	["5600"]	bd-geo-2026-10
ed144ffe-a738-4783-a0bb-e9d775a89cef	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-KUR-ULIPUR	Ulipur	উলিপুর	4309fb15-1262-4fed-8877-c599278a2441	Rangpur	OUTSIDE_DHAKA	["Ulipur", "উলিপুর", "ulipur", "উলিপুর"]	["5620"]	bd-geo-2026-10
941ad93a-ff8c-4d9b-bce2-3f342f1818df	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-KUR-NAGESH	Nageshwari	নাগেশ্বরী	4309fb15-1262-4fed-8877-c599278a2441	Rangpur	OUTSIDE_DHAKA	["Nageshwari", "নাগেশ্বরী", "nageshwari", "নাগেশ্বরী"]	["5660"]	bd-geo-2026-10
e0b7e5e8-5d93-492d-976c-076c102511e0	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RG-LAL	Lalmonirhat	লালমনিরহাট	c944e62f-5447-4da2-ac53-f956caa6332b	Rangpur	OUTSIDE_DHAKA	["Lalmonirhat", "লালমনিরহাট", "lalmonirhat", "লালমনিরহাট"]	[]	bd-geo-2026-10
8fd952b9-9ba5-48cb-a192-6577cdd90833	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-LAL-LALMON	Lalmonirhat Sadar	লালমনিরহাট সদর	e0b7e5e8-5d93-492d-976c-076c102511e0	Rangpur	OUTSIDE_DHAKA	["Lalmonirhat Sadar", "লালমনিরহাট সদর", "sadar", "সদর"]	["5500"]	bd-geo-2026-10
65999160-725a-400a-9646-23d73560248a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-LAL-PATGRA	Patgram	পাটগ্রাম	e0b7e5e8-5d93-492d-976c-076c102511e0	Rangpur	OUTSIDE_DHAKA	["Patgram", "পাটগ্রাম", "patgram", "পাটগ্রাম"]	["5540"]	bd-geo-2026-10
c7f92915-7d95-47c8-9003-ecd3b4276a24	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-LAL-HATIBA	Hatibandha	হাতীবান্ধা	e0b7e5e8-5d93-492d-976c-076c102511e0	Rangpur	OUTSIDE_DHAKA	["Hatibandha", "হাতীবান্ধা", "hatibandha", "হাতীবান্ধা"]	["5530"]	bd-geo-2026-10
e08fad2d-d3eb-4db6-a1dd-92e65d05081f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RG-GAI	Gaibandha	গাইবান্ধা	c944e62f-5447-4da2-ac53-f956caa6332b	Rangpur	OUTSIDE_DHAKA	["Gaibandha", "গাইবান্ধা", "gaibandha", "গাইবান্ধা"]	[]	bd-geo-2026-10
3d394088-8450-4adb-878f-764339d76877	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-GAI-GAIBAN	Gaibandha Sadar	গাইবান্ধা সদর	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	Rangpur	OUTSIDE_DHAKA	["Gaibandha Sadar", "গাইবান্ধা সদর", "sadar", "সদর"]	["5700"]	bd-geo-2026-10
7f77b90d-517a-40c5-b295-62eb21198b40	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-GAI-GOBIND	Gobindaganj	গোবিন্দগঞ্জ	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	Rangpur	OUTSIDE_DHAKA	["Gobindaganj", "গোবিন্দগঞ্জ", "gobindaganj", "গোবিন্দগঞ্জ"]	["5740"]	bd-geo-2026-10
d599526b-10ce-4d0c-ae42-0fdf57952505	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-GAI-SUNDAR	Sundarganj	সুন্দরগঞ্জ	e08fad2d-d3eb-4db6-a1dd-92e65d05081f	Rangpur	OUTSIDE_DHAKA	["Sundarganj", "সুন্দরগঞ্জ", "sundarganj", "সুন্দরগঞ্জ"]	["5730"]	bd-geo-2026-10
4eb6019a-63ad-4425-9097-700662e08aa4	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RG-NIL	Nilphamari	নীলফামারী	c944e62f-5447-4da2-ac53-f956caa6332b	Rangpur	OUTSIDE_DHAKA	["Nilphamari", "নীলফামারী", "nilphamari", "নীলফামারী"]	[]	bd-geo-2026-10
7f0dcbfc-b52e-4033-a42e-49893308b699	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-NIL-NILPHA	Nilphamari Sadar	নীলফামারী সদর	4eb6019a-63ad-4425-9097-700662e08aa4	Rangpur	OUTSIDE_DHAKA	["Nilphamari Sadar", "নীলফামারী সদর", "sadar", "সদর"]	["5300"]	bd-geo-2026-10
35f58992-2628-4599-b647-7b9ff19e56f6	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-NIL-SAIDPU	Saidpur	সৈয়দপুর	4eb6019a-63ad-4425-9097-700662e08aa4	Rangpur	OUTSIDE_DHAKA	["Saidpur", "সৈয়দপুর", "saidpur", "সৈয়দপুর"]	["5310"]	bd-geo-2026-10
0f5d47ec-9c19-4410-9819-cc2ee8a9e695	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-NIL-DOMAR	Domar	ডোমার	4eb6019a-63ad-4425-9097-700662e08aa4	Rangpur	OUTSIDE_DHAKA	["Domar", "ডোমার", "domar", "ডোমার"]	["5340"]	bd-geo-2026-10
f650439e-97d0-4cd0-97d0-2c8a46c49b32	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RG-THA	Thakurgaon	ঠাকুরগাঁও	c944e62f-5447-4da2-ac53-f956caa6332b	Rangpur	OUTSIDE_DHAKA	["Thakurgaon", "ঠাকুরগাঁও", "thakurgaon", "ঠাকুরগাঁও"]	[]	bd-geo-2026-10
3ab23daf-80cb-4fda-8c1d-fa299529524e	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-THA-THAKUR	Thakurgaon Sadar	ঠাকুরগাঁও সদর	f650439e-97d0-4cd0-97d0-2c8a46c49b32	Rangpur	OUTSIDE_DHAKA	["Thakurgaon Sadar", "ঠাকুরগাঁও সদর", "sadar", "সদর"]	["5100"]	bd-geo-2026-10
1a65fc42-ab32-4e6c-a2ce-76ccb9741b83	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-THA-PIRGAN	Pirganj	পীরগঞ্জ	f650439e-97d0-4cd0-97d0-2c8a46c49b32	Rangpur	OUTSIDE_DHAKA	["Pirganj", "পীরগঞ্জ", "pirganj", "পীরগঞ্জ"]	["5110"]	bd-geo-2026-10
ae9dcf01-4388-4d7d-935d-085c96d901bb	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-THA-RANISA	Ranisankail	রাণীশংকৈল	f650439e-97d0-4cd0-97d0-2c8a46c49b32	Rangpur	OUTSIDE_DHAKA	["Ranisankail", "রাণীশংকৈল", "ranisankail", "রাণীশংকৈল"]	["5130"]	bd-geo-2026-10
7c56a91a-f23a-49dd-ae22-ba8cd866947f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-RG-PAN	Panchagarh	পঞ্চগড়	c944e62f-5447-4da2-ac53-f956caa6332b	Rangpur	OUTSIDE_DHAKA	["Panchagarh", "পঞ্চগড়", "panchagarh", "panchagar", "পঞ্চগড়", "পঞ্চগড়"]	[]	bd-geo-2026-10
c379ceeb-b4b8-4aac-8820-35858ae10eac	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-PAN-PANCHA	Panchagarh Sadar	পঞ্চগড় সদর	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Rangpur	OUTSIDE_DHAKA	["Panchagarh Sadar", "পঞ্চগড় সদর", "sadar", "সদর"]	["5000"]	bd-geo-2026-10
2b8be7b3-39b3-4850-a3e2-b0fb0f18965c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-PAN-DEBIGA	Debiganj	দেবীগঞ্জ	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Rangpur	OUTSIDE_DHAKA	["Debiganj", "দেবীগঞ্জ", "debiganj", "debijanj", "দেবীগঞ্জ"]	["5020"]	bd-geo-2026-10
44ad2e5d-7ffc-42a2-b66a-c8985a40c44b	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-PAN-TETULI	Tetulia	তেঁতুলিয়া	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Rangpur	OUTSIDE_DHAKA	["Tetulia", "তেঁতুলিয়া", "tetulia", "তেঁতুলিয়া"]	["5030"]	bd-geo-2026-10
f442a4ba-876a-4927-b5b7-4384bd93c849	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-RG-PAN-ATWARI	Atwari	আটোয়ারী	7c56a91a-f23a-49dd-ae22-ba8cd866947f	Rangpur	OUTSIDE_DHAKA	["Atwari", "আটোয়ারী", "atwari", "আটোয়ারী"]	["5040"]	bd-geo-2026-10
1bae3279-070c-4ffc-a294-2af6a01630c5	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-MY-JAM	Jamalpur	জামালপুর	8de9b39e-667c-4a4d-a960-cab42193c49b	Mymensingh	OUTSIDE_DHAKA	["Jamalpur", "জামালপুর", "jamalpur", "জামালপুর"]	[]	bd-geo-2026-10
3686738e-03da-48dd-aa9d-79c6e7658e3c	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-JAM-JAMALP	Jamalpur Sadar	জামালপুর সদর	1bae3279-070c-4ffc-a294-2af6a01630c5	Mymensingh	OUTSIDE_DHAKA	["Jamalpur Sadar", "জামালপুর সদর", "sadar", "সদর"]	["2000"]	bd-geo-2026-10
fcfb91d9-c75c-4c76-a15d-0a38da932971	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-JAM-ISLAMP	Islampur	ইসলামপুর	1bae3279-070c-4ffc-a294-2af6a01630c5	Mymensingh	OUTSIDE_DHAKA	["Islampur", "ইসলামপুর", "islampur", "ইসলামপুর"]	["2020"]	bd-geo-2026-10
86739360-43cf-428d-afaa-67d033e56e56	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-JAM-SARISH	Sarishabari	সরিষাবাড়ী	1bae3279-070c-4ffc-a294-2af6a01630c5	Mymensingh	OUTSIDE_DHAKA	["Sarishabari", "সরিষাবাড়ী", "sarishabari", "সরিষাবাড়ী"]	["2050"]	bd-geo-2026-10
60e5f082-3a45-40f5-b408-bd0d9058838f	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-MY-NET	Netrokona	নেত্রকোণা	8de9b39e-667c-4a4d-a960-cab42193c49b	Mymensingh	OUTSIDE_DHAKA	["Netrokona", "নেত্রকোণা", "netrokona", "netrakona", "নেত্রকোণা"]	[]	bd-geo-2026-10
3efb2c28-a460-4e9a-b08c-43584d44d56d	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-NET-NETROK	Netrokona Sadar	নেত্রকোণা সদর	60e5f082-3a45-40f5-b408-bd0d9058838f	Mymensingh	OUTSIDE_DHAKA	["Netrokona Sadar", "নেত্রকোণা সদর", "sadar", "সদর"]	["2400"]	bd-geo-2026-10
5ee7c7e2-fb40-4613-8f2b-12dcc1ac3350	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-NET-KENDUA	Kendua	কেন্দুয়া	60e5f082-3a45-40f5-b408-bd0d9058838f	Mymensingh	OUTSIDE_DHAKA	["Kendua", "কেন্দুয়া", "kendua", "কেন্দুয়া"]	["2420"]	bd-geo-2026-10
1857b4a4-15be-4b5c-b55b-0fe2435db270	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-NET-DURGAP	Durgapur	দুর্গাপুর	60e5f082-3a45-40f5-b408-bd0d9058838f	Mymensingh	OUTSIDE_DHAKA	["Durgapur", "দুর্গাপুর", "durgapur", "দুর্গাপুর"]	["2420"]	bd-geo-2026-10
df1f4ec8-e2af-444a-be21-610084d7e9cc	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	DISTRICT	BD-MY-SHE	Sherpur	শেরপুর	8de9b39e-667c-4a4d-a960-cab42193c49b	Mymensingh	OUTSIDE_DHAKA	["Sherpur", "শেরপুর", "sherpur", "শেরপুর"]	[]	bd-geo-2026-10
0cb0b75d-261f-4cef-b44c-f8b5bc95c0ac	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-SHE-SHERPU	Sherpur Sadar	শেরপুর সদর	df1f4ec8-e2af-444a-be21-610084d7e9cc	Mymensingh	OUTSIDE_DHAKA	["Sherpur Sadar", "শেরপুর সদর", "sadar", "সদর"]	["2100"]	bd-geo-2026-10
1ac2e6cc-8114-4543-8874-1e74fdd7256a	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-SHE-NAKLA	Nakla	নকলা	df1f4ec8-e2af-444a-be21-610084d7e9cc	Mymensingh	OUTSIDE_DHAKA	["Nakla", "নকলা", "nakla", "নকলা"]	["2120"]	bd-geo-2026-10
2c4ad104-9ed4-46d4-a5cf-39a7048fea07	2026-10-10 15:01:42.058074+06	2026-10-10 15:01:42.058074+06	UPAZILA	BD-MY-SHE-NALITA	Nalitabari	নালিতাবাড়ী	df1f4ec8-e2af-444a-be21-610084d7e9cc	Mymensingh	OUTSIDE_DHAKA	["Nalitabari", "নালিতাবাড়ী", "nalitabari", "নালিতাবাড়ী"]	["2110"]	bd-geo-2026-10
\.


--
-- Data for Name: hub_user_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hub_user_assignments (id, "createdAt", "updatedAt", hub_id, user_id, permissions, is_active) FROM stdin;
417b6230-54ef-42ce-96f4-6d5e98e223a2	2026-10-10 15:01:40.93749+06	2026-10-10 15:01:40.93749+06	605e5c84-a443-4c41-9452-8e57d27a969b	a8d9de3f-4756-4fe9-8992-a14cd531f320	["hub.view", "hub.scan", "hub.bag.create", "hub.bag.seal", "hub.manifest.create", "hub.manifest.dispatch", "hub.manifest.receive", "hub.exception.resolve"]	t
771e44bf-0800-48c4-a14d-a404439ec9bb	2026-10-10 15:01:40.942924+06	2026-10-10 15:01:40.942924+06	8b7bfed1-6ee0-4f8e-8bfa-a10be808dd91	8fd67574-0765-48ff-9eab-a07709df7c70	["hub.view", "hub.scan", "hub.bag.create", "hub.bag.seal", "hub.manifest.create", "hub.manifest.dispatch", "hub.manifest.receive", "hub.exception.resolve"]	t
\.


--
-- Data for Name: hubs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hubs (id, "createdAt", "updatedAt", code, name, district_id, thana_id, address, status, type, district, thana) FROM stdin;
605e5c84-a443-4c41-9452-8e57d27a969b	2026-10-10 15:01:40.487943+06	2026-10-10 15:01:40.771675+06	HUB-DHK-01	Dhaka Central Sorting Hub	\N	\N	Tejgaon Industrial Area, Shaheed Tajuddin Ahmad Sarani, Dhaka 1208	ACTIVE	SORTING	Dhaka	Tejgaon
8b7bfed1-6ee0-4f8e-8bfa-a10be808dd91	2026-10-10 15:01:40.649228+06	2026-10-10 15:01:40.780413+06	HUB-CTG-01	Chittagong Regional Hub	\N	\N	GEC Circle, Nasirabad, Chittagong 4000	ACTIVE	REGIONAL	Chittagong	Panchlaish
9969a9f4-5d05-4363-8bea-7c028824bc49	2026-10-10 15:01:40.784425+06	2026-10-10 15:01:40.784425+06	HUB-SYL-01	Sylhet Metropolitan Hub	\N	\N	Zindabazar Point, East Zindabazar, Sylhet 3100	ACTIVE	DESTINATION	Sylhet	Zindabazar
458ee400-7b61-4dd4-b90c-98c727d74926	2026-10-10 15:01:40.791402+06	2026-10-10 15:01:40.791402+06	HUB-RAJ-01	Rajshahi Divisional Hub	\N	\N	Shaheb Bazar, Station Road, Rajshahi 6000	ACTIVE	DESTINATION	Rajshahi	Boalia
86a394b0-0831-4e24-a2e6-9717e0a230f1	2026-10-10 15:01:40.795575+06	2026-10-10 15:01:40.795575+06	HUB-KHU-01	Khulna Logistics Center	\N	\N	Shibbari More, KDA Avenue, Khulna 9100	ACTIVE	DESTINATION	Khulna	Khalishpur
\.


--
-- Data for Name: idempotency_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.idempotency_records (id, "createdAt", "updatedAt", key, scope, user_id, request_hash, status_code, response, completed_at, expires_at) FROM stdin;
af4d5c28-48a8-4ea0-8edc-1892640d7d2a	2026-10-10 17:23:24.198536+06	2026-10-10 17:23:24.198536+06	82a3c366-8678-474d-808b-f79b76aded44	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	d44350540a5eecf5e56e34db7b52fd3fff6bdcd81304245bfb44105328d66cf5	201	{"id": "31119a40-c334-47e2-8f31-12c6f6cd2d79", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:23:24.198Z", "updatedAt": "2026-10-10T11:23:24.198Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-ZCXWHG", "recipientName": "Test Recipient LISTMV2B2UPEH8TK", "recipientPhone": "01731403762", "deliveryAddress": "House 12, Road 5, Dhanmondi LISTMV2B2UPEH8TK", "parcelDescription": null}	2026-10-10 17:23:24.329+06	2026-10-11 17:23:24.327+06
c1414d57-aea1-4ba5-b9fa-a1bc67321240	2026-10-10 17:23:59.193706+06	2026-10-10 17:23:59.193706+06	ceee4650-aad0-468a-920f-bc906b23bcb7	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	cffcd87105572e5588f3beed129bfab0b0e79b11954cf181b0f73bbfb443a5a8	201	{"id": "312013ca-8cdc-4f72-960d-7abbe0850658", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:23:59.193Z", "updatedAt": "2026-10-10T11:23:59.193Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-JK4L96", "recipientName": "Test Recipient PAGEMV2B3LO63RXA", "recipientPhone": "01731438710", "deliveryAddress": "House 12, Road 5, Dhanmondi PAGEMV2B3LO63RXA", "parcelDescription": null}	2026-10-10 17:23:59.222+06	2026-10-11 17:23:59.22+06
11b958d2-cd0c-48be-85bd-f30463a9b412	2026-10-10 17:24:04.910541+06	2026-10-10 17:24:04.910541+06	e1e51182-9222-4cea-9dc5-ba8d0c092dd1	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	71b296f72d42f4ac9ca7ed37973cb5a7e9f46d76f2a40e6465d61962a47d036f	201	{"id": "4b73ac51-38c2-4c60-8db8-eb8a052166ef", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:24:04.910Z", "updatedAt": "2026-10-10T11:24:04.910Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-8PQX5E", "recipientName": "Test Recipient BACKMV2B3Q9J7KZ9", "recipientPhone": "01731444663", "deliveryAddress": "House 12, Road 5, Dhanmondi BACKMV2B3Q9J7KZ9", "parcelDescription": null}	2026-10-10 17:24:04.949+06	2026-10-11 17:24:04.948+06
c1d98462-a9fe-470d-a228-ac7746a06565	2026-10-10 17:24:14.368111+06	2026-10-10 17:24:14.368111+06	fbc87a14-c1a5-4ede-bec5-4afa28e2121b	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	2ee17b1311655ff774a535437c90e920ccc0e501560d5c93d676b4b8d80b13e6	201	{"id": "7aedf5da-1226-4fdb-96bd-67867c6cbcbe", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:24:14.368Z", "updatedAt": "2026-10-10T11:24:14.368Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-TK2P7R", "recipientName": "Test Recipient SHAREMV2B3XJYSF6R", "recipientPhone": "01731454110", "deliveryAddress": "House 12, Road 5, Dhanmondi SHAREMV2B3XJYSF6R", "parcelDescription": null}	2026-10-10 17:24:14.393+06	2026-10-11 17:24:14.391+06
c7a4967b-e71f-455f-baa2-afbdfd57b746	2026-10-10 17:24:25.567574+06	2026-10-10 17:24:25.567574+06	36fa5293-b68f-48f0-aa35-79c9fea52e5b	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	3b8a0ded238c16008cd787a22ad43fa8dc592ce99ebd4bbfc662b8c83a8d33fb	201	{"id": "cc14599e-9601-4b01-a39d-beb18f60deb7", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:24:25.567Z", "updatedAt": "2026-10-10T11:24:25.567Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-BC8QHZ", "recipientName": "Test Recipient RELOADMV2B4630376I", "recipientPhone": "01731465164", "deliveryAddress": "House 12, Road 5, Dhanmondi RELOADMV2B4630376I", "parcelDescription": null}	2026-10-10 17:24:25.596+06	2026-10-11 17:24:25.594+06
a3f8d878-02e6-45a3-8241-0df0c04b1ddc	2026-10-10 17:25:09.630061+06	2026-10-10 17:25:09.630061+06	71c03fe5-dbcd-40ed-a3d5-c37491c2dfa2	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	9ab634a269c8e12f5c0dda6419bb2187275a818075b4f653f9350993a71a7b41	201	{"id": "08170f21-a7e3-4c32-b05b-ce4e770bb4ef", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:25:09.630Z", "updatedAt": "2026-10-10T11:25:09.630Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-LJUGTX", "recipientName": "Test Recipient LISTMV2B546CO4N0", "recipientPhone": "01731509348", "deliveryAddress": "House 12, Road 5, Dhanmondi LISTMV2B546CO4N0", "parcelDescription": null}	2026-10-10 17:25:09.652+06	2026-10-11 17:25:09.651+06
ec53fcd4-b29f-4260-9b5e-0880969c7bbe	2026-10-10 17:28:22.43748+06	2026-10-10 17:28:22.43748+06	86f4dea6-ffe8-48dd-9eaa-26529fe2737b	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	cbc9236f3f47f7cbf3b44d5c8d101ecea9aa0201f6e614a4dc8d13ce3ee44fd9	201	{"id": "23e1de97-7721-461a-a94c-a623c7bc294b", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:28:22.437Z", "updatedAt": "2026-10-10T11:28:22.437Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-PGFTGK", "recipientName": "Test Recipient PROBEMV2B98L6", "recipientPhone": "01731701690", "deliveryAddress": "House 1 PROBEMV2B98L6", "parcelDescription": null}	2026-10-10 17:28:23.751+06	2026-10-11 17:28:23.749+06
31b6f2bd-03fb-47de-835b-41de9aa7bdbf	2026-10-10 17:28:51.482974+06	2026-10-10 17:28:51.482974+06	ec782da8-df74-44e7-aae4-9e95b2bc1821	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	298727760197e30ca77851160bc2bd5fba37bc300ca5c78c3e4a5892a9deeaaa	201	{"id": "40f4d68d-4804-473d-8ebf-699ebe222473", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:28:51.482Z", "updatedAt": "2026-10-10T11:28:51.482Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-D56LZV", "recipientName": "Test Recipient PROBEMV2B9UDV", "recipientPhone": "01731729940", "deliveryAddress": "House 1 PROBEMV2B9UDV", "parcelDescription": null}	2026-10-10 17:28:51.512+06	2026-10-11 17:28:51.511+06
d5795b38-aca8-4afc-9421-b1b209bdb5cc	2026-10-10 17:31:01.038932+06	2026-10-10 17:31:01.038932+06	06f54147-e87d-47d2-9268-38d54d2dcea7	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	01864c616eefcb4a25876e0f548243a77bdcc8a8a7bc69792f3da15b0516fe00	201	{"id": "40fe8418-db67-4ab2-9e99-325e6bebf9f0", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:31:01.038Z", "updatedAt": "2026-10-10T11:31:01.038Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-EGC4FF", "recipientName": "Test Recipient PROBEMV2BCMTM", "recipientPhone": "01731860107", "deliveryAddress": "House 1 PROBEMV2BCMTM", "parcelDescription": null}	2026-10-10 17:31:01.074+06	2026-10-11 17:31:01.071+06
5001ba57-6cb7-4896-8f38-b96e6872ec6a	2026-10-10 17:32:33.393114+06	2026-10-10 17:32:33.393114+06	0883b81b-4b3e-496e-88d8-acb4ad31d3cb	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	62888fa59d4315599bf71895f78721d251bca98a1e8c794960c1f45717ffb8e6	201	{"id": "c80d00dc-80cd-4a54-b76e-7de34cd998d7", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:32:33.393Z", "updatedAt": "2026-10-10T11:32:33.393Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-B62QC3", "recipientName": "Test Recipient PROBEMV2BEM0D", "recipientPhone": "01731952367", "deliveryAddress": "House 1 PROBEMV2BEM0D", "parcelDescription": null}	2026-10-10 17:32:33.449+06	2026-10-11 17:32:33.447+06
78e93f22-6475-4921-ab68-10729313b1c8	2026-10-10 17:33:15.0066+06	2026-10-10 17:33:15.0066+06	9c3e9075-162b-428b-8597-a2d43a5e9ec1	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	07bf780658fcb706340937d7bd85794136892dee057ffcc17c85a9f068d1e22f	201	{"id": "95a3cba9-831c-4ebf-aca7-1397afeff187", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:33:15.006Z", "updatedAt": "2026-10-10T11:33:15.006Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-2BM7TS", "recipientName": "Test Recipient PROBEMV2BFIOW", "recipientPhone": "01731994721", "deliveryAddress": "House 1 PROBEMV2BFIOW", "parcelDescription": null}	2026-10-10 17:33:15.028+06	2026-10-11 17:33:15.026+06
15bb2b92-e688-430b-8259-916b93c94ad5	2026-10-10 17:34:41.817966+06	2026-10-10 17:34:41.817966+06	19916bd1-ac2a-43ff-8ab2-16a0576b92cc	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	46d6c78406d7255863a23f8c862f2ecbac4ce556aff8c88ec9ac610d13b2fd3e	201	{"id": "b98dd832-1012-4c74-a985-0a8998dbda2a", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:34:41.817Z", "updatedAt": "2026-10-10T11:34:41.817Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-H3P77D", "recipientName": "Test Recipient PROBEMV2BHDLB", "recipientPhone": "01732081424", "deliveryAddress": "House 1 PROBEMV2BHDLB", "parcelDescription": null}	2026-10-10 17:34:41.841+06	2026-10-11 17:34:41.84+06
91dfa1b8-d3eb-4af5-a997-ab8c5ecf2c0c	2026-10-10 17:35:58.65615+06	2026-10-10 17:35:58.65615+06	dbec8bc5-455d-423f-8a39-be27918a3774	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	dd433231db9621658d161814bc6e733b2b101d9193ea8adc5837b9a45d1baf58	201	{"id": "28339e53-3fc5-4631-9e03-4202d1c52554", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:35:58.656Z", "updatedAt": "2026-10-10T11:35:58.656Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-7ZUKFW", "recipientName": "Test Recipient PROBEMV2BJ0VD", "recipientPhone": "01732158250", "deliveryAddress": "House 1 PROBEMV2BJ0VD", "parcelDescription": null}	2026-10-10 17:35:58.696+06	2026-10-11 17:35:58.695+06
c7eedeb7-b390-4882-9704-d2d3658e8a11	2026-10-10 17:37:10.294174+06	2026-10-10 17:37:10.294174+06	f61c5b12-e146-4352-8106-27120853c528	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	5a2944ce89863050c8e9947320b664eccd1338678deef1532f10747cda153966	201	{"id": "b817b5cd-e112-4a4e-96cd-98c72d55bd20", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:37:10.294Z", "updatedAt": "2026-10-10T11:37:10.294Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-CWDTRR", "recipientName": "Test Recipient PROBEMV2BKK24", "recipientPhone": "01732229773", "deliveryAddress": "House 1 PROBEMV2BKK24", "parcelDescription": null}	2026-10-10 17:37:10.313+06	2026-10-11 17:37:10.311+06
31360d90-e8f9-4f7f-b904-dd94c98893c5	2026-10-10 17:38:30.447922+06	2026-10-10 17:38:30.447922+06	da5ac75c-6767-451b-b79c-56ebd5311181	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	8691c14e44a1a25ee50c07ddf05443fb9b693a9c8eb1ef7a1c5fc786f1b133fb	201	{"id": "1a17de77-1411-4910-aef4-bc272f7aec05", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:38:30.447Z", "updatedAt": "2026-10-10T11:38:30.447Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-YJ8ASB", "recipientName": "Test Recipient PROBEMV2BM9YN", "recipientPhone": "01732310000", "deliveryAddress": "House 1 PROBEMV2BM9YN", "parcelDescription": null}	2026-10-10 17:38:30.473+06	2026-10-11 17:38:30.472+06
ed07e00b-35df-422b-afcd-d953269be875	2026-10-10 17:39:39.296677+06	2026-10-10 17:39:39.296677+06	50172e71-89f1-4a81-b10f-7dc3c9020129	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	d8e5e0badb6e2fe58334f7db693383929a677e75061c9716ee39e08890ce2fe7	201	{"id": "9d826076-322d-43b4-bddf-0951b52f459d", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:39:39.296Z", "updatedAt": "2026-10-10T11:39:39.296Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-7GPR74", "recipientName": "Test Recipient PROBEMV2BNR2S", "recipientPhone": "01732378836", "deliveryAddress": "House 1 PROBEMV2BNR2S", "parcelDescription": null}	2026-10-10 17:39:39.322+06	2026-10-11 17:39:39.32+06
acffec2c-1eb8-41e2-8fe6-f5617b7736b6	2026-10-10 17:40:21.474604+06	2026-10-10 17:40:21.474604+06	ab1bbf57-7018-4b26-bebf-240e62e88c73	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	2b1b0b564a524eab50739d25101b45945a7e6e0d65adb384763905499c8f5586	201	{"id": "ce82d560-935e-4e91-9d63-805c4bed0ba7", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:40:21.474Z", "updatedAt": "2026-10-10T11:40:21.474Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-EBY4VC", "recipientName": "Test Recipient LISTMV2BONS1YVSK", "recipientPhone": "01732421217", "deliveryAddress": "House 12, Road 5, Dhanmondi LISTMV2BONS1YVSK", "parcelDescription": null}	2026-10-10 17:40:21.5+06	2026-10-11 17:40:21.499+06
14eeeb78-d669-4dcb-8f7f-5179e84d6823	2026-10-10 17:40:53.680731+06	2026-10-10 17:40:53.680731+06	7199d769-7342-4da7-8ac0-a00af12b12b8	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	249175825a425969bbbee0e4d8922b84b7752bd19f2a54291d7f183a623648b3	201	{"id": "32fdb0f2-ca79-4e9c-ab89-5a04daa5aac0", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:40:53.680Z", "updatedAt": "2026-10-10T11:40:53.680Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-4QPYHT", "recipientName": "Test Recipient PAGEMV2BPCHXDS5N", "recipientPhone": "01732453253", "deliveryAddress": "House 12, Road 5, Dhanmondi PAGEMV2BPCHXDS5N", "parcelDescription": null}	2026-10-10 17:40:53.791+06	2026-10-11 17:40:53.79+06
3c97d0aa-2996-4919-ae9d-e300e02e3244	2026-10-10 17:41:01.597989+06	2026-10-10 17:41:01.597989+06	7a715c31-70d2-4133-8338-b191de9a2836	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	ebdd70a01260f0fe45b78d2cc6ded8292ebb1d86f642eb761f5a88f8784154d1	201	{"id": "689b57e6-30c4-48ba-ae76-2ba648d16cb2", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:41:01.597Z", "updatedAt": "2026-10-10T11:41:01.597Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-MJ7WS6", "recipientName": "Test Recipient BACKMV2BPIPEWW1E", "recipientPhone": "01732461298", "deliveryAddress": "House 12, Road 5, Dhanmondi BACKMV2BPIPEWW1E", "parcelDescription": null}	2026-10-10 17:41:01.62+06	2026-10-11 17:41:01.619+06
9098ce66-d583-435a-b80e-72b0ba7dcfe3	2026-10-10 17:41:13.428556+06	2026-10-10 17:41:13.428556+06	033ea3f8-bc76-4f8f-bee8-4867e9e7457c	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	7d9fe77dac04b0ff49dd18554594566372ee6d226feb5df609d8f33876c226c0	201	{"id": "5f550109-a36b-4dca-94be-b6594c62879f", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:41:13.428Z", "updatedAt": "2026-10-10T11:41:13.428Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-JPX758", "recipientName": "Test Recipient SHAREMV2BPRULRE7S", "recipientPhone": "01732473149", "deliveryAddress": "House 12, Road 5, Dhanmondi SHAREMV2BPRULRE7S", "parcelDescription": null}	2026-10-10 17:41:13.472+06	2026-10-11 17:41:13.471+06
9566fd51-b5a0-4b19-8fff-db1256fd3f6d	2026-10-10 17:41:47.771076+06	2026-10-10 17:41:47.771076+06	1625ff43-65d5-4423-a1bb-e12c1aa0fa1d	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	e919aa422de29886d33c37d7695f811d47444c97e33dec4361180b57acda23ec	201	{"id": "2da4f6aa-3e04-4210-8dca-8abb1cc35b09", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:41:47.771Z", "updatedAt": "2026-10-10T11:41:47.771Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-5T7DLF", "recipientName": "Test Recipient RELOADMV2BQIBY7VY1", "recipientPhone": "01732507470", "deliveryAddress": "House 12, Road 5, Dhanmondi RELOADMV2BQIBY7VY1", "parcelDescription": null}	2026-10-10 17:41:47.792+06	2026-10-11 17:41:47.79+06
7cc2c51e-bc10-4210-a5b4-5c193313d83e	2026-10-10 17:42:15.92795+06	2026-10-10 17:42:15.92795+06	8d459c7d-65e0-4009-b7b1-f14534e7d945	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	85c1262d8cec3ba5732ae5e78134de666e2ec81d3cc9de736d7be19b496f9aeb	201	{"id": "4582e06d-4420-49d1-8788-cc58763022d8", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:42:15.927Z", "updatedAt": "2026-10-10T11:42:15.927Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-DTXL85", "recipientName": "Test Recipient LISTMV2BR3WRSGJ2", "recipientPhone": "01732535435", "deliveryAddress": "House 12, Road 5, Dhanmondi LISTMV2BR3WRSGJ2", "parcelDescription": null}	2026-10-10 17:42:15.953+06	2026-10-11 17:42:15.951+06
3339221f-3402-49b9-93fe-4fa191994891	2026-10-10 17:42:27.570466+06	2026-10-10 17:42:27.570466+06	5faf4532-ed57-4913-b5b6-9a2537820bcb	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	ef08dddb1f185ad1dfa98231bdad4927790eee01dfb1eef6e2acf693788b8fec	201	{"id": "b8716788-f0a6-45a5-a5fc-fd59d860f8b1", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:42:27.570Z", "updatedAt": "2026-10-10T11:42:27.570Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-VTYPAW", "recipientName": "Test Recipient PAGEMV2BRD226O87", "recipientPhone": "01732547290", "deliveryAddress": "House 12, Road 5, Dhanmondi PAGEMV2BRD226O87", "parcelDescription": null}	2026-10-10 17:42:27.596+06	2026-10-11 17:42:27.594+06
be8c7803-6ad3-4798-aeac-26b423ba10aa	2026-10-10 17:43:03.100204+06	2026-10-10 17:43:03.100204+06	df4bbb6d-7df6-4563-b0b5-10b17a092063	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	9cf3c8070a40904fbcb0ca253846a4795a17e3c97ae9cc7a1e4d38f7d50a831f	201	{"id": "a3c2b3e2-e0b8-4545-ad11-c560cddda2e3", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:43:03.100Z", "updatedAt": "2026-10-10T11:43:03.100Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-APYHPS", "recipientName": "Test Recipient RELOADMV2BS44055KT", "recipientPhone": "01732582352", "deliveryAddress": "House 12, Road 5, Dhanmondi RELOADMV2BS44055KT", "parcelDescription": null}	2026-10-10 17:43:03.655+06	2026-10-11 17:43:03.654+06
f7643d31-4b07-44a5-83f8-5219661181c6	2026-10-10 17:42:35.714116+06	2026-10-10 17:42:35.714116+06	f600ba09-2b89-4b6b-9298-9a4a1fa58554	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	4ab3390ecc788e80d3cedcb786a68c1001e9ee59eefd2abde255ae077654b60b	201	{"id": "39a1d3e9-c47d-41d2-8fa1-68983af68e4e", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:42:35.714Z", "updatedAt": "2026-10-10T11:42:35.714Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-732NSL", "recipientName": "Test Recipient BACKMV2BRJ3XPXAD", "recipientPhone": "01732555133", "deliveryAddress": "House 12, Road 5, Dhanmondi BACKMV2BRJ3XPXAD", "parcelDescription": null}	2026-10-10 17:42:36.114+06	2026-10-11 17:42:36.111+06
559ecb1c-9a25-4b5e-b91c-8ccf49618fb7	2026-10-10 17:42:47.797055+06	2026-10-10 17:42:47.797055+06	0bf5fef7-caf6-4100-ab53-a6aa11f52ecf	PARCEL_CREATE	e55e6fe7-eda2-4766-8c86-c924232ce0bc	e6c23a7a84d8e1daa55cbc98ef1b5b870d2fda5950f8919ad7c39dbb8ffbcaba	201	{"id": "4d35d4c4-a705-453b-a67a-4fd47559e2c1", "thana": "Dhanmondi", "status": "CREATED", "weight": 1, "district": "Dhaka", "codAmount": 1000, "createdAt": "2026-10-10T11:42:47.797Z", "updatedAt": "2026-10-10T11:42:47.797Z", "deliveryFee": 60, "trackingCode": "DHR-20261010-JYVB34", "recipientName": "Test Recipient SHAREMV2BRSALFMA3", "recipientPhone": "01732567037", "deliveryAddress": "House 12, Road 5, Dhanmondi SHAREMV2BRSALFMA3", "parcelDescription": null}	2026-10-10 17:42:48.765+06	2026-10-11 17:42:48.763+06
\.


--
-- Data for Name: integration_failures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.integration_failures (id, "createdAt", "updatedAt", job_id, event_id, queue, kind, reference_id, merchant_id, reason, attempts, status, last_attempt_at, resolved_by, resolved_at) FROM stdin;
\.


--
-- Data for Name: intelligence_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.intelligence_feedback (id, "createdAt", "updatedAt", subject_type, subject_id, signal, actor_id, detail) FROM stdin;
\.


--
-- Data for Name: intelligence_recommendations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.intelligence_recommendations (id, "createdAt", "updatedAt", parcel_id, prediction_id, action, reasons, status, overridden_by, overridden_at, override_reason, override_decision) FROM stdin;
c45ed78f-7267-41a0-99ae-103e02cc2d7e	2026-10-10 17:24:10.800156+06	2026-10-10 17:24:10.800156+06	4b73ac51-38c2-4c60-8db8-eb8a052166ef	ffbed7ea-d58e-4410-aac3-c0fa6febf055	REVIEW_BEFORE_DISPATCH	[{"code": "LOW_DELIVERY_COMPLETION_RATE", "detail": "Successful delivery rate is 0% across 1 order(s)."}]	ACTIVE	\N	\N	\N	\N
\.


--
-- Data for Name: manifest_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manifest_items (id, "createdAt", "updatedAt", manifest_id, bag_id, parcel_id) FROM stdin;
\.


--
-- Data for Name: manifests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manifests (id, "createdAt", "updatedAt", manifest_code, origin_hub_id, destination_hub_id, status, vehicle_number, driver_name, driver_phone, dispatched_at, received_at, notes, created_by, dispatched_by, received_by) FROM stdin;
\.


--
-- Data for Name: merchants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.merchants (id, "createdAt", "updatedAt", user_id, business_name, contact_phone, status, pickup_address) FROM stdin;
d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	2026-10-10 15:01:40.620292+06	2026-10-10 15:01:40.846911+06	e55e6fe7-eda2-4766-8c86-c924232ce0bc	Rahim Enterprise BD	01700000002	ACTIVE	House 45, Road 7, Sector 3, Uttara, Dhaka 1230
b2610025-c66e-4c17-9e5b-439fca2a40ac	2026-10-10 15:01:40.849233+06	2026-10-10 15:01:40.849233+06	533d0d32-6697-4091-bf0b-e9d7b649a9f2	Ananya Fashion & Crafts	01700000012	ACTIVE	Suite 4B, Concord Royal Court, Dhanmondi 27, Dhaka 1209
98b1f798-a67b-40d9-abd9-54d3492fbbd9	2026-10-10 15:01:40.854094+06	2026-10-10 15:01:40.854094+06	00af8780-fea3-4d2a-9ebb-eccdff97971b	Star Tech Express Gadgets	01700000013	ACTIVE	Level 5, Multiplan Center, Elephant Road, Dhaka 1205
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1700000000000	InitialSchema1700000000000
2	1700000000001	ReconcilePhase0Schema1700000000001
3	1700000000002	Phase2HubOperations1700000000002
4	1700000000003	Phase3RiderDelivery1700000000003
5	1700000000004	Phase4FinanceLedger1700000000004
6	1700000000005	Phase4LedgerOpeningBalances1700000000005
7	1700000000006	Phase5NotificationsIntegrations1700000000006
8	1700000000007	Phase6Intelligence1700000000007
9	1700000000008	Phase7Analytics1700000000008
10	1700000000009	Phase8ParcelListIndex1700000000009
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_preferences (id, "createdAt", "updatedAt", user_id, merchant_id, category, channel, enabled, locale) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, "createdAt", "updatedAt", merchant_id, user_id, channel, type, title, message, recipient_target, status, metadata, sent_at, read_at, failure_reason, event_id, dedupe_key, provider_message_id, attempt_count, template_key, locale) FROM stdin;
aed7db7c-d12f-47b8-8fea-cee989b9e482	2026-10-08 23:01:40.945+06	2026-10-10 15:01:41.990105+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	Parcel Delivered Successfully	Parcel DHR-2610-00101 has been delivered to Tanvir Ahmed in Dhanmondi. COD of ৳1,850 credited to pending balance.	\N	SENT	\N	2026-10-10 15:01:41.990105+06	2026-10-08 23:01:40.945+06	\N	\N	\N	\N	0	\N	en
cf8111df-f8aa-4282-8576-c490704996e3	2026-10-09 01:01:40.945+06	2026-10-10 15:01:41.9973+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	Parcel Delivered Successfully	Parcel DHR-2610-00102 has been delivered to Nusrat Jahan in Gulshan. COD of ৳2,450 credited to pending balance.	\N	SENT	\N	2026-10-10 15:01:41.9973+06	2026-10-09 01:01:40.945+06	\N	\N	\N	\N	0	\N	en
3e45d859-2e13-4d2c-a74d-62061dbc86a3	2026-10-09 09:01:40.945+06	2026-10-10 15:01:42.001458+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PAYOUT_UPDATE	Payout Disbursed	Your payout of ৳25,000 has been sent to your bKash merchant wallet.	\N	SENT	\N	2026-10-10 15:01:42.001458+06	\N	\N	\N	\N	\N	0	\N	en
97da8957-dd7a-4b8d-b8ea-1d91320e864d	2026-10-10 03:01:40.945+06	2026-10-10 15:01:42.004593+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	Parcel Out for Delivery	Parcel DHR-2610-00107 is out for delivery with Karim Rider.	\N	SENT	\N	2026-10-10 15:01:42.004593+06	\N	\N	\N	\N	\N	0	\N	en
a549eeda-f22f-4c30-bedf-4fca6d36537c	2026-10-10 07:01:40.945+06	2026-10-10 15:01:42.007307+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	Shipment Sorted at Central Hub	Parcel DHR-2610-00115 arrived at Dhaka Central Sorting Hub.	\N	SENT	\N	2026-10-10 15:01:42.007307+06	\N	\N	\N	\N	\N	0	\N	en
c2bdb914-5d05-40ca-8413-a4c8e1b6956b	2026-10-10 17:23:24.872365+06	2026-10-10 17:23:24.872365+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-ZCXWHG for Test Recipient LISTMV2B2UPEH8TK is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/31119a40-c334-47e2-8f31-12c6f6cd2d79", "eventId": "fff033be-572f-468c-8282-c703a11a82c7", "eventType": "parcel.created.v1"}	2026-10-10 17:23:24.898+06	\N	\N	fff033be-572f-468c-8282-c703a11a82c7	fff033be-572f-468c-8282-c703a11a82c7:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
365d6155-c965-42be-a544-23a5be35d10c	2026-10-10 17:23:24.872365+06	2026-10-10 17:23:25.208487+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-ZCXWHG for Test Recipient LISTMV2B2UPEH8TK is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "fff033be-572f-468c-8282-c703a11a82c7", "eventType": "parcel.created.v1"}	2026-10-10 17:23:25.206+06	\N	\N	fff033be-572f-468c-8282-c703a11a82c7	fff033be-572f-468c-8282-c703a11a82c7:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631405205_c0nlh99s	1	parcel_created	en
7d596d71-1c4e-4389-9229-c9f5704f88d3	2026-10-10 17:24:00.215564+06	2026-10-10 17:24:00.215564+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-JK4L96 for Test Recipient PAGEMV2B3LO63RXA is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/312013ca-8cdc-4f72-960d-7abbe0850658", "eventId": "2a75860f-516c-43d5-bd89-2525898a40ba", "eventType": "parcel.created.v1"}	2026-10-10 17:24:00.338+06	\N	\N	2a75860f-516c-43d5-bd89-2525898a40ba	2a75860f-516c-43d5-bd89-2525898a40ba:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
27d7a3bc-811c-44f4-a91c-86cab4a0a0d6	2026-10-10 17:24:00.215564+06	2026-10-10 17:24:00.748467+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-JK4L96 for Test Recipient PAGEMV2B3LO63RXA is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "2a75860f-516c-43d5-bd89-2525898a40ba", "eventType": "parcel.created.v1"}	2026-10-10 17:24:00.746+06	\N	\N	2a75860f-516c-43d5-bd89-2525898a40ba	2a75860f-516c-43d5-bd89-2525898a40ba:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631440745_cpcagjfx	1	parcel_created	en
1f746388-4b2b-41e9-8276-2b8414e86e06	2026-10-10 17:24:06.236474+06	2026-10-10 17:24:06.236474+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-8PQX5E for Test Recipient BACKMV2B3Q9J7KZ9 is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/4b73ac51-38c2-4c60-8db8-eb8a052166ef", "eventId": "20ff9fa0-f8ce-4437-b169-8aa8f96854f7", "eventType": "parcel.created.v1"}	2026-10-10 17:24:06.246+06	\N	\N	20ff9fa0-f8ce-4437-b169-8aa8f96854f7	20ff9fa0-f8ce-4437-b169-8aa8f96854f7:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
a3762f7c-cab9-4957-86a8-fd96df449853	2026-10-10 17:24:06.236474+06	2026-10-10 17:24:06.516966+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-8PQX5E for Test Recipient BACKMV2B3Q9J7KZ9 is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "20ff9fa0-f8ce-4437-b169-8aa8f96854f7", "eventType": "parcel.created.v1"}	2026-10-10 17:24:06.514+06	\N	\N	20ff9fa0-f8ce-4437-b169-8aa8f96854f7	20ff9fa0-f8ce-4437-b169-8aa8f96854f7:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631446512_r5zas5i1	1	parcel_created	en
f36c9d96-d9f9-4639-b978-f7fcc7b326ac	2026-10-10 17:24:15.24868+06	2026-10-10 17:24:15.24868+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-TK2P7R for Test Recipient SHAREMV2B3XJYSF6R is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/7aedf5da-1226-4fdb-96bd-67867c6cbcbe", "eventId": "84572fd5-7970-40f9-a94a-eab32d928641", "eventType": "parcel.created.v1"}	2026-10-10 17:24:15.258+06	\N	\N	84572fd5-7970-40f9-a94a-eab32d928641	84572fd5-7970-40f9-a94a-eab32d928641:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
a82c9114-9ce2-422a-a81f-fb9bbb446620	2026-10-10 17:24:15.24868+06	2026-10-10 17:24:15.66439+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-TK2P7R for Test Recipient SHAREMV2B3XJYSF6R is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "84572fd5-7970-40f9-a94a-eab32d928641", "eventType": "parcel.created.v1"}	2026-10-10 17:24:15.662+06	\N	\N	84572fd5-7970-40f9-a94a-eab32d928641	84572fd5-7970-40f9-a94a-eab32d928641:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631455661_39wtykt9	1	parcel_created	en
7763a256-782f-4d54-8fda-a040bca5ed50	2026-10-10 17:24:27.289842+06	2026-10-10 17:24:27.289842+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-BC8QHZ for Test Recipient RELOADMV2B4630376I is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/cc14599e-9601-4b01-a39d-beb18f60deb7", "eventId": "294328a2-66d8-4181-bc9d-70827732a12b", "eventType": "parcel.created.v1"}	2026-10-10 17:24:27.296+06	\N	\N	294328a2-66d8-4181-bc9d-70827732a12b	294328a2-66d8-4181-bc9d-70827732a12b:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
f0674cc4-b383-4030-851c-c3cc5f2e2191	2026-10-10 17:24:27.289842+06	2026-10-10 17:24:27.537489+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-BC8QHZ for Test Recipient RELOADMV2B4630376I is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "294328a2-66d8-4181-bc9d-70827732a12b", "eventType": "parcel.created.v1"}	2026-10-10 17:24:27.535+06	\N	\N	294328a2-66d8-4181-bc9d-70827732a12b	294328a2-66d8-4181-bc9d-70827732a12b:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631467535_5eblvc31	1	parcel_created	en
3879de76-1122-4d85-b391-9c2c329086f2	2026-10-10 17:25:10.18609+06	2026-10-10 17:25:10.18609+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-LJUGTX for Test Recipient LISTMV2B546CO4N0 is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/08170f21-a7e3-4c32-b05b-ce4e770bb4ef", "eventId": "605ed557-1086-40f8-b022-8f5b1e87373e", "eventType": "parcel.created.v1"}	2026-10-10 17:25:10.199+06	\N	\N	605ed557-1086-40f8-b022-8f5b1e87373e	605ed557-1086-40f8-b022-8f5b1e87373e:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
e6730a95-0ffa-4bd7-b510-f635a01b049d	2026-10-10 17:25:10.18609+06	2026-10-10 17:25:10.548965+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-LJUGTX for Test Recipient LISTMV2B546CO4N0 is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "605ed557-1086-40f8-b022-8f5b1e87373e", "eventType": "parcel.created.v1"}	2026-10-10 17:25:10.546+06	\N	\N	605ed557-1086-40f8-b022-8f5b1e87373e	605ed557-1086-40f8-b022-8f5b1e87373e:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631510546_q044tm9s	1	parcel_created	en
072748f2-d51a-400c-89f7-487a9b83fb71	2026-10-10 17:28:24.815699+06	2026-10-10 17:28:24.815699+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-PGFTGK for Test Recipient PROBEMV2B98L6 is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/23e1de97-7721-461a-a94c-a623c7bc294b", "eventId": "75068e8d-16c5-4d4e-ae30-e9d538b974b2", "eventType": "parcel.created.v1"}	2026-10-10 17:28:24.843+06	\N	\N	75068e8d-16c5-4d4e-ae30-e9d538b974b2	75068e8d-16c5-4d4e-ae30-e9d538b974b2:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
0a624a2e-9b13-447b-9a0c-f20e1f1a5d67	2026-10-10 17:28:24.815699+06	2026-10-10 17:28:24.815699+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-PGFTGK for Test Recipient PROBEMV2B98L6 is booked and awaiting pickup.	merchant@dhruto.com	PENDING	{"eventId": "75068e8d-16c5-4d4e-ae30-e9d538b974b2", "eventType": "parcel.created.v1"}	2026-10-10 17:28:24.815699+06	\N	\N	75068e8d-16c5-4d4e-ae30-e9d538b974b2	75068e8d-16c5-4d4e-ae30-e9d538b974b2:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
63599d22-e902-4ab0-a508-6423a970dfb5	2026-10-10 17:28:51.903191+06	2026-10-10 17:28:51.903191+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-D56LZV for Test Recipient PROBEMV2B9UDV is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/40f4d68d-4804-473d-8ebf-699ebe222473", "eventId": "9ae9a7c4-44ee-4a31-a35d-a8f2c415182f", "eventType": "parcel.created.v1"}	2026-10-10 17:28:51.911+06	\N	\N	9ae9a7c4-44ee-4a31-a35d-a8f2c415182f	9ae9a7c4-44ee-4a31-a35d-a8f2c415182f:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
00070830-c04c-4f58-83d6-11c62b000e85	2026-10-10 17:28:51.903191+06	2026-10-10 17:28:52.159639+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-D56LZV for Test Recipient PROBEMV2B9UDV is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "9ae9a7c4-44ee-4a31-a35d-a8f2c415182f", "eventType": "parcel.created.v1"}	2026-10-10 17:28:52.157+06	\N	\N	9ae9a7c4-44ee-4a31-a35d-a8f2c415182f	9ae9a7c4-44ee-4a31-a35d-a8f2c415182f:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631732156_dznfk8f6	1	parcel_created	en
bbe0b0b1-f328-424e-ae25-447c5584d116	2026-10-10 17:31:01.235541+06	2026-10-10 17:31:01.235541+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-EGC4FF for Test Recipient PROBEMV2BCMTM is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/40fe8418-db67-4ab2-9e99-325e6bebf9f0", "eventId": "53a02fbf-858f-47a4-ae71-f5cfdaad1549", "eventType": "parcel.created.v1"}	2026-10-10 17:31:01.249+06	\N	\N	53a02fbf-858f-47a4-ae71-f5cfdaad1549	53a02fbf-858f-47a4-ae71-f5cfdaad1549:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
ff4eb8a2-a22d-43ff-b3b6-1fbdd36c33f0	2026-10-10 17:31:01.235541+06	2026-10-10 17:31:01.639464+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-EGC4FF for Test Recipient PROBEMV2BCMTM is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "53a02fbf-858f-47a4-ae71-f5cfdaad1549", "eventType": "parcel.created.v1"}	2026-10-10 17:31:01.636+06	\N	\N	53a02fbf-858f-47a4-ae71-f5cfdaad1549	53a02fbf-858f-47a4-ae71-f5cfdaad1549:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631861635_qhqmn9g4	1	parcel_created	en
fd829e69-4b81-4988-a506-9a24c5f8fbfe	2026-10-10 17:32:33.822471+06	2026-10-10 17:32:33.822471+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-B62QC3 for Test Recipient PROBEMV2BEM0D is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/c80d00dc-80cd-4a54-b76e-7de34cd998d7", "eventId": "2a3b6c33-8465-412a-9a36-3214dcf9be2c", "eventType": "parcel.created.v1"}	2026-10-10 17:32:33.84+06	\N	\N	2a3b6c33-8465-412a-9a36-3214dcf9be2c	2a3b6c33-8465-412a-9a36-3214dcf9be2c:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
9d686858-b9e6-4769-bc69-2fa7c77ff8cd	2026-10-10 17:32:33.822471+06	2026-10-10 17:32:34.209671+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-B62QC3 for Test Recipient PROBEMV2BEM0D is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "2a3b6c33-8465-412a-9a36-3214dcf9be2c", "eventType": "parcel.created.v1"}	2026-10-10 17:32:34.207+06	\N	\N	2a3b6c33-8465-412a-9a36-3214dcf9be2c	2a3b6c33-8465-412a-9a36-3214dcf9be2c:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631954206_badqz3fi	1	parcel_created	en
15e6af62-b2c7-433a-bb75-68439068f5d4	2026-10-10 17:33:15.911562+06	2026-10-10 17:33:15.911562+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-2BM7TS for Test Recipient PROBEMV2BFIOW is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/95a3cba9-831c-4ebf-aca7-1397afeff187", "eventId": "808ecf44-db67-41cd-b2c2-f09a73184b21", "eventType": "parcel.created.v1"}	2026-10-10 17:33:15.93+06	\N	\N	808ecf44-db67-41cd-b2c2-f09a73184b21	808ecf44-db67-41cd-b2c2-f09a73184b21:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
5a2c0c4f-74a1-4981-a6ba-4ed1e4217d9f	2026-10-10 17:33:15.911562+06	2026-10-10 17:33:16.20822+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-2BM7TS for Test Recipient PROBEMV2BFIOW is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "808ecf44-db67-41cd-b2c2-f09a73184b21", "eventType": "parcel.created.v1"}	2026-10-10 17:33:16.205+06	\N	\N	808ecf44-db67-41cd-b2c2-f09a73184b21	808ecf44-db67-41cd-b2c2-f09a73184b21:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791631996205_t9dw0lxb	1	parcel_created	en
bc969a31-1c50-4dcc-afba-067f2c72c241	2026-10-10 17:34:43.172721+06	2026-10-10 17:34:43.172721+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-H3P77D for Test Recipient PROBEMV2BHDLB is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/b98dd832-1012-4c74-a985-0a8998dbda2a", "eventId": "bb886d42-e37a-4e10-90cc-a11b551540da", "eventType": "parcel.created.v1"}	2026-10-10 17:34:43.19+06	\N	\N	bb886d42-e37a-4e10-90cc-a11b551540da	bb886d42-e37a-4e10-90cc-a11b551540da:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
5cd58005-b20a-4e59-928b-7507b2b24cd0	2026-10-10 17:34:43.172721+06	2026-10-10 17:34:43.424698+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-H3P77D for Test Recipient PROBEMV2BHDLB is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "bb886d42-e37a-4e10-90cc-a11b551540da", "eventType": "parcel.created.v1"}	2026-10-10 17:34:43.423+06	\N	\N	bb886d42-e37a-4e10-90cc-a11b551540da	bb886d42-e37a-4e10-90cc-a11b551540da:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632083422_o1or6vz2	1	parcel_created	en
2dd5e5e0-c53a-4e71-90fb-9ab769f4073d	2026-10-10 17:35:59.216363+06	2026-10-10 17:35:59.216363+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-7ZUKFW for Test Recipient PROBEMV2BJ0VD is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/28339e53-3fc5-4631-9e03-4202d1c52554", "eventId": "9f33b8e3-5612-4304-98bd-acb61cca2998", "eventType": "parcel.created.v1"}	2026-10-10 17:35:59.236+06	\N	\N	9f33b8e3-5612-4304-98bd-acb61cca2998	9f33b8e3-5612-4304-98bd-acb61cca2998:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
8097e4fb-b6a2-423b-ae01-7a86663cbe8b	2026-10-10 17:35:59.216363+06	2026-10-10 17:35:59.651251+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-7ZUKFW for Test Recipient PROBEMV2BJ0VD is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "9f33b8e3-5612-4304-98bd-acb61cca2998", "eventType": "parcel.created.v1"}	2026-10-10 17:35:59.644+06	\N	\N	9f33b8e3-5612-4304-98bd-acb61cca2998	9f33b8e3-5612-4304-98bd-acb61cca2998:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632159644_e44fieyf	1	parcel_created	en
170a5f6c-ad17-4d1e-9351-5885815033d4	2026-10-10 17:37:10.687788+06	2026-10-10 17:37:10.687788+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-CWDTRR for Test Recipient PROBEMV2BKK24 is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/b817b5cd-e112-4a4e-96cd-98c72d55bd20", "eventId": "b0ecb5f7-9a56-4a58-806f-189c039db8db", "eventType": "parcel.created.v1"}	2026-10-10 17:37:10.695+06	\N	\N	b0ecb5f7-9a56-4a58-806f-189c039db8db	b0ecb5f7-9a56-4a58-806f-189c039db8db:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
106361f9-10ca-4f03-b6c3-1d375fd22ad2	2026-10-10 17:37:10.687788+06	2026-10-10 17:37:11.022242+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-CWDTRR for Test Recipient PROBEMV2BKK24 is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "b0ecb5f7-9a56-4a58-806f-189c039db8db", "eventType": "parcel.created.v1"}	2026-10-10 17:37:11.017+06	\N	\N	b0ecb5f7-9a56-4a58-806f-189c039db8db	b0ecb5f7-9a56-4a58-806f-189c039db8db:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632231017_9at32pri	1	parcel_created	en
a6e9d96d-5b6f-42e3-836f-6c406702bac0	2026-10-10 17:38:31.865451+06	2026-10-10 17:38:31.865451+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-YJ8ASB for Test Recipient PROBEMV2BM9YN is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/1a17de77-1411-4910-aef4-bc272f7aec05", "eventId": "0f454e6f-99be-4532-b71b-790a49508eff", "eventType": "parcel.created.v1"}	2026-10-10 17:38:31.897+06	\N	\N	0f454e6f-99be-4532-b71b-790a49508eff	0f454e6f-99be-4532-b71b-790a49508eff:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
b0677c1c-ccd7-4e46-ba75-8fa3dcefe133	2026-10-10 17:38:31.865451+06	2026-10-10 17:38:32.268949+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-YJ8ASB for Test Recipient PROBEMV2BM9YN is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "0f454e6f-99be-4532-b71b-790a49508eff", "eventType": "parcel.created.v1"}	2026-10-10 17:38:32.266+06	\N	\N	0f454e6f-99be-4532-b71b-790a49508eff	0f454e6f-99be-4532-b71b-790a49508eff:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632312265_4kgcm16q	1	parcel_created	en
d90bc35b-ca8b-4bf9-8deb-9d3f1de9d140	2026-10-10 17:39:41.035733+06	2026-10-10 17:39:41.035733+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-7GPR74 for Test Recipient PROBEMV2BNR2S is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/9d826076-322d-43b4-bddf-0951b52f459d", "eventId": "75336f17-445f-4ca3-a5da-579bcb8c6ef1", "eventType": "parcel.created.v1"}	2026-10-10 17:39:41.042+06	\N	\N	75336f17-445f-4ca3-a5da-579bcb8c6ef1	75336f17-445f-4ca3-a5da-579bcb8c6ef1:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
fd4d881f-e5d0-433c-8795-a2b9a902f6e4	2026-10-10 17:39:41.035733+06	2026-10-10 17:39:41.386859+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-7GPR74 for Test Recipient PROBEMV2BNR2S is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "75336f17-445f-4ca3-a5da-579bcb8c6ef1", "eventType": "parcel.created.v1"}	2026-10-10 17:39:41.384+06	\N	\N	75336f17-445f-4ca3-a5da-579bcb8c6ef1	75336f17-445f-4ca3-a5da-579bcb8c6ef1:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632381384_vne44cdl	1	parcel_created	en
0ec99537-2e69-4c16-9494-f990d93e2d54	2026-10-10 17:40:23.214194+06	2026-10-10 17:40:23.214194+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-EBY4VC for Test Recipient LISTMV2BONS1YVSK is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/ce82d560-935e-4e91-9d63-805c4bed0ba7", "eventId": "994b1ecb-8ca9-4e86-a21c-73f86eb8e92b", "eventType": "parcel.created.v1"}	2026-10-10 17:40:23.221+06	\N	\N	994b1ecb-8ca9-4e86-a21c-73f86eb8e92b	994b1ecb-8ca9-4e86-a21c-73f86eb8e92b:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
938dbd5e-25e2-4ac5-81a2-dff4ba43544b	2026-10-10 17:40:23.214194+06	2026-10-10 17:40:23.522259+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-EBY4VC for Test Recipient LISTMV2BONS1YVSK is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "994b1ecb-8ca9-4e86-a21c-73f86eb8e92b", "eventType": "parcel.created.v1"}	2026-10-10 17:40:23.519+06	\N	\N	994b1ecb-8ca9-4e86-a21c-73f86eb8e92b	994b1ecb-8ca9-4e86-a21c-73f86eb8e92b:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632423519_u1xig2hy	1	parcel_created	en
a8b10e11-365b-4158-a1fe-0ce3efa60039	2026-10-10 17:40:53.979587+06	2026-10-10 17:40:53.979587+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-4QPYHT for Test Recipient PAGEMV2BPCHXDS5N is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/32fdb0f2-ca79-4e9c-ab89-5a04daa5aac0", "eventId": "13e8cbda-769f-4ee7-b02f-8ffcabad5d75", "eventType": "parcel.created.v1"}	2026-10-10 17:40:53.986+06	\N	\N	13e8cbda-769f-4ee7-b02f-8ffcabad5d75	13e8cbda-769f-4ee7-b02f-8ffcabad5d75:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
c1c97a7c-1cdc-4937-a147-839a2b00d6d3	2026-10-10 17:40:53.979587+06	2026-10-10 17:40:54.412885+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-4QPYHT for Test Recipient PAGEMV2BPCHXDS5N is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "13e8cbda-769f-4ee7-b02f-8ffcabad5d75", "eventType": "parcel.created.v1"}	2026-10-10 17:40:54.406+06	\N	\N	13e8cbda-769f-4ee7-b02f-8ffcabad5d75	13e8cbda-769f-4ee7-b02f-8ffcabad5d75:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632454405_ljl3q3jb	1	parcel_created	en
a3256b90-48b6-4211-a6b6-88cd20b11efa	2026-10-10 17:41:02.314298+06	2026-10-10 17:41:02.314298+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-MJ7WS6 for Test Recipient BACKMV2BPIPEWW1E is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/689b57e6-30c4-48ba-ae76-2ba648d16cb2", "eventId": "d45f27f2-20c8-4f00-b7d8-4a7d5d889f7d", "eventType": "parcel.created.v1"}	2026-10-10 17:41:02.322+06	\N	\N	d45f27f2-20c8-4f00-b7d8-4a7d5d889f7d	d45f27f2-20c8-4f00-b7d8-4a7d5d889f7d:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
c1e798d9-a7c3-4b22-b848-a759b11a9da1	2026-10-10 17:41:02.314298+06	2026-10-10 17:41:02.697745+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-MJ7WS6 for Test Recipient BACKMV2BPIPEWW1E is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "d45f27f2-20c8-4f00-b7d8-4a7d5d889f7d", "eventType": "parcel.created.v1"}	2026-10-10 17:41:02.695+06	\N	\N	d45f27f2-20c8-4f00-b7d8-4a7d5d889f7d	d45f27f2-20c8-4f00-b7d8-4a7d5d889f7d:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632462692_yl84tvvz	1	parcel_created	en
0cd1677e-5863-4ffc-85ec-b8f154691b63	2026-10-10 17:41:14.34072+06	2026-10-10 17:41:14.34072+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-JPX758 for Test Recipient SHAREMV2BPRULRE7S is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/5f550109-a36b-4dca-94be-b6594c62879f", "eventId": "5c2345f3-9d3d-4f6d-a43b-84eea67a2901", "eventType": "parcel.created.v1"}	2026-10-10 17:41:14.347+06	\N	\N	5c2345f3-9d3d-4f6d-a43b-84eea67a2901	5c2345f3-9d3d-4f6d-a43b-84eea67a2901:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
13159f2b-6e4e-4b56-89d3-fc50e7b23043	2026-10-10 17:41:14.34072+06	2026-10-10 17:41:14.656005+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-JPX758 for Test Recipient SHAREMV2BPRULRE7S is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "5c2345f3-9d3d-4f6d-a43b-84eea67a2901", "eventType": "parcel.created.v1"}	2026-10-10 17:41:14.653+06	\N	\N	5c2345f3-9d3d-4f6d-a43b-84eea67a2901	5c2345f3-9d3d-4f6d-a43b-84eea67a2901:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632474652_5o60guym	1	parcel_created	en
14685ae2-e9bd-4919-ac1e-9b257135a91a	2026-10-10 17:41:48.147419+06	2026-10-10 17:41:48.147419+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-5T7DLF for Test Recipient RELOADMV2BQIBY7VY1 is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/2da4f6aa-3e04-4210-8dca-8abb1cc35b09", "eventId": "3d4a4393-58ac-49e2-aedf-38987013350c", "eventType": "parcel.created.v1"}	2026-10-10 17:41:48.156+06	\N	\N	3d4a4393-58ac-49e2-aedf-38987013350c	3d4a4393-58ac-49e2-aedf-38987013350c:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
0663db74-2ef8-4caa-9bb6-c5c27789ab96	2026-10-10 17:41:48.147419+06	2026-10-10 17:41:48.50861+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-5T7DLF for Test Recipient RELOADMV2BQIBY7VY1 is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "3d4a4393-58ac-49e2-aedf-38987013350c", "eventType": "parcel.created.v1"}	2026-10-10 17:41:48.504+06	\N	\N	3d4a4393-58ac-49e2-aedf-38987013350c	3d4a4393-58ac-49e2-aedf-38987013350c:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632508503_p1ipfj90	1	parcel_created	en
e25f4844-0930-4d2e-bf96-c1cef186d3ac	2026-10-10 17:42:17.515643+06	2026-10-10 17:42:17.515643+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-DTXL85 for Test Recipient LISTMV2BR3WRSGJ2 is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/4582e06d-4420-49d1-8788-cc58763022d8", "eventId": "c03cbe75-53ff-47b3-b7bf-a43ed17af5ae", "eventType": "parcel.created.v1"}	2026-10-10 17:42:17.523+06	\N	\N	c03cbe75-53ff-47b3-b7bf-a43ed17af5ae	c03cbe75-53ff-47b3-b7bf-a43ed17af5ae:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
e1feaf6e-55d9-4e78-87ac-4628664fa043	2026-10-10 17:42:17.515643+06	2026-10-10 17:42:17.767218+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-DTXL85 for Test Recipient LISTMV2BR3WRSGJ2 is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "c03cbe75-53ff-47b3-b7bf-a43ed17af5ae", "eventType": "parcel.created.v1"}	2026-10-10 17:42:17.765+06	\N	\N	c03cbe75-53ff-47b3-b7bf-a43ed17af5ae	c03cbe75-53ff-47b3-b7bf-a43ed17af5ae:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632537764_3agfz0kh	1	parcel_created	en
abc5ccb1-4a5c-4c08-b367-8af082ecc519	2026-10-10 17:42:29.566897+06	2026-10-10 17:42:29.566897+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-VTYPAW for Test Recipient PAGEMV2BRD226O87 is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/b8716788-f0a6-45a5-a5fc-fd59d860f8b1", "eventId": "4c8d2d51-0ce3-41c5-a3c7-a892a9973d58", "eventType": "parcel.created.v1"}	2026-10-10 17:42:29.576+06	\N	\N	4c8d2d51-0ce3-41c5-a3c7-a892a9973d58	4c8d2d51-0ce3-41c5-a3c7-a892a9973d58:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
a72ddfde-9965-4162-a472-32f0c2212a6e	2026-10-10 17:42:29.566897+06	2026-10-10 17:42:29.960005+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-VTYPAW for Test Recipient PAGEMV2BRD226O87 is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "4c8d2d51-0ce3-41c5-a3c7-a892a9973d58", "eventType": "parcel.created.v1"}	2026-10-10 17:42:29.957+06	\N	\N	4c8d2d51-0ce3-41c5-a3c7-a892a9973d58	4c8d2d51-0ce3-41c5-a3c7-a892a9973d58:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632549913_k0wv3px7	1	parcel_created	en
2080ad9b-54ca-4efd-aaaa-5ddb812a2c14	2026-10-10 17:42:36.273806+06	2026-10-10 17:42:36.273806+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-732NSL for Test Recipient BACKMV2BRJ3XPXAD is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/39a1d3e9-c47d-41d2-8fa1-68983af68e4e", "eventId": "870688b7-e33c-4488-8e7e-564f9e0e7fb8", "eventType": "parcel.created.v1"}	2026-10-10 17:42:36.281+06	\N	\N	870688b7-e33c-4488-8e7e-564f9e0e7fb8	870688b7-e33c-4488-8e7e-564f9e0e7fb8:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
ae661979-dd65-48ec-9bf5-472d77264223	2026-10-10 17:42:36.273806+06	2026-10-10 17:42:37.240095+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-732NSL for Test Recipient BACKMV2BRJ3XPXAD is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "870688b7-e33c-4488-8e7e-564f9e0e7fb8", "eventType": "parcel.created.v1"}	2026-10-10 17:42:37.237+06	\N	\N	870688b7-e33c-4488-8e7e-564f9e0e7fb8	870688b7-e33c-4488-8e7e-564f9e0e7fb8:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632556922_9dqlq0gr	1	parcel_created	en
82d138f5-3ac7-4268-a12f-7f4d6db25f56	2026-10-10 17:42:50.805334+06	2026-10-10 17:42:50.805334+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-JYVB34 for Test Recipient SHAREMV2BRSALFMA3 is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/4d35d4c4-a705-453b-a67a-4fd47559e2c1", "eventId": "1432f799-0835-420e-822a-48ae4923f66b", "eventType": "parcel.created.v1"}	2026-10-10 17:42:50.879+06	\N	\N	1432f799-0835-420e-822a-48ae4923f66b	1432f799-0835-420e-822a-48ae4923f66b:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
4588cd03-2116-415b-ac5a-21c4f8af25bf	2026-10-10 17:42:50.805334+06	2026-10-10 17:42:51.312099+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-JYVB34 for Test Recipient SHAREMV2BRSALFMA3 is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "1432f799-0835-420e-822a-48ae4923f66b", "eventType": "parcel.created.v1"}	2026-10-10 17:42:51.309+06	\N	\N	1432f799-0835-420e-822a-48ae4923f66b	1432f799-0835-420e-822a-48ae4923f66b:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632571218_fnps6zg6	1	parcel_created	en
494df2c0-b5f9-4fce-b01b-f483f0e47852	2026-10-10 17:43:05.871587+06	2026-10-10 17:43:05.871587+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	IN_APP	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-APYHPS for Test Recipient RELOADMV2BS44055KT is booked and awaiting pickup.	\N	SENT	{"route": "/merchant/parcels/a3c2b3e2-e0b8-4545-ad11-c560cddda2e3", "eventId": "e093ae38-9149-4dd8-b9ce-9f80fb081f00", "eventType": "parcel.created.v1"}	2026-10-10 17:43:05.877+06	\N	\N	e093ae38-9149-4dd8-b9ce-9f80fb081f00	e093ae38-9149-4dd8-b9ce-9f80fb081f00:IN_APP:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	0	parcel_created	en
7a5ab00e-2f26-4915-9b13-4d97679574c2	2026-10-10 17:43:05.871587+06	2026-10-10 17:43:06.342059+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	EMAIL	PARCEL_STATUS_UPDATE	New parcel booked	Dhruto: parcel DHR-20261010-APYHPS for Test Recipient RELOADMV2BS44055KT is booked and awaiting pickup.	merchant@dhruto.com	SENT	{"eventId": "e093ae38-9149-4dd8-b9ce-9f80fb081f00", "eventType": "parcel.created.v1"}	2026-10-10 17:43:06.339+06	\N	\N	e093ae38-9149-4dd8-b9ce-9f80fb081f00	e093ae38-9149-4dd8-b9ce-9f80fb081f00:EMAIL:merchant:d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	email_1791632586338_wl5xoi7l	1	parcel_created	en
\.


--
-- Data for Name: operational_exceptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.operational_exceptions (id, "createdAt", "updatedAt", hub_id, parcel_id, bag_id, manifest_id, type, status, description, actor_id, resolved_by, resolved_at, resolution_note) FROM stdin;
\.


--
-- Data for Name: parcel_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parcel_assignments (id, "createdAt", "updatedAt", parcel_id, rider_id, assigned_by, assigned_at, unassigned_at) FROM stdin;
\.


--
-- Data for Name: parcel_scans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parcel_scans (id, "createdAt", parcel_id, bag_id, hub_id, scan_type, outcome, reason_code, barcode, operator_id, idempotency_key, notes, metadata) FROM stdin;
\.


--
-- Data for Name: parcel_status_histories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parcel_status_histories (id, "createdAt", "updatedAt", parcel_id, from_status, to_status, event_type, actor_id, actor_role, description, metadata) FROM stdin;
ba1fca5b-5328-4dd9-a59b-fc1f342365a2	2026-10-08 15:01:40.945+06	2026-10-10 15:01:40.971235+06	89dded52-d5f7-464a-8af8-8b0c26091dec	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
f8acb762-eb99-49fd-ab4b-00da9b2340b7	2026-10-08 16:01:40.945+06	2026-10-10 15:01:40.977623+06	89dded52-d5f7-464a-8af8-8b0c26091dec	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
a386969e-d8b5-4931-909d-0e3eb0e4516a	2026-10-08 17:01:40.945+06	2026-10-10 15:01:40.980693+06	89dded52-d5f7-464a-8af8-8b0c26091dec	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
8f481714-8cc8-4c93-95ae-7bab47fa4c79	2026-10-08 18:01:40.945+06	2026-10-10 15:01:40.983774+06	89dded52-d5f7-464a-8af8-8b0c26091dec	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
7ce1a155-f209-4eca-839f-cc683a8463f9	2026-10-08 20:01:40.945+06	2026-10-10 15:01:40.987663+06	89dded52-d5f7-464a-8af8-8b0c26091dec	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
d6d37e90-dd27-4cf8-866f-135284926332	2026-10-08 22:01:40.945+06	2026-10-10 15:01:40.991295+06	89dded52-d5f7-464a-8af8-8b0c26091dec	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
6fee4ff7-fd73-40d1-8f48-600ea2aa5ccc	2026-10-09 00:01:40.945+06	2026-10-10 15:01:40.994522+06	89dded52-d5f7-464a-8af8-8b0c26091dec	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
54c86005-6e82-45e6-b426-fe8d6a93275b	2026-10-09 01:01:40.945+06	2026-10-10 15:01:40.997324+06	89dded52-d5f7-464a-8af8-8b0c26091dec	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
fbcc8d40-4710-4b20-8796-3c094f428554	2026-10-08 21:01:40.945+06	2026-10-10 15:01:41.007348+06	1efa9ffb-acca-4ec4-8729-c678e325d215	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
38a8c72d-6764-4e2b-b859-529619c10a4d	2026-10-08 22:01:40.945+06	2026-10-10 15:01:41.010157+06	1efa9ffb-acca-4ec4-8729-c678e325d215	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
c18e3a23-d63e-4b23-891a-0bd0a665f8b2	2026-10-08 23:01:40.945+06	2026-10-10 15:01:41.01391+06	1efa9ffb-acca-4ec4-8729-c678e325d215	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
ef4d0d4c-d937-476c-bbed-723b9749e8e8	2026-10-09 00:01:40.945+06	2026-10-10 15:01:41.017435+06	1efa9ffb-acca-4ec4-8729-c678e325d215	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
9660aae4-c2a8-41f9-bdd6-10041c7d9fda	2026-10-09 02:01:40.945+06	2026-10-10 15:01:41.020352+06	1efa9ffb-acca-4ec4-8729-c678e325d215	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
f7cc0403-c8b3-4f8d-ae8e-c03ed05a7b34	2026-10-09 04:01:40.945+06	2026-10-10 15:01:41.023221+06	1efa9ffb-acca-4ec4-8729-c678e325d215	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
080c3baf-adce-42e1-9a97-d8a6aabcd6bd	2026-10-09 06:01:40.945+06	2026-10-10 15:01:41.02766+06	1efa9ffb-acca-4ec4-8729-c678e325d215	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
1c078b1c-b5ab-4d61-9233-30e3fbb75b4f	2026-10-09 07:01:40.945+06	2026-10-10 15:01:41.030846+06	1efa9ffb-acca-4ec4-8729-c678e325d215	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
c854aec9-c61e-41f4-9d9a-efe31dfb2b2e	2026-10-09 03:01:40.945+06	2026-10-10 15:01:41.039509+06	0251b4c7-da39-4de7-a0c4-419b902280cf	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
988721ea-27f7-4212-a148-8c1e17fd0779	2026-10-09 04:01:40.945+06	2026-10-10 15:01:41.044045+06	0251b4c7-da39-4de7-a0c4-419b902280cf	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
08117a00-7d22-49b6-a037-ef98b9932fbd	2026-10-09 05:01:40.945+06	2026-10-10 15:01:41.048213+06	0251b4c7-da39-4de7-a0c4-419b902280cf	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
315567f9-be01-41c9-a352-a49be8a4835d	2026-10-09 06:01:40.945+06	2026-10-10 15:01:41.051548+06	0251b4c7-da39-4de7-a0c4-419b902280cf	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
48f881ee-6fd2-47c3-a4b3-087e57972d42	2026-10-09 08:01:40.945+06	2026-10-10 15:01:41.055893+06	0251b4c7-da39-4de7-a0c4-419b902280cf	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
0a51ad5d-f35f-4416-bda8-e8410cdcfae0	2026-10-09 10:01:40.945+06	2026-10-10 15:01:41.059764+06	0251b4c7-da39-4de7-a0c4-419b902280cf	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
7a986a86-f12d-47ec-b7db-ba91cc69281b	2026-10-09 12:01:40.945+06	2026-10-10 15:01:41.063465+06	0251b4c7-da39-4de7-a0c4-419b902280cf	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
56202cb2-e433-4a95-bdf4-d7e041aae309	2026-10-09 13:01:40.945+06	2026-10-10 15:01:41.067583+06	0251b4c7-da39-4de7-a0c4-419b902280cf	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
29a276ec-ad53-4050-8ff6-27c00f48e1b7	2026-10-09 09:01:40.945+06	2026-10-10 15:01:41.07795+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	\N	CREATED	PARCEL_CREATED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	MERCHANT	Shipment booked via merchant portal	{}
98f7ab9d-39d5-4cc8-82b4-e5d3c762c6ce	2026-10-09 10:01:40.945+06	2026-10-10 15:01:41.081658+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Pickup rider assigned for collection	{}
24052d8e-65d1-425e-b347-22edd4713251	2026-10-09 11:01:40.945+06	2026-10-10 15:01:41.08478+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	RIDER	Parcel collected from merchant warehouse	{}
8ff30060-9ed2-491a-bf8c-6277117238a7	2026-10-09 12:01:40.945+06	2026-10-10 15:01:41.087607+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
f0f6b043-9e84-4a8a-a245-3d0536cae9b6	2026-10-09 14:01:40.945+06	2026-10-10 15:01:41.090587+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
9c0d958d-20ca-4976-8c0f-183debe03ad0	2026-10-09 16:01:40.945+06	2026-10-10 15:01:41.094654+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Received and verified at local destination hub	{}
1ffd0035-8195-4a0b-8e55-b18d94073e67	2026-10-09 18:01:40.945+06	2026-10-10 15:01:41.098946+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	RIDER	Assigned to delivery run with OTP verification	{}
8af9e67f-9734-42d5-b976-01c3607fff4a	2026-10-09 19:01:40.945+06	2026-10-10 15:01:41.102245+06	568bab1d-20fd-40c4-ad4c-48edd639e4ee	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	RIDER	Delivered to recipient. Cash collected.	{}
a3703e0f-c691-47cf-a0f4-e689a0324e9d	2026-10-09 11:01:40.945+06	2026-10-10 15:01:41.114574+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	\N	CREATED	PARCEL_CREATED	00af8780-fea3-4d2a-9ebb-eccdff97971b	MERCHANT	Shipment booked via merchant portal	{}
576c5e4a-3ccd-46ec-b45a-2fc927d6bfbc	2026-10-09 12:01:40.945+06	2026-10-10 15:01:41.117624+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Pickup rider assigned for collection	{}
45af907a-3b61-4f7f-a48b-aa5970017ee7	2026-10-09 13:01:40.945+06	2026-10-10 15:01:41.122367+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Parcel collected from merchant warehouse	{}
d9059263-cb82-44f1-aefc-facbcea703a2	2026-10-09 14:01:40.945+06	2026-10-10 15:01:41.126263+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
19fa9de3-9a5b-4e62-94c0-8b4d5f232753	2026-10-09 16:01:40.945+06	2026-10-10 15:01:41.129241+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
34053c93-86bf-473b-96fd-86300bd43ac1	2026-10-09 18:01:40.945+06	2026-10-10 15:01:41.132669+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Received and verified at local destination hub	{}
bdacca5d-8c35-4c08-a1bf-b33af42f2312	2026-10-09 20:01:40.945+06	2026-10-10 15:01:41.136879+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Assigned to delivery run with OTP verification	{}
8844086f-d49f-43a2-9344-1fcb8623c1b1	2026-10-09 21:01:40.945+06	2026-10-10 15:01:41.14104+06	cdf5501e-b72b-4f30-a27c-e08e689cd8cb	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Delivered to recipient. Cash collected.	{}
4b35a4a2-4f1d-4a79-a8a5-4c743cc76f1a	2026-10-09 15:01:40.945+06	2026-10-10 15:01:41.152981+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
70633cc2-d691-47fb-ac0a-2e27d768111a	2026-10-09 16:01:40.945+06	2026-10-10 15:01:41.157622+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
c8828aa5-e688-4f4f-b293-8c12123c2b9d	2026-10-09 17:01:40.945+06	2026-10-10 15:01:41.162281+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
a3884055-ffb4-4c71-8908-64cddcb385f0	2026-10-09 18:01:40.945+06	2026-10-10 15:01:41.165787+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
46f41519-bd9e-44c5-9a54-03e5edf84442	2026-10-09 20:01:40.945+06	2026-10-10 15:01:41.169687+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
ff07356e-f505-452d-be4a-57dda86529c8	2026-10-09 22:01:40.945+06	2026-10-10 15:01:41.175011+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
c5cd369a-e805-4759-b8b1-8b86e8da7b14	2026-10-10 00:01:40.945+06	2026-10-10 15:01:41.179134+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
32c83fb7-80a5-44ae-87c4-21a54f64be63	2026-10-10 01:01:40.945+06	2026-10-10 15:01:41.186311+06	ff900ef3-c64b-4892-b200-7bb9ce18fcac	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
8b01a3f4-d032-4e94-ae4d-c34a3dbe33a9	2026-10-10 03:01:40.945+06	2026-10-10 15:01:41.206293+06	e52d3f7c-0aa5-4eac-9a1e-5d41a022b82c	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
072030a7-cd04-4403-b5b5-40e058ed2e5e	2026-10-10 04:01:40.945+06	2026-10-10 15:01:41.212204+06	e52d3f7c-0aa5-4eac-9a1e-5d41a022b82c	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
be826c55-c025-46e4-b6bc-5479205320f2	2026-10-10 05:01:40.945+06	2026-10-10 15:01:41.218708+06	e52d3f7c-0aa5-4eac-9a1e-5d41a022b82c	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
56f224c9-7096-4681-b70d-7bc57b631667	2026-10-10 06:01:40.945+06	2026-10-10 15:01:41.22358+06	e52d3f7c-0aa5-4eac-9a1e-5d41a022b82c	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
ba077e93-dfd7-4bdc-a209-96f08ffd3eb1	2026-10-10 08:01:40.945+06	2026-10-10 15:01:41.231377+06	e52d3f7c-0aa5-4eac-9a1e-5d41a022b82c	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
61641384-0c19-4a47-a00b-409ae80a4eb6	2026-10-10 10:01:40.945+06	2026-10-10 15:01:41.234791+06	e52d3f7c-0aa5-4eac-9a1e-5d41a022b82c	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
1b45e302-1b23-4e18-a0cf-b1a5bf8eabf9	2026-10-10 12:01:40.945+06	2026-10-10 15:01:41.237521+06	e52d3f7c-0aa5-4eac-9a1e-5d41a022b82c	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
1dadbff7-7144-414e-be8e-00e288fd9552	2026-10-10 05:01:40.945+06	2026-10-10 15:01:41.24652+06	4e341a73-92f4-4e4e-b808-dfa18473cdda	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
05570930-9973-4c3f-9972-678b95a811e8	2026-10-10 06:01:40.945+06	2026-10-10 15:01:41.249264+06	4e341a73-92f4-4e4e-b808-dfa18473cdda	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
adbbec7b-a96b-406e-aa00-7ee7cd6053cf	2026-10-10 07:01:40.945+06	2026-10-10 15:01:41.252377+06	4e341a73-92f4-4e4e-b808-dfa18473cdda	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
ede9f18f-0dee-42a7-9c2a-510bff8281ae	2026-10-10 08:01:40.945+06	2026-10-10 15:01:41.256188+06	4e341a73-92f4-4e4e-b808-dfa18473cdda	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
0b27a3ec-40b0-4712-969e-8bc9cf8d08a4	2026-10-10 10:01:40.945+06	2026-10-10 15:01:41.259405+06	4e341a73-92f4-4e4e-b808-dfa18473cdda	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
b1c59b71-ca8f-482a-a244-f9079af28c8b	2026-10-10 12:01:40.945+06	2026-10-10 15:01:41.262109+06	4e341a73-92f4-4e4e-b808-dfa18473cdda	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
5ebff12f-a50d-4696-accb-a17eaea81d7c	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.264958+06	4e341a73-92f4-4e4e-b808-dfa18473cdda	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
7b6dc3d3-e2bd-4425-8d16-266a3763649a	2026-10-10 07:01:40.945+06	2026-10-10 15:01:41.273896+06	4da2f894-06b3-470d-8977-8a2bc2cc5d05	\N	CREATED	PARCEL_CREATED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	MERCHANT	Shipment booked via merchant portal	{}
514deade-1ef0-4692-948c-5652daaa047b	2026-10-10 08:01:40.945+06	2026-10-10 15:01:41.277807+06	4da2f894-06b3-470d-8977-8a2bc2cc5d05	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Pickup rider assigned for collection	{}
b49c8ad3-6ac1-460e-88a2-f840e61ea4bb	2026-10-10 09:01:40.945+06	2026-10-10 15:01:41.281713+06	4da2f894-06b3-470d-8977-8a2bc2cc5d05	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	RIDER	Parcel collected from merchant warehouse	{}
b31c91c5-2f4c-4d84-a7eb-1dc089c10db5	2026-10-10 10:01:40.945+06	2026-10-10 15:01:41.284736+06	4da2f894-06b3-470d-8977-8a2bc2cc5d05	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
4bb362f5-9213-408c-8e2a-bd2877894c58	2026-10-10 12:01:40.945+06	2026-10-10 15:01:41.28773+06	4da2f894-06b3-470d-8977-8a2bc2cc5d05	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
108d047d-c92a-4dfb-a574-4b5776098558	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.290671+06	4da2f894-06b3-470d-8977-8a2bc2cc5d05	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Received and verified at local destination hub	{}
6fe5a9bb-d874-470b-87a2-17586035fcb4	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.294118+06	4da2f894-06b3-470d-8977-8a2bc2cc5d05	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	RIDER	Assigned to delivery run with OTP verification	{}
44589125-b9db-470d-b279-7aed9a671d7c	2026-10-10 08:01:40.945+06	2026-10-10 15:01:41.301373+06	e16ebc34-cc1c-4cf1-87f3-c560f62e888e	\N	CREATED	PARCEL_CREATED	00af8780-fea3-4d2a-9ebb-eccdff97971b	MERCHANT	Shipment booked via merchant portal	{}
63d601c9-adea-4305-8d67-5bb366f3b2aa	2026-10-10 09:01:40.945+06	2026-10-10 15:01:41.304075+06	e16ebc34-cc1c-4cf1-87f3-c560f62e888e	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Pickup rider assigned for collection	{}
114a6342-f5e0-4592-8195-69811ddcf89c	2026-10-10 10:01:40.945+06	2026-10-10 15:01:41.308098+06	e16ebc34-cc1c-4cf1-87f3-c560f62e888e	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Parcel collected from merchant warehouse	{}
a0365990-80bf-44ae-9767-de95c5233b1a	2026-10-10 11:01:40.945+06	2026-10-10 15:01:41.310876+06	e16ebc34-cc1c-4cf1-87f3-c560f62e888e	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
9c7a610b-42c8-44cc-8720-2ea62efff5dd	2026-10-10 13:01:40.945+06	2026-10-10 15:01:41.313694+06	e16ebc34-cc1c-4cf1-87f3-c560f62e888e	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
e3cbc8df-5b47-4197-b20d-bfebc9f1ba9d	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.316498+06	e16ebc34-cc1c-4cf1-87f3-c560f62e888e	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Received and verified at local destination hub	{}
f62efb6e-bdc3-406d-831f-b4ca7d1605ac	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.31957+06	e16ebc34-cc1c-4cf1-87f3-c560f62e888e	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Assigned to delivery run with OTP verification	{}
db3f4ff3-a866-4662-be94-93ca286417de	2026-10-09 23:01:40.945+06	2026-10-10 15:01:41.329133+06	88248b36-d230-447e-922c-041a1b8907ea	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
048ff79b-4ed5-4079-be54-0f804215de72	2026-10-10 00:01:40.945+06	2026-10-10 15:01:41.332209+06	88248b36-d230-447e-922c-041a1b8907ea	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
443ce995-e2ce-4b24-9000-597292b3d92d	2026-10-10 01:01:40.945+06	2026-10-10 15:01:41.335599+06	88248b36-d230-447e-922c-041a1b8907ea	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
b07e1552-a4c3-4a1e-8451-a718ffb9f2eb	2026-10-10 02:01:40.945+06	2026-10-10 15:01:41.338584+06	88248b36-d230-447e-922c-041a1b8907ea	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
5ac1bac8-4d1c-4b64-9bbf-39befc2a280d	2026-10-10 04:01:40.945+06	2026-10-10 15:01:41.341184+06	88248b36-d230-447e-922c-041a1b8907ea	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
f6c7deba-8382-48a4-8ac2-25d65e3a56fd	2026-10-10 06:01:40.945+06	2026-10-10 15:01:41.343738+06	88248b36-d230-447e-922c-041a1b8907ea	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
6222f343-b0ad-4160-881e-f19c9e2cf98c	2026-10-09 19:01:40.945+06	2026-10-10 15:01:41.351622+06	d12efce5-4f94-4447-9a9d-ec9f13d19b61	\N	CREATED	PARCEL_CREATED	00af8780-fea3-4d2a-9ebb-eccdff97971b	MERCHANT	Shipment booked via merchant portal	{}
556907c8-83a4-48b1-bf5c-98e4d9d76bc3	2026-10-09 20:01:40.945+06	2026-10-10 15:01:41.35445+06	d12efce5-4f94-4447-9a9d-ec9f13d19b61	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Pickup rider assigned for collection	{}
48e25d10-8f1a-4bb3-b77b-f3cbc5b55423	2026-10-09 21:01:40.945+06	2026-10-10 15:01:41.356961+06	d12efce5-4f94-4447-9a9d-ec9f13d19b61	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Parcel collected from merchant warehouse	{}
14518788-1368-4dca-959d-5333322d5556	2026-10-09 22:01:40.945+06	2026-10-10 15:01:41.361374+06	d12efce5-4f94-4447-9a9d-ec9f13d19b61	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
13f03371-b734-4f93-ae4c-d45957cb1a26	2026-10-10 00:01:40.945+06	2026-10-10 15:01:41.364162+06	d12efce5-4f94-4447-9a9d-ec9f13d19b61	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
83bac995-75eb-4b51-a80d-ca94124cd078	2026-10-10 02:01:40.945+06	2026-10-10 15:01:41.366875+06	d12efce5-4f94-4447-9a9d-ec9f13d19b61	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Received and verified at local destination hub	{}
5f5c309c-6b19-4f36-9942-ce3f603ee6ce	2026-10-09 21:01:40.945+06	2026-10-10 15:01:41.376905+06	eebb422b-dade-4625-a177-3d4d9cf3f52c	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
180a4c63-a464-4e11-9363-dde7259ebf98	2026-10-09 22:01:40.945+06	2026-10-10 15:01:41.381799+06	eebb422b-dade-4625-a177-3d4d9cf3f52c	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
77253f52-2619-41f5-8e8f-87d366bcbfa4	2026-10-09 23:01:40.945+06	2026-10-10 15:01:41.386319+06	eebb422b-dade-4625-a177-3d4d9cf3f52c	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
a05d39e9-a285-4b95-af0c-8a47218d5da8	2026-10-10 00:01:40.945+06	2026-10-10 15:01:41.391564+06	eebb422b-dade-4625-a177-3d4d9cf3f52c	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
73ba43d0-9920-47c2-bc7d-b535d6809740	2026-10-10 02:01:40.945+06	2026-10-10 15:01:41.395726+06	eebb422b-dade-4625-a177-3d4d9cf3f52c	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
40244ff7-d482-49c7-81e0-62577f7ad03a	2026-10-10 04:01:40.945+06	2026-10-10 15:01:41.399486+06	eebb422b-dade-4625-a177-3d4d9cf3f52c	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
249e267c-ab33-4a9c-9d07-a3888bfcfe6d	2026-10-10 00:01:40.945+06	2026-10-10 15:01:41.409356+06	99c69298-5874-4241-a993-9133884480b6	\N	CREATED	PARCEL_CREATED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	MERCHANT	Shipment booked via merchant portal	{}
53142d5d-3fb7-4ba2-987d-8dbf5de8824b	2026-10-10 01:01:40.945+06	2026-10-10 15:01:41.41341+06	99c69298-5874-4241-a993-9133884480b6	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Pickup rider assigned for collection	{}
ed2bec96-4ae6-450f-bf0e-747abbfbb438	2026-10-10 02:01:40.945+06	2026-10-10 15:01:41.417786+06	99c69298-5874-4241-a993-9133884480b6	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	RIDER	Parcel collected from merchant warehouse	{}
e592201d-6cf3-4ec9-ba1e-32c1eb3bc168	2026-10-10 03:01:40.945+06	2026-10-10 15:01:41.42126+06	99c69298-5874-4241-a993-9133884480b6	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
779d39b1-7ba8-42d1-8dab-afdc6441389d	2026-10-10 05:01:40.945+06	2026-10-10 15:01:41.424449+06	99c69298-5874-4241-a993-9133884480b6	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
0f8ac92a-221c-48df-9218-0632d0618ddb	2026-10-10 07:01:40.945+06	2026-10-10 15:01:41.428195+06	99c69298-5874-4241-a993-9133884480b6	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Received and verified at local destination hub	{}
3a5e2b7b-1558-48c1-a7e9-25641f81e4f5	2026-10-10 06:01:40.945+06	2026-10-10 15:01:41.436604+06	5c69ef73-e09c-4356-b2a9-287a2961c1e1	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
33ab76fb-085b-4f2d-b9f3-123fdd3f273a	2026-10-10 07:01:40.945+06	2026-10-10 15:01:41.440174+06	5c69ef73-e09c-4356-b2a9-287a2961c1e1	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
d144e24a-c85b-4fd3-9ae3-efc06567c4d7	2026-10-10 08:01:40.945+06	2026-10-10 15:01:41.444636+06	5c69ef73-e09c-4356-b2a9-287a2961c1e1	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
b17804ce-8ffa-4a86-badc-197b8372d6aa	2026-10-10 09:01:40.945+06	2026-10-10 15:01:41.448233+06	5c69ef73-e09c-4356-b2a9-287a2961c1e1	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
96eb3dcb-359d-451c-b951-84ee28b89014	2026-10-10 07:01:40.945+06	2026-10-10 15:01:41.46037+06	4dc6fd39-0fc5-46b6-a107-af4102c35ff0	\N	CREATED	PARCEL_CREATED	00af8780-fea3-4d2a-9ebb-eccdff97971b	MERCHANT	Shipment booked via merchant portal	{}
088a2419-8fb5-4562-b7ee-735f85aec313	2026-10-10 08:01:40.945+06	2026-10-10 15:01:41.463485+06	4dc6fd39-0fc5-46b6-a107-af4102c35ff0	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Pickup rider assigned for collection	{}
6083c6aa-756a-412b-98ed-3eca73066644	2026-10-10 09:01:40.945+06	2026-10-10 15:01:41.467316+06	4dc6fd39-0fc5-46b6-a107-af4102c35ff0	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Parcel collected from merchant warehouse	{}
e1cccc0f-9808-4fb7-b40e-3294dd3a6f90	2026-10-10 10:01:40.945+06	2026-10-10 15:01:41.471402+06	4dc6fd39-0fc5-46b6-a107-af4102c35ff0	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
2ee11005-1eb9-4d0b-97e8-19d7125d4dcd	2026-10-10 10:01:40.945+06	2026-10-10 15:01:41.480306+06	74a25234-0dac-4e05-8d9c-a22f7b02ac59	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
48f73f5d-9099-44d3-9d3b-fe82b076d8cb	2026-10-10 11:01:40.945+06	2026-10-10 15:01:41.483225+06	74a25234-0dac-4e05-8d9c-a22f7b02ac59	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
f8d4832d-d8ef-47b7-87b4-674c5bbc135c	2026-10-10 12:01:40.945+06	2026-10-10 15:01:41.48927+06	74a25234-0dac-4e05-8d9c-a22f7b02ac59	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
8e6eca79-342d-4516-a194-fa404418be5a	2026-10-10 13:01:40.945+06	2026-10-10 15:01:41.492801+06	74a25234-0dac-4e05-8d9c-a22f7b02ac59	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
713e3f11-a157-456b-b20c-fd266d191160	2026-10-10 12:01:40.945+06	2026-10-10 15:01:41.501475+06	ec332aa4-9677-4ebe-ab96-eacd3dae9dd4	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
4b6e3da5-fbd5-450a-8abc-8015a265e0b5	2026-10-10 13:01:40.945+06	2026-10-10 15:01:41.504602+06	ec332aa4-9677-4ebe-ab96-eacd3dae9dd4	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
df0e9c0a-c54e-4eed-85a1-b00462ab9123	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.50871+06	ec332aa4-9677-4ebe-ab96-eacd3dae9dd4	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
4568aa78-ec59-41ff-bccc-ef6e642ea1c9	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.51158+06	ec332aa4-9677-4ebe-ab96-eacd3dae9dd4	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
4081b61c-ae36-4b77-a150-a3e72ad075d2	2026-10-10 13:01:40.945+06	2026-10-10 15:01:41.518585+06	bb1621f5-088f-4c7c-b270-fb22b2f2ce6e	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
ea2f4444-b759-4b0d-b830-b1319f5e0eef	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.527012+06	5a89c249-3925-480e-9385-b71211c83195	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
c6029e9e-4537-47ae-b462-6ef15fccb864	2026-10-07 15:01:40.945+06	2026-10-10 15:01:41.535398+06	82c7dcde-908a-4668-864b-a9789f6e1fdb	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
10c46c90-3895-470d-aa4c-bea38cb41c22	2026-10-07 16:01:40.945+06	2026-10-10 15:01:41.540208+06	82c7dcde-908a-4668-864b-a9789f6e1fdb	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
0430a103-74f2-47f1-9548-edfcbf157773	2026-10-07 17:01:40.945+06	2026-10-10 15:01:41.544119+06	82c7dcde-908a-4668-864b-a9789f6e1fdb	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
c7331902-c926-4a87-bee9-92d2c5fcfa8b	2026-10-07 18:01:40.945+06	2026-10-10 15:01:41.548954+06	82c7dcde-908a-4668-864b-a9789f6e1fdb	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
3777b1be-6167-4568-93b3-1682cb7df9f5	2026-10-08 03:01:40.945+06	2026-10-10 15:01:41.557481+06	a38d4b68-c6ed-4111-9868-bd652175bb4d	\N	CREATED	PARCEL_CREATED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	MERCHANT	Shipment booked via merchant portal	{}
8b177311-9b29-40dd-85cb-41ffa4972f76	2026-10-06 15:01:40.945+06	2026-10-10 15:01:41.567843+06	993fdaf7-4056-4d1e-9dea-c7b02d490643	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
5bbfcff7-3de3-4e43-bc06-8aa82995642d	2026-10-06 16:01:40.945+06	2026-10-10 15:01:41.570731+06	993fdaf7-4056-4d1e-9dea-c7b02d490643	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
f5097b13-0ed5-48b4-bdfe-920489a065d6	2026-10-06 17:01:40.945+06	2026-10-10 15:01:41.574093+06	993fdaf7-4056-4d1e-9dea-c7b02d490643	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
aba9549e-f729-40a3-aada-dd6dbdeca7e0	2026-10-06 18:01:40.945+06	2026-10-10 15:01:41.577176+06	993fdaf7-4056-4d1e-9dea-c7b02d490643	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
0e31a513-eeb5-4983-9ae4-9f2b8d0b3b79	2026-10-07 15:01:40.945+06	2026-10-10 15:01:41.584746+06	b6ffcb07-11cd-4759-a0c3-c6f6461ccd65	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
4ec96e92-805f-40eb-9fc3-89bc18249c3e	2026-10-07 16:01:40.945+06	2026-10-10 15:01:41.588942+06	b6ffcb07-11cd-4759-a0c3-c6f6461ccd65	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
fe05c7f3-fcdb-4e7c-88de-c505bbf1a905	2026-10-07 17:01:40.945+06	2026-10-10 15:01:41.592345+06	b6ffcb07-11cd-4759-a0c3-c6f6461ccd65	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
e56eb9bb-7613-463b-81d8-1e2d314b63bc	2026-10-07 18:01:40.945+06	2026-10-10 15:01:41.595166+06	b6ffcb07-11cd-4759-a0c3-c6f6461ccd65	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
f3b63822-68b5-4fb7-8911-abdce33bec31	2026-10-08 13:01:40.945+06	2026-10-10 15:01:41.602264+06	42b3be24-9dc7-428c-8e2a-f0d557ac3818	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
23b73311-7d50-4251-a48f-da6831067a19	2026-10-08 14:01:40.945+06	2026-10-10 15:01:41.604776+06	42b3be24-9dc7-428c-8e2a-f0d557ac3818	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
0692bcd6-d369-445d-94f7-d39a3816f632	2026-10-08 15:01:40.945+06	2026-10-10 15:01:41.607199+06	42b3be24-9dc7-428c-8e2a-f0d557ac3818	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
e09f0c61-96b5-4826-b467-edcee5406a44	2026-10-08 16:01:40.945+06	2026-10-10 15:01:41.609579+06	42b3be24-9dc7-428c-8e2a-f0d557ac3818	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
666c3947-70c6-49e2-aead-6fd044f4c70e	2026-10-09 09:01:40.945+06	2026-10-10 15:01:41.617993+06	81bc6343-45a2-4f51-8be1-a0223c796918	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
1d035e07-a909-4244-a51f-94594a0497a3	2026-10-09 10:01:40.945+06	2026-10-10 15:01:41.621086+06	81bc6343-45a2-4f51-8be1-a0223c796918	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
d31a1a8b-39bc-492c-8cfa-1d57ba0286cb	2026-10-09 11:01:40.945+06	2026-10-10 15:01:41.623971+06	81bc6343-45a2-4f51-8be1-a0223c796918	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
6ba09294-7119-471a-b76e-27353b177170	2026-10-09 12:01:40.945+06	2026-10-10 15:01:41.627233+06	81bc6343-45a2-4f51-8be1-a0223c796918	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
bc7b8149-eec7-4327-b8a0-4f4f98af096a	2026-10-09 19:01:40.945+06	2026-10-10 15:01:41.635188+06	7db6d41e-70a5-41aa-98f1-596286cfeef1	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
4a7b2ff3-eb30-4377-b3ab-38eceb744a0b	2026-10-06 21:01:40.945+06	2026-10-10 15:01:41.642511+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
803aa16e-ac88-4657-80fc-ef4b804dd976	2026-10-06 22:01:40.945+06	2026-10-10 15:01:41.645055+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
eea4ad63-a44c-4a1b-814b-473eab0489ae	2026-10-06 23:01:40.945+06	2026-10-10 15:01:41.647496+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
d4ac581b-f9a8-4b11-aa7a-4f5148e02c4e	2026-10-07 00:01:40.945+06	2026-10-10 15:01:41.649928+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
2bf3ab6b-a21c-4533-8140-a937bb0be28a	2026-10-07 02:01:40.945+06	2026-10-10 15:01:41.652841+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
3ca2c0e7-b8c5-42f5-a565-5781d385df9a	2026-10-07 04:01:40.945+06	2026-10-10 15:01:41.656506+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
bd536825-ef7b-43de-97ce-2afea3255aee	2026-10-07 06:01:40.945+06	2026-10-10 15:01:41.659539+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
421f362b-5fbf-4dd6-b87a-aad8a4cf7b33	2026-10-07 07:01:40.945+06	2026-10-10 15:01:41.662206+06	931fb2c6-e000-48fd-9bc6-d11aa4473cfc	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
db69c3b5-c0e7-49f8-b73a-a436358481c7	2026-10-08 03:01:40.945+06	2026-10-10 15:01:41.671943+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
01c44278-be25-4746-8266-da6711d3f024	2026-10-08 04:01:40.945+06	2026-10-10 15:01:41.67519+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
de05dc9f-1dd9-43bd-af2e-4ad4c645b705	2026-10-08 05:01:40.945+06	2026-10-10 15:01:41.67776+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
1923da61-6b0a-4a36-904c-2eef6858c2d1	2026-10-08 06:01:40.945+06	2026-10-10 15:01:41.680853+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
a7923630-e715-4541-8904-ed581fed4f2c	2026-10-08 08:01:40.945+06	2026-10-10 15:01:41.683534+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
e823cfae-d317-4b38-82e8-8edab5490f3c	2026-10-08 10:01:40.945+06	2026-10-10 15:01:41.686217+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
36645924-930e-4261-8a30-81862a8e92b2	2026-10-08 12:01:40.945+06	2026-10-10 15:01:41.688617+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
1dc01215-4006-40ee-8928-f437def81dad	2026-10-08 13:01:40.945+06	2026-10-10 15:01:41.690982+06	71ec18cc-23b7-40ab-9383-24fd8ce71393	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
1391e3b0-b29b-4e80-a9c9-212a615aecde	2026-10-09 03:01:40.945+06	2026-10-10 15:01:41.698552+06	eb898186-4310-41fa-b8b4-18949a95420a	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
5b992b38-4fff-46b5-bbfc-0826a2a7c4c8	2026-10-09 04:01:40.945+06	2026-10-10 15:01:41.70155+06	eb898186-4310-41fa-b8b4-18949a95420a	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
95af4caa-2cb0-418d-9438-df5b1a0dcfdb	2026-10-09 05:01:40.945+06	2026-10-10 15:01:41.705096+06	eb898186-4310-41fa-b8b4-18949a95420a	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
e3961bdb-e792-4df4-97d6-1e6db9b5a4ae	2026-10-09 06:01:40.945+06	2026-10-10 15:01:41.708833+06	eb898186-4310-41fa-b8b4-18949a95420a	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
24ad5410-41ad-4029-bf7f-8b8e8dca9c89	2026-10-09 08:01:40.945+06	2026-10-10 15:01:41.711632+06	eb898186-4310-41fa-b8b4-18949a95420a	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
93d4c242-e41e-43b7-8405-26ce167ef994	2026-10-09 10:01:40.945+06	2026-10-10 15:01:41.714975+06	eb898186-4310-41fa-b8b4-18949a95420a	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
4f902d0f-fafb-46e5-872f-fc04cd8fd45c	2026-10-09 12:01:40.945+06	2026-10-10 15:01:41.718005+06	eb898186-4310-41fa-b8b4-18949a95420a	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
3611664a-4c6b-43a4-869d-b3b86186cb2a	2026-10-09 13:01:40.945+06	2026-10-10 15:01:41.721108+06	eb898186-4310-41fa-b8b4-18949a95420a	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
ccb4aab0-42cd-4154-8909-7d31650795d7	2026-10-08 08:01:40.945+06	2026-10-10 15:01:41.729508+06	f14ca1c6-65db-4792-b2be-31e3a82531d5	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
9ea90714-ac5a-48af-a275-aa7d246b91ae	2026-10-08 09:01:40.945+06	2026-10-10 15:01:41.73256+06	f14ca1c6-65db-4792-b2be-31e3a82531d5	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
0382d70d-6c0c-41f8-9553-494cc7228e85	2026-10-08 10:01:40.945+06	2026-10-10 15:01:41.736153+06	f14ca1c6-65db-4792-b2be-31e3a82531d5	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
bb568973-94f6-4161-a709-0e41784fd686	2026-10-08 11:01:40.945+06	2026-10-10 15:01:41.738988+06	f14ca1c6-65db-4792-b2be-31e3a82531d5	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
0defe9ec-106b-41a7-98e5-b548074cae5c	2026-10-08 13:01:40.945+06	2026-10-10 15:01:41.7414+06	f14ca1c6-65db-4792-b2be-31e3a82531d5	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
e705f56f-c4f4-41de-897f-075fac68b4fa	2026-10-08 15:01:40.945+06	2026-10-10 15:01:41.7438+06	f14ca1c6-65db-4792-b2be-31e3a82531d5	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
a3841bb8-406a-4942-bd3a-daee05ab3272	2026-10-08 17:01:40.945+06	2026-10-10 15:01:41.74701+06	f14ca1c6-65db-4792-b2be-31e3a82531d5	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
5b923bca-5ee1-4a4a-b7a9-eb06cf504c60	2026-10-08 18:01:40.945+06	2026-10-10 15:01:41.750994+06	f14ca1c6-65db-4792-b2be-31e3a82531d5	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
b52b7456-2b99-4e96-975b-3c957f0d9741	2026-10-08 19:01:40.945+06	2026-10-10 15:01:41.757769+06	d90657d9-d91e-4e7b-aa92-bdffc29c97d7	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
b4616d69-fc89-44ed-a614-3f3b0dce5529	2026-10-08 20:01:40.945+06	2026-10-10 15:01:41.762028+06	d90657d9-d91e-4e7b-aa92-bdffc29c97d7	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
f7747a8a-6ff3-4b31-8565-f5d1889ca751	2026-10-08 21:01:40.945+06	2026-10-10 15:01:41.764494+06	d90657d9-d91e-4e7b-aa92-bdffc29c97d7	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
3654a0ef-1fe2-428b-8887-19114b06b97e	2026-10-08 22:01:40.945+06	2026-10-10 15:01:41.767157+06	d90657d9-d91e-4e7b-aa92-bdffc29c97d7	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
2e65c467-86ff-4635-912a-a444d297075c	2026-10-09 00:01:40.945+06	2026-10-10 15:01:41.769852+06	d90657d9-d91e-4e7b-aa92-bdffc29c97d7	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
e368b8ad-f6e6-462e-9ef1-1c45419e536e	2026-10-09 02:01:40.945+06	2026-10-10 15:01:41.772607+06	d90657d9-d91e-4e7b-aa92-bdffc29c97d7	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
fb503dea-065f-43c0-a551-b6cbb5e9535c	2026-10-09 04:01:40.945+06	2026-10-10 15:01:41.775438+06	d90657d9-d91e-4e7b-aa92-bdffc29c97d7	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
3ae2c246-8170-4700-ae91-32856e004d53	2026-10-09 05:01:40.945+06	2026-10-10 15:01:41.777808+06	d90657d9-d91e-4e7b-aa92-bdffc29c97d7	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
f0572f9f-555e-4413-a841-de32a18fc3d7	2026-10-08 23:01:40.945+06	2026-10-10 15:01:41.784871+06	6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Shipment booked via merchant portal	{}
6c2676dd-271a-4634-8783-f7d767b52ecc	2026-10-09 00:01:40.945+06	2026-10-10 15:01:41.789691+06	6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Pickup rider assigned for collection	{}
5fdb81c7-7566-4f2e-ab15-5c439f65b8a6	2026-10-09 01:01:40.945+06	2026-10-10 15:01:41.793187+06	6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Parcel collected from merchant warehouse	{}
d3ef729e-7cf1-4c72-93f8-aeabbbbc0eb4	2026-10-09 02:01:40.945+06	2026-10-10 15:01:41.796089+06	6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
dc34fba7-e832-4cd1-8534-4ec245255818	2026-10-09 04:01:40.945+06	2026-10-10 15:01:41.799448+06	6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
246cfd86-c845-47a1-a82d-36d0aeb218ba	2026-10-09 06:01:40.945+06	2026-10-10 15:01:41.804098+06	6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	HUB_MANAGER	Received and verified at local destination hub	{}
fd6d948e-a8e5-4980-ba05-2798fd65187a	2026-10-09 08:01:40.945+06	2026-10-10 15:01:41.807613+06	6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Assigned to delivery run with OTP verification	{}
e5c36ca7-456d-4ff7-bbf5-f8f931b799e1	2026-10-09 09:01:40.945+06	2026-10-10 15:01:41.810588+06	6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	RIDER	Delivered to recipient. Cash collected.	{}
84ffb025-6aaf-4b4e-bd08-cba24ef084ee	2026-10-09 13:01:40.945+06	2026-10-10 15:01:41.819646+06	7ef639e7-8fec-4554-a29a-5b05d5bb9602	\N	CREATED	PARCEL_CREATED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	MERCHANT	Shipment booked via merchant portal	{}
deaa8c09-4bc0-45e1-96dc-a1d32a0ae70d	2026-10-09 14:01:40.945+06	2026-10-10 15:01:41.822424+06	7ef639e7-8fec-4554-a29a-5b05d5bb9602	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Pickup rider assigned for collection	{}
cb4d5ff3-9d74-42a3-93f5-d9014d1621ae	2026-10-09 15:01:40.945+06	2026-10-10 15:01:41.825344+06	7ef639e7-8fec-4554-a29a-5b05d5bb9602	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	RIDER	Parcel collected from merchant warehouse	{}
1f14d44f-08dd-46c6-a6ab-eae897e87e19	2026-10-09 16:01:40.945+06	2026-10-10 15:01:41.828792+06	7ef639e7-8fec-4554-a29a-5b05d5bb9602	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
55ec9aac-7df7-4f01-9d8d-d9043580aa5f	2026-10-09 21:01:40.945+06	2026-10-10 15:01:41.836722+06	3b7dc20b-7cbb-4898-8e5d-c45f9496b75c	\N	CREATED	PARCEL_CREATED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	MERCHANT	Shipment booked via merchant portal	{}
3382f094-7d71-44d8-a1c5-467198fb2d87	2026-10-09 22:01:40.945+06	2026-10-10 15:01:41.840477+06	3b7dc20b-7cbb-4898-8e5d-c45f9496b75c	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Pickup rider assigned for collection	{}
40260b46-543e-414e-933d-f2642e17bf7d	2026-10-09 23:01:40.945+06	2026-10-10 15:01:41.844066+06	3b7dc20b-7cbb-4898-8e5d-c45f9496b75c	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	RIDER	Parcel collected from merchant warehouse	{}
f268b0e6-0bb9-4081-a8e8-ac24b8bc7f39	2026-10-10 00:01:40.945+06	2026-10-10 15:01:41.846953+06	3b7dc20b-7cbb-4898-8e5d-c45f9496b75c	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
a1b21066-1de3-4009-a74e-ad7d5aefb9e4	2026-10-10 02:01:40.945+06	2026-10-10 15:01:41.849583+06	3b7dc20b-7cbb-4898-8e5d-c45f9496b75c	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
b9def86f-0091-4fe2-863b-d58cc0c53c4d	2026-10-10 04:01:40.945+06	2026-10-10 15:01:41.85241+06	3b7dc20b-7cbb-4898-8e5d-c45f9496b75c	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	533d0d32-6697-4091-bf0b-e9d7b649a9f2	HUB_MANAGER	Received and verified at local destination hub	{}
b0d58782-3d3a-43a8-ad7e-908e5a9fc976	2026-10-10 05:01:40.945+06	2026-10-10 15:01:41.860869+06	0cf43fc3-a293-4b8c-9763-451780b4f05f	\N	CREATED	PARCEL_CREATED	00af8780-fea3-4d2a-9ebb-eccdff97971b	MERCHANT	Shipment booked via merchant portal	{}
84e769e2-9f9d-4e13-8db8-78b259d13058	2026-10-10 06:01:40.945+06	2026-10-10 15:01:41.863483+06	0cf43fc3-a293-4b8c-9763-451780b4f05f	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Pickup rider assigned for collection	{}
b85e7817-1181-4ffe-aaee-44e1c25fc35c	2026-10-10 07:01:40.945+06	2026-10-10 15:01:41.866988+06	0cf43fc3-a293-4b8c-9763-451780b4f05f	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Parcel collected from merchant warehouse	{}
61c4cc84-68a7-4675-b3ef-0c782c3ef7bf	2026-10-10 08:01:40.945+06	2026-10-10 15:01:41.871695+06	0cf43fc3-a293-4b8c-9763-451780b4f05f	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
3c256e13-7012-4b34-8102-7ec733964565	2026-10-10 10:01:40.945+06	2026-10-10 15:01:41.875116+06	0cf43fc3-a293-4b8c-9763-451780b4f05f	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
0045b764-57da-41f1-9dd9-edfdaa48048e	2026-10-10 12:01:40.945+06	2026-10-10 15:01:41.87798+06	0cf43fc3-a293-4b8c-9763-451780b4f05f	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Received and verified at local destination hub	{}
329f9b12-8581-4570-8c50-5e93e6a0be78	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.881844+06	0cf43fc3-a293-4b8c-9763-451780b4f05f	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Assigned to delivery run with OTP verification	{}
47c38c4d-95c3-4d96-a6f2-523e9ec96a43	2026-10-07 17:01:40.945+06	2026-10-10 15:01:41.88984+06	ccdd727e-13cb-499f-b194-2c40ca7b383d	\N	CREATED	PARCEL_CREATED	00af8780-fea3-4d2a-9ebb-eccdff97971b	MERCHANT	Shipment booked via merchant portal	{}
01533cdf-17a6-4f5e-bdb8-da40a8769ba0	2026-10-07 18:01:40.945+06	2026-10-10 15:01:41.892993+06	ccdd727e-13cb-499f-b194-2c40ca7b383d	CREATED	ASSIGNED_TO_RIDER	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Pickup rider assigned for collection	{}
675c0e53-98ff-4133-b20a-28ea29697fe5	2026-10-07 19:01:40.945+06	2026-10-10 15:01:41.896901+06	ccdd727e-13cb-499f-b194-2c40ca7b383d	ASSIGNED_TO_RIDER	PICKED_UP	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Parcel collected from merchant warehouse	{}
bcdad6a4-a648-4760-a024-702329be6942	2026-10-07 20:01:40.945+06	2026-10-10 15:01:41.899757+06	ccdd727e-13cb-499f-b194-2c40ca7b383d	PICKED_UP	ORIGIN_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Inbound scanning completed at sorting hub	{}
8c083988-fe00-4b59-9c79-19836d48c121	2026-10-07 22:01:40.945+06	2026-10-10 15:01:41.902448+06	ccdd727e-13cb-499f-b194-2c40ca7b383d	ORIGIN_HUB_RECEIVED	IN_TRANSIT	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Consolidated into manifest dispatch vehicle	{}
46fde530-aefd-4770-aa2a-0b4be02c0508	2026-10-08 00:01:40.945+06	2026-10-10 15:01:41.905697+06	ccdd727e-13cb-499f-b194-2c40ca7b383d	IN_TRANSIT	DESTINATION_HUB_RECEIVED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	HUB_MANAGER	Received and verified at local destination hub	{}
8e2c2121-450c-4f4b-8285-76c1fdb0dc36	2026-10-08 02:01:40.945+06	2026-10-10 15:01:41.909155+06	ccdd727e-13cb-499f-b194-2c40ca7b383d	DESTINATION_HUB_RECEIVED	OUT_FOR_DELIVERY	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Assigned to delivery run with OTP verification	{}
cd0abcfe-c598-4399-8d6d-b388a74a9350	2026-10-08 03:01:40.945+06	2026-10-10 15:01:41.912465+06	ccdd727e-13cb-499f-b194-2c40ca7b383d	OUT_FOR_DELIVERY	DELIVERED	STATUS_CHANGED	00af8780-fea3-4d2a-9ebb-eccdff97971b	RIDER	Delivered to recipient. Cash collected.	{}
f5938791-d306-48f3-8d00-0598eb9d9469	2026-10-10 17:23:24.198536+06	2026-10-10 17:23:24.198536+06	31119a40-c334-47e2-8f31-12c6f6cd2d79	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
47bfc786-3661-4e34-bd7b-e9e894e67423	2026-10-10 17:23:59.193706+06	2026-10-10 17:23:59.193706+06	312013ca-8cdc-4f72-960d-7abbe0850658	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
2b08cf3f-7c5b-4480-95dc-c58ff934058c	2026-10-10 17:24:04.910541+06	2026-10-10 17:24:04.910541+06	4b73ac51-38c2-4c60-8db8-eb8a052166ef	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
65e6e2bc-8846-49f3-a7c6-b1b5fd5c8cca	2026-10-10 17:24:14.368111+06	2026-10-10 17:24:14.368111+06	7aedf5da-1226-4fdb-96bd-67867c6cbcbe	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
34d05005-cf10-41cc-8422-6cf37598c7aa	2026-10-10 17:24:25.567574+06	2026-10-10 17:24:25.567574+06	cc14599e-9601-4b01-a39d-beb18f60deb7	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
440cb408-e663-43eb-b3ad-f9aabea7a860	2026-10-10 17:25:09.630061+06	2026-10-10 17:25:09.630061+06	08170f21-a7e3-4c32-b05b-ce4e770bb4ef	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
9a72f374-b75c-42ec-8744-308517d64257	2026-10-10 17:28:22.43748+06	2026-10-10 17:28:22.43748+06	23e1de97-7721-461a-a94c-a623c7bc294b	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
e06cd2b9-69bf-44ca-bf3b-7faf97cf69c0	2026-10-10 17:28:51.482974+06	2026-10-10 17:28:51.482974+06	40f4d68d-4804-473d-8ebf-699ebe222473	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
57097421-fa05-4a25-8561-7850c8379639	2026-10-10 17:31:01.038932+06	2026-10-10 17:31:01.038932+06	40fe8418-db67-4ab2-9e99-325e6bebf9f0	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
4973804b-c970-4dd3-bed4-05d346e1792b	2026-10-10 17:32:33.393114+06	2026-10-10 17:32:33.393114+06	c80d00dc-80cd-4a54-b76e-7de34cd998d7	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
c4a19aa4-d145-46a6-a345-18549d3c0ad9	2026-10-10 17:33:15.0066+06	2026-10-10 17:33:15.0066+06	95a3cba9-831c-4ebf-aca7-1397afeff187	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
6484333c-046e-4cd4-9fa2-2605dfb4a911	2026-10-10 17:34:41.817966+06	2026-10-10 17:34:41.817966+06	b98dd832-1012-4c74-a985-0a8998dbda2a	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
610fa56a-dcd6-4f84-a3e8-bde1794cabc7	2026-10-10 17:35:58.65615+06	2026-10-10 17:35:58.65615+06	28339e53-3fc5-4631-9e03-4202d1c52554	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
957cb5a1-97fd-4428-8799-1a23c780b7cf	2026-10-10 17:37:10.294174+06	2026-10-10 17:37:10.294174+06	b817b5cd-e112-4a4e-96cd-98c72d55bd20	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
24eea1a3-f0ec-4a96-b9e0-f8bfd2f8a275	2026-10-10 17:38:30.447922+06	2026-10-10 17:38:30.447922+06	1a17de77-1411-4910-aef4-bc272f7aec05	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
767d4383-f087-4aa6-8735-61a9fb51f8e6	2026-10-10 17:39:39.296677+06	2026-10-10 17:39:39.296677+06	9d826076-322d-43b4-bddf-0951b52f459d	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
4d928c11-ef07-4b8d-a2df-5b9832ea4915	2026-10-10 17:40:21.474604+06	2026-10-10 17:40:21.474604+06	ce82d560-935e-4e91-9d63-805c4bed0ba7	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
d56c6459-4fb0-4abb-a2bf-c9346d5fac55	2026-10-10 17:40:53.680731+06	2026-10-10 17:40:53.680731+06	32fdb0f2-ca79-4e9c-ab89-5a04daa5aac0	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
4be1472c-b5a1-4da7-843c-37adc9b82ed8	2026-10-10 17:41:01.597989+06	2026-10-10 17:41:01.597989+06	689b57e6-30c4-48ba-ae76-2ba648d16cb2	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
31868f6c-7495-4630-b23d-5e807555fa90	2026-10-10 17:41:13.428556+06	2026-10-10 17:41:13.428556+06	5f550109-a36b-4dca-94be-b6594c62879f	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
b96602f7-7629-47a7-abc9-449da594b8a7	2026-10-10 17:41:47.771076+06	2026-10-10 17:41:47.771076+06	2da4f6aa-3e04-4210-8dca-8abb1cc35b09	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
80f31ff7-057a-4f85-aab8-16434acc8b77	2026-10-10 17:42:15.92795+06	2026-10-10 17:42:15.92795+06	4582e06d-4420-49d1-8788-cc58763022d8	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
256a32cf-ee3f-4faf-a979-4bda77235825	2026-10-10 17:42:27.570466+06	2026-10-10 17:42:27.570466+06	b8716788-f0a6-45a5-a5fc-fd59d860f8b1	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
a9aa6c75-0ab8-4462-91ae-f9c166d6a9ca	2026-10-10 17:42:35.714116+06	2026-10-10 17:42:35.714116+06	39a1d3e9-c47d-41d2-8fa1-68983af68e4e	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
6657101a-9a88-4ae7-bd1b-172606365ba5	2026-10-10 17:42:47.797055+06	2026-10-10 17:42:47.797055+06	4d35d4c4-a705-453b-a67a-4fd47559e2c1	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
16c6056b-f397-4116-886d-2693c2e85e7d	2026-10-10 17:43:03.100204+06	2026-10-10 17:43:03.100204+06	a3c2b3e2-e0b8-4545-ad11-c560cddda2e3	\N	CREATED	PARCEL_CREATED	e55e6fe7-eda2-4766-8c86-c924232ce0bc	MERCHANT	Initial booking created	{"pricing": {"zone": "INSIDE_DHAKA", "codFee": 0, "baseFee": 60, "discount": 0, "totalFee": 60, "weightFee": 0, "estimatedDays": "24-48 Hours", "additionalCharge": 0}}
\.


--
-- Data for Name: parcels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parcels (id, "createdAt", "updatedAt", tracking_code, merchant_id, current_rider_id, current_hub_id, recipient_name, parcel_description, recipient_phone, raw_address, district, thana, normalized_address, weight, cod_amount, delivery_fee, status, delivery_otp_hash, otp_expires_at, otp_attempts, otp_verified_at, otp_request_count, last_otp_requested_at) FROM stdin;
89dded52-d5f7-464a-8af8-8b0c26091dec	2026-10-08 15:01:40.945+06	2026-10-10 15:01:40.958029+06	DHR-2610-00101	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Tanvir Ahmed	\N	01711223344	House 12, Road 5, Block B, Dhanmondi, Dhaka	Dhaka	Dhanmondi	{"thana": "Dhanmondi", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 12, Road 5, Block B, Dhanmondi, Dhaka"}	1.20	1850.00	70.00	DELIVERED	\N	\N	0	\N	0	\N
1efa9ffb-acca-4ec4-8729-c678e325d215	2026-10-08 21:01:40.945+06	2026-10-10 15:01:41.002379+06	DHR-2610-00102	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Nusrat Jahan	\N	01822334455	Apartment 4B, Navana Tower, Gulshan 1, Dhaka	Dhaka	Gulshan	{"thana": "Gulshan", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Apartment 4B, Navana Tower, Gulshan 1, Dhaka"}	0.80	2450.00	60.00	DELIVERED	\N	\N	0	\N	0	\N
0251b4c7-da39-4de7-a0c4-419b902280cf	2026-10-09 03:01:40.945+06	2026-10-10 15:01:41.034714+06	DHR-2610-00103	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	Md. Shakib Al Hasan	\N	01933445566	Plot 8, Road 2, Sector 11, Uttara, Dhaka	Dhaka	Uttara	{"thana": "Uttara", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Plot 8, Road 2, Sector 11, Uttara, Dhaka"}	2.50	3200.00	85.00	DELIVERED	\N	\N	0	\N	0	\N
568bab1d-20fd-40c4-ad4c-48edd639e4ee	2026-10-09 09:01:40.945+06	2026-10-10 15:01:41.072682+06	DHR-2610-00104	b2610025-c66e-4c17-9e5b-439fca2a40ac	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Farhana Akter	\N	01644556677	House 73, Road 11, Banani, Dhaka	Dhaka	Banani	{"thana": "Banani", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 73, Road 11, Banani, Dhaka"}	1.50	1450.00	70.00	DELIVERED	\N	\N	0	\N	0	\N
cdf5501e-b72b-4f30-a27c-e08e689cd8cb	2026-10-09 11:01:40.945+06	2026-10-10 15:01:41.109635+06	DHR-2610-00105	98b1f798-a67b-40d9-abd9-54d3492fbbd9	23790d2d-77e6-43bb-8c61-c67d5039bcd9	8b7bfed1-6ee0-4f8e-8bfa-a10be808dd91	Mehedi Hasan	\N	01855667788	Holding 420, Agrabad Commercial Area, Chittagong	Chittagong	Double Mooring	{"thana": "Double Mooring", "district": "Chittagong", "division": "Dhaka", "formattedAddress": "Holding 420, Agrabad Commercial Area, Chittagong"}	3.00	5600.00	130.00	DELIVERED	\N	\N	0	\N	0	\N
ff900ef3-c64b-4892-b200-7bb9ce18fcac	2026-10-09 15:01:40.945+06	2026-10-10 15:01:41.146671+06	DHR-2610-00106	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	Sadia Islam	\N	01766778899	Section 10, Block C, Mirpur, Dhaka	Dhaka	Mirpur	{"thana": "Mirpur", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Section 10, Block C, Mirpur, Dhaka"}	0.50	950.00	60.00	DELIVERED	\N	\N	0	\N	0	\N
e52d3f7c-0aa5-4eac-9a1e-5d41a022b82c	2026-10-10 03:01:40.945+06	2026-10-10 15:01:41.195466+06	DHR-2610-00107	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Shamim Reza	\N	01777889900	House 28, Road 4A, Dhanmondi, Dhaka	Dhaka	Dhanmondi	{"thana": "Dhanmondi", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 28, Road 4A, Dhanmondi, Dhaka"}	1.00	2100.00	70.00	OUT_FOR_DELIVERY	\N	\N	0	\N	0	\N
4e341a73-92f4-4e4e-b808-dfa18473cdda	2026-10-10 05:01:40.945+06	2026-10-10 15:01:41.242898+06	DHR-2610-00108	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Afsana Mimi	\N	01888990011	Flat 6A, House 15, Green Road, Dhaka	Dhaka	Kalabagan	{"thana": "Kalabagan", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Flat 6A, House 15, Green Road, Dhaka"}	1.80	1750.00	70.00	OUT_FOR_DELIVERY	\N	\N	0	\N	0	\N
4da2f894-06b3-470d-8977-8a2bc2cc5d05	2026-10-10 07:01:40.945+06	2026-10-10 15:01:41.269692+06	DHR-2610-00109	b2610025-c66e-4c17-9e5b-439fca2a40ac	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	Kamrul Hasan	\N	01999001122	Sector 4, Road 7, House 21, Uttara, Dhaka	Dhaka	Uttara	{"thana": "Uttara", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Sector 4, Road 7, House 21, Uttara, Dhaka"}	2.20	3800.00	85.00	OUT_FOR_DELIVERY	\N	\N	0	\N	0	\N
e16ebc34-cc1c-4cf1-87f3-c560f62e888e	2026-10-10 08:01:40.945+06	2026-10-10 15:01:41.29779+06	DHR-2610-00110	98b1f798-a67b-40d9-abd9-54d3492fbbd9	23790d2d-77e6-43bb-8c61-c67d5039bcd9	8b7bfed1-6ee0-4f8e-8bfa-a10be808dd91	Arifur Rahman	\N	01811224466	Road 3, Nasirabad Housing Society, Chittagong	Chittagong	Panchlaish	{"thana": "Panchlaish", "district": "Chittagong", "division": "Dhaka", "formattedAddress": "Road 3, Nasirabad Housing Society, Chittagong"}	1.10	2900.00	130.00	OUT_FOR_DELIVERY	\N	\N	0	\N	0	\N
88248b36-d230-447e-922c-041a1b8907ea	2026-10-09 23:01:40.945+06	2026-10-10 15:01:41.324616+06	DHR-2610-00111	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	605e5c84-a443-4c41-9452-8e57d27a969b	Rezaul Karim	\N	01722335577	House 84, Road 11, Block D, Mirpur 12, Dhaka	Dhaka	Mirpur	{"thana": "Mirpur", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 84, Road 11, Block D, Mirpur 12, Dhaka"}	1.40	1650.00	70.00	DESTINATION_HUB_RECEIVED	\N	\N	0	\N	0	\N
d12efce5-4f94-4447-9a9d-ec9f13d19b61	2026-10-09 19:01:40.945+06	2026-10-10 15:01:41.34799+06	DHR-2610-00112	98b1f798-a67b-40d9-abd9-54d3492fbbd9	\N	9969a9f4-5d05-4363-8bea-7c028824bc49	Kazi Mahbub	\N	01733446688	East Zindabazar, Sylhet Sadar, Sylhet	Sylhet	Sylhet Sadar	{"thana": "Sylhet Sadar", "district": "Sylhet", "division": "Dhaka", "formattedAddress": "East Zindabazar, Sylhet Sadar, Sylhet"}	2.00	4300.00	150.00	DESTINATION_HUB_RECEIVED	\N	\N	0	\N	0	\N
eebb422b-dade-4625-a177-3d4d9cf3f52c	2026-10-09 21:01:40.945+06	2026-10-10 15:01:41.37095+06	DHR-2610-00113	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	605e5c84-a443-4c41-9452-8e57d27a969b	Nasir Uddin	\N	01844557799	Muradpur More, Panchlaish, Chittagong	Chittagong	Panchlaish	{"thana": "Panchlaish", "district": "Chittagong", "division": "Dhaka", "formattedAddress": "Muradpur More, Panchlaish, Chittagong"}	3.50	4900.00	140.00	IN_TRANSIT	\N	\N	0	\N	0	\N
99c69298-5874-4241-a993-9133884480b6	2026-10-10 00:01:40.945+06	2026-10-10 15:01:41.40484+06	DHR-2610-00114	b2610025-c66e-4c17-9e5b-439fca2a40ac	\N	605e5c84-a443-4c41-9452-8e57d27a969b	Fariha Yasmin	\N	01955668800	Shaheb Bazar, Rajshahi Sadar, Rajshahi	Rajshahi	Rajshahi Sadar	{"thana": "Rajshahi Sadar", "district": "Rajshahi", "division": "Dhaka", "formattedAddress": "Shaheb Bazar, Rajshahi Sadar, Rajshahi"}	1.00	2200.00	130.00	IN_TRANSIT	\N	\N	0	\N	0	\N
5c69ef73-e09c-4356-b2a9-287a2961c1e1	2026-10-10 06:01:40.945+06	2026-10-10 15:01:41.43218+06	DHR-2610-00115	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	605e5c84-a443-4c41-9452-8e57d27a969b	Jashim Uddin	\N	01766779911	House 5, Road 2, Block F, Banasree, Dhaka	Dhaka	Rampura	{"thana": "Rampura", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 5, Road 2, Block F, Banasree, Dhaka"}	0.90	1100.00	60.00	ORIGIN_HUB_RECEIVED	\N	\N	0	\N	0	\N
4dc6fd39-0fc5-46b6-a107-af4102c35ff0	2026-10-10 07:01:40.945+06	2026-10-10 15:01:41.453465+06	DHR-2610-00116	98b1f798-a67b-40d9-abd9-54d3492fbbd9	\N	605e5c84-a443-4c41-9452-8e57d27a969b	Shahidul Islam	\N	01877880022	Shibbari More, Sonadanga, Khulna	Khulna	Sonadanga	{"thana": "Sonadanga", "district": "Khulna", "division": "Dhaka", "formattedAddress": "Shibbari More, Sonadanga, Khulna"}	4.00	6800.00	160.00	ORIGIN_HUB_RECEIVED	\N	\N	0	\N	0	\N
74a25234-0dac-4e05-8d9c-a22f7b02ac59	2026-10-10 10:01:40.945+06	2026-10-10 15:01:41.475925+06	DHR-2610-00117	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Anowar Hossain	\N	01988991133	Kakrail VIP Road, Ramna, Dhaka	Dhaka	Ramna	{"thana": "Ramna", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Kakrail VIP Road, Ramna, Dhaka"}	1.60	2750.00	70.00	PICKED_UP	\N	\N	0	\N	0	\N
ec332aa4-9677-4ebe-ab96-eacd3dae9dd4	2026-10-10 12:01:40.945+06	2026-10-10 15:01:41.497606+06	DHR-2610-00118	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	Babul Akhter	\N	01799002244	Sector 7, Road 13, Uttara, Dhaka	Dhaka	Uttara	{"thana": "Uttara", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Sector 7, Road 13, Uttara, Dhaka"}	0.70	1350.00	60.00	ASSIGNED_TO_RIDER	\N	\N	0	\N	0	\N
bb1621f5-088f-4c7c-b270-fb22b2f2ce6e	2026-10-10 13:01:40.945+06	2026-10-10 15:01:41.515046+06	DHR-2610-00119	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Taslima Begum	\N	01811223355	House 34, Road 9, Dhanmondi, Dhaka	Dhaka	Dhanmondi	{"thana": "Dhanmondi", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 34, Road 9, Dhanmondi, Dhaka"}	1.20	1980.00	70.00	CREATED	\N	\N	0	\N	0	\N
5a89c249-3925-480e-9385-b71211c83195	2026-10-10 14:01:40.945+06	2026-10-10 15:01:41.523026+06	DHR-2610-00120	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Mizanur Rahman	\N	01722334466	Plot 14, Block E, Bashundhara R/A, Dhaka	Dhaka	Bhatara	{"thana": "Bhatara", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Plot 14, Block E, Bashundhara R/A, Dhaka"}	2.10	3100.00	85.00	CREATED	\N	\N	0	\N	0	\N
82c7dcde-908a-4668-864b-a9789f6e1fdb	2026-10-07 15:01:40.945+06	2026-10-10 15:01:41.53031+06	DHR-2610-00121	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	605e5c84-a443-4c41-9452-8e57d27a969b	Habibur Rahman	\N	01933445577	House 19, Road 8, Mohammadpur, Dhaka	Dhaka	Mohammadpur	{"thana": "Mohammadpur", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 19, Road 8, Mohammadpur, Dhaka"}	1.00	1500.00	70.00	RETURNED_TO_MERCHANT	\N	\N	0	\N	0	\N
a38d4b68-c6ed-4111-9868-bd652175bb4d	2026-10-08 03:01:40.945+06	2026-10-10 15:01:41.553907+06	DHR-2610-00122	b2610025-c66e-4c17-9e5b-439fca2a40ac	\N	\N	Rubel Mia	\N	01644556688	Station Road, Mymensingh Sadar	Mymensingh	Mymensingh Sadar	{"thana": "Mymensingh Sadar", "district": "Mymensingh", "division": "Dhaka", "formattedAddress": "Station Road, Mymensingh Sadar"}	1.50	2200.00	130.00	CANCELLED	\N	\N	0	\N	0	\N
993fdaf7-4056-4d1e-9dea-c7b02d490643	2026-10-06 15:01:40.945+06	2026-10-10 15:01:41.562172+06	DHR-2610-00201	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Risky Receiver	\N	01799001122	mirpur dhaka	Dhaka	Mirpur	{"thana": "Mirpur", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "mirpur dhaka"}	1.00	12500.00	70.00	RETURNED_TO_MERCHANT	\N	\N	0	\N	0	\N
b6ffcb07-11cd-4759-a0c3-c6f6461ccd65	2026-10-07 15:01:40.945+06	2026-10-10 15:01:41.581162+06	DHR-2610-00202	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Risky Receiver	\N	01799001122	uttara dhaka	Dhaka	Uttara	{"thana": "Uttara", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "uttara dhaka"}	0.90	9800.00	70.00	RETURNED_TO_MERCHANT	\N	\N	0	\N	0	\N
42b3be24-9dc7-428c-8e2a-f0d557ac3818	2026-10-08 13:01:40.945+06	2026-10-10 15:01:41.598355+06	DHR-2610-00203	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	Risky Receiver	\N	01799001122	dhanmandi dhka	Dhaka	Dhanmondi	{"thana": "Dhanmondi", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "dhanmandi dhka"}	1.40	15200.00	70.00	RTO_INITIATED	\N	\N	0	\N	0	\N
81bc6343-45a2-4f51-8be1-a0223c796918	2026-10-09 09:01:40.945+06	2026-10-10 15:01:41.613594+06	DHR-2610-00204	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Risky Receiver	\N	01799001122	house, road, dhaka	Dhaka	Mirpur	{"thana": "Mirpur", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "house, road, dhaka"}	0.70	8600.00	60.00	DELIVERY_ATTEMPTED	\N	\N	0	\N	0	\N
7db6d41e-70a5-41aa-98f1-596286cfeef1	2026-10-09 19:01:40.945+06	2026-10-10 15:01:41.631569+06	DHR-2610-00205	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Risky Receiver	\N	01799001122	jatrabari dhaka	Dhaka	Jatrabari	{"thana": "Jatrabari", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "jatrabari dhaka"}	1.10	7400.00	70.00	CANCELLED	\N	\N	0	\N	0	\N
931fb2c6-e000-48fd-9bc6-d11aa4473cfc	2026-10-06 21:01:40.945+06	2026-10-10 15:01:41.638314+06	DHR-2610-00206	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Loyal Buyer	\N	01788112233	House 42, Road 7, Sector 4, Uttara, Dhaka-1230	Dhaka	Uttara	{"thana": "Uttara", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 42, Road 7, Sector 4, Uttara, Dhaka-1230"}	0.90	2200.00	60.00	DELIVERED	\N	\N	0	\N	0	\N
71ec18cc-23b7-40ab-9383-24fd8ce71393	2026-10-08 03:01:40.945+06	2026-10-10 15:01:41.666313+06	DHR-2610-00207	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Loyal Buyer	\N	01788112233	Flat 8C, House 19, Road 11, Banani, Dhaka-1213	Dhaka	Banani	{"thana": "Banani", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "Flat 8C, House 19, Road 11, Banani, Dhaka-1213"}	1.30	3100.00	60.00	DELIVERED	\N	\N	0	\N	0	\N
eb898186-4310-41fa-b8b4-18949a95420a	2026-10-09 03:01:40.945+06	2026-10-10 15:01:41.694851+06	DHR-2610-00208	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	Loyal Buyer	\N	01788112233	House 5, Road 2, Dhanmondi, Dhaka-1205	Dhaka	Dhanmondi	{"thana": "Dhanmondi", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "House 5, Road 2, Dhanmondi, Dhaka-1205"}	0.60	1500.00	60.00	DELIVERED	\N	\N	0	\N	0	\N
f14ca1c6-65db-4792-b2be-31e3a82531d5	2026-10-08 08:01:40.945+06	2026-10-10 15:01:41.725511+06	DHR-2610-00209	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Karim Uddin	\N	01777112233	Debiganj Bazar, Debiganj, Panchagarh	Panchagarh	Debiganj	{"thana": "Debiganj", "district": "Panchagarh", "division": "Dhaka", "formattedAddress": "Debiganj Bazar, Debiganj, Panchagarh"}	1.00	2800.00	130.00	DELIVERED	\N	\N	0	\N	0	\N
d90657d9-d91e-4e7b-aa92-bdffc29c97d7	2026-10-08 19:01:40.945+06	2026-10-10 15:01:41.75446+06	DHR-2610-00210	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Rahima Begum	\N	01766223344	Char Fasson Launch Ghat, Char Fasson, Bhola	Bhola	Char Fasson	{"thana": "Char Fasson", "district": "Bhola", "division": "Dhaka", "formattedAddress": "Char Fasson Launch Ghat, Char Fasson, Bhola"}	1.50	3900.00	140.00	DELIVERED	\N	\N	0	\N	0	\N
6ddb89a1-f13e-4074-87bf-f8bd13f0e1a0	2026-10-08 23:01:40.945+06	2026-10-10 15:01:41.781111+06	DHR-2610-00211	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Abdul Malek	\N	01755334455	মিরপুর ১০, ঢাকা	Dhaka	Mirpur	{"thana": "Mirpur", "district": "Dhaka", "division": "Dhaka", "formattedAddress": "মিরপুর ১০, ঢাকা"}	0.80	1900.00	60.00	DELIVERED	\N	\N	0	\N	0	\N
7ef639e7-8fec-4554-a29a-5b05d5bb9602	2026-10-09 13:01:40.945+06	2026-10-10 15:01:41.815737+06	DHR-2610-00212	b2610025-c66e-4c17-9e5b-439fca2a40ac	a14628fd-0ffa-4615-8561-81d34dd104ef	605e5c84-a443-4c41-9452-8e57d27a969b	Farhana Islam	\N	01712128899	House 8, Block C, Halishahar, Chattogram	Chattogram	Halishahar	{"thana": "Halishahar", "district": "Chattogram", "division": "Dhaka", "formattedAddress": "House 8, Block C, Halishahar, Chattogram"}	1.10	0.00	120.00	DELIVERY_ATTEMPTED	\N	\N	0	\N	0	\N
3b7dc20b-7cbb-4898-8e5d-c45f9496b75c	2026-10-09 21:01:40.945+06	2026-10-10 15:01:41.83304+06	DHR-2610-00213	b2610025-c66e-4c17-9e5b-439fca2a40ac	\N	605e5c84-a443-4c41-9452-8e57d27a969b	Sylhet Traders	\N	01734347766	Zindabazar Point, Sylhet	Sylhet	Zindabazar	{"thana": "Zindabazar", "district": "Sylhet", "division": "Dhaka", "formattedAddress": "Zindabazar Point, Sylhet"}	2.00	5600.00	130.00	IN_TRANSIT	\N	\N	0	\N	0	\N
0cf43fc3-a293-4b8c-9763-451780b4f05f	2026-10-10 05:01:40.945+06	2026-10-10 15:01:41.857079+06	DHR-2610-00214	98b1f798-a67b-40d9-abd9-54d3492fbbd9	\N	605e5c84-a443-4c41-9452-8e57d27a969b	Rajshahi Store	\N	01756556677	Shaheb Bazar, Boalia, Rajshahi	Rajshahi	Boalia	{"thana": "Boalia", "district": "Rajshahi", "division": "Dhaka", "formattedAddress": "Shaheb Bazar, Boalia, Rajshahi"}	0.50	1200.00	110.00	OUT_FOR_DELIVERY	\N	\N	0	\N	0	\N
ccdd727e-13cb-499f-b194-2c40ca7b383d	2026-10-07 17:01:40.945+06	2026-10-10 15:01:41.886203+06	DHR-2610-00215	98b1f798-a67b-40d9-abd9-54d3492fbbd9	98d02dbf-e366-400e-8b4e-ac3622da0aab	605e5c84-a443-4c41-9452-8e57d27a969b	Khulna Mart	\N	01778779900	KDA Avenue, Sonadanga, Khulna	Khulna	Sonadanga	{"thana": "Sonadanga", "district": "Khulna", "division": "Dhaka", "formattedAddress": "KDA Avenue, Sonadanga, Khulna"}	1.70	18900.00	130.00	DELIVERED	\N	\N	0	\N	0	\N
31119a40-c334-47e2-8f31-12c6f6cd2d79	2026-10-10 17:23:24.198536+06	2026-10-10 17:23:24.198536+06	DHR-20261010-ZCXWHG	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient LISTMV2B2UPEH8TK	\N	01731403762	House 12, Road 5, Dhanmondi LISTMV2B2UPEH8TK	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
312013ca-8cdc-4f72-960d-7abbe0850658	2026-10-10 17:23:59.193706+06	2026-10-10 17:23:59.193706+06	DHR-20261010-JK4L96	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PAGEMV2B3LO63RXA	\N	01731438710	House 12, Road 5, Dhanmondi PAGEMV2B3LO63RXA	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
4b73ac51-38c2-4c60-8db8-eb8a052166ef	2026-10-10 17:24:04.910541+06	2026-10-10 17:24:04.910541+06	DHR-20261010-8PQX5E	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient BACKMV2B3Q9J7KZ9	\N	01731444663	House 12, Road 5, Dhanmondi BACKMV2B3Q9J7KZ9	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
7aedf5da-1226-4fdb-96bd-67867c6cbcbe	2026-10-10 17:24:14.368111+06	2026-10-10 17:24:14.368111+06	DHR-20261010-TK2P7R	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient SHAREMV2B3XJYSF6R	\N	01731454110	House 12, Road 5, Dhanmondi SHAREMV2B3XJYSF6R	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
cc14599e-9601-4b01-a39d-beb18f60deb7	2026-10-10 17:24:25.567574+06	2026-10-10 17:24:25.567574+06	DHR-20261010-BC8QHZ	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient RELOADMV2B4630376I	\N	01731465164	House 12, Road 5, Dhanmondi RELOADMV2B4630376I	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
08170f21-a7e3-4c32-b05b-ce4e770bb4ef	2026-10-10 17:25:09.630061+06	2026-10-10 17:25:09.630061+06	DHR-20261010-LJUGTX	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient LISTMV2B546CO4N0	\N	01731509348	House 12, Road 5, Dhanmondi LISTMV2B546CO4N0	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
23e1de97-7721-461a-a94c-a623c7bc294b	2026-10-10 17:28:22.43748+06	2026-10-10 17:28:22.43748+06	DHR-20261010-PGFTGK	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2B98L6	\N	01731701690	House 1 PROBEMV2B98L6	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
40f4d68d-4804-473d-8ebf-699ebe222473	2026-10-10 17:28:51.482974+06	2026-10-10 17:28:51.482974+06	DHR-20261010-D56LZV	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2B9UDV	\N	01731729940	House 1 PROBEMV2B9UDV	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
40fe8418-db67-4ab2-9e99-325e6bebf9f0	2026-10-10 17:31:01.038932+06	2026-10-10 17:31:01.038932+06	DHR-20261010-EGC4FF	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2BCMTM	\N	01731860107	House 1 PROBEMV2BCMTM	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
c80d00dc-80cd-4a54-b76e-7de34cd998d7	2026-10-10 17:32:33.393114+06	2026-10-10 17:32:33.393114+06	DHR-20261010-B62QC3	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2BEM0D	\N	01731952367	House 1 PROBEMV2BEM0D	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
95a3cba9-831c-4ebf-aca7-1397afeff187	2026-10-10 17:33:15.0066+06	2026-10-10 17:33:15.0066+06	DHR-20261010-2BM7TS	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2BFIOW	\N	01731994721	House 1 PROBEMV2BFIOW	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
b98dd832-1012-4c74-a985-0a8998dbda2a	2026-10-10 17:34:41.817966+06	2026-10-10 17:34:41.817966+06	DHR-20261010-H3P77D	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2BHDLB	\N	01732081424	House 1 PROBEMV2BHDLB	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
28339e53-3fc5-4631-9e03-4202d1c52554	2026-10-10 17:35:58.65615+06	2026-10-10 17:35:58.65615+06	DHR-20261010-7ZUKFW	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2BJ0VD	\N	01732158250	House 1 PROBEMV2BJ0VD	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
b817b5cd-e112-4a4e-96cd-98c72d55bd20	2026-10-10 17:37:10.294174+06	2026-10-10 17:37:10.294174+06	DHR-20261010-CWDTRR	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2BKK24	\N	01732229773	House 1 PROBEMV2BKK24	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
1a17de77-1411-4910-aef4-bc272f7aec05	2026-10-10 17:38:30.447922+06	2026-10-10 17:38:30.447922+06	DHR-20261010-YJ8ASB	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2BM9YN	\N	01732310000	House 1 PROBEMV2BM9YN	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
9d826076-322d-43b4-bddf-0951b52f459d	2026-10-10 17:39:39.296677+06	2026-10-10 17:39:39.296677+06	DHR-20261010-7GPR74	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PROBEMV2BNR2S	\N	01732378836	House 1 PROBEMV2BNR2S	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 60, "confidenceTier": "LOW", "rtoProbability": 51, "confidenceScore": 30}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
ce82d560-935e-4e91-9d63-805c4bed0ba7	2026-10-10 17:40:21.474604+06	2026-10-10 17:40:21.474604+06	DHR-20261010-EBY4VC	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient LISTMV2BONS1YVSK	\N	01732421217	House 12, Road 5, Dhanmondi LISTMV2BONS1YVSK	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
32fdb0f2-ca79-4e9c-ab89-5a04daa5aac0	2026-10-10 17:40:53.680731+06	2026-10-10 17:40:53.680731+06	DHR-20261010-4QPYHT	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PAGEMV2BPCHXDS5N	\N	01732453253	House 12, Road 5, Dhanmondi PAGEMV2BPCHXDS5N	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
689b57e6-30c4-48ba-ae76-2ba648d16cb2	2026-10-10 17:41:01.597989+06	2026-10-10 17:41:01.597989+06	DHR-20261010-MJ7WS6	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient BACKMV2BPIPEWW1E	\N	01732461298	House 12, Road 5, Dhanmondi BACKMV2BPIPEWW1E	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
5f550109-a36b-4dca-94be-b6594c62879f	2026-10-10 17:41:13.428556+06	2026-10-10 17:41:13.428556+06	DHR-20261010-JPX758	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient SHAREMV2BPRULRE7S	\N	01732473149	House 12, Road 5, Dhanmondi SHAREMV2BPRULRE7S	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
2da4f6aa-3e04-4210-8dca-8abb1cc35b09	2026-10-10 17:41:47.771076+06	2026-10-10 17:41:47.771076+06	DHR-20261010-5T7DLF	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient RELOADMV2BQIBY7VY1	\N	01732507470	House 12, Road 5, Dhanmondi RELOADMV2BQIBY7VY1	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
4582e06d-4420-49d1-8788-cc58763022d8	2026-10-10 17:42:15.92795+06	2026-10-10 17:42:15.92795+06	DHR-20261010-DTXL85	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient LISTMV2BR3WRSGJ2	\N	01732535435	House 12, Road 5, Dhanmondi LISTMV2BR3WRSGJ2	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
b8716788-f0a6-45a5-a5fc-fd59d860f8b1	2026-10-10 17:42:27.570466+06	2026-10-10 17:42:27.570466+06	DHR-20261010-VTYPAW	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient PAGEMV2BRD226O87	\N	01732547290	House 12, Road 5, Dhanmondi PAGEMV2BRD226O87	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
39a1d3e9-c47d-41d2-8fa1-68983af68e4e	2026-10-10 17:42:35.714116+06	2026-10-10 17:42:35.714116+06	DHR-20261010-732NSL	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient BACKMV2BRJ3XPXAD	\N	01732555133	House 12, Road 5, Dhanmondi BACKMV2BRJ3XPXAD	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
4d35d4c4-a705-453b-a67a-4fd47559e2c1	2026-10-10 17:42:47.797055+06	2026-10-10 17:42:47.797055+06	DHR-20261010-JYVB34	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient SHAREMV2BRSALFMA3	\N	01732567037	House 12, Road 5, Dhanmondi SHAREMV2BRSALFMA3	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
a3c2b3e2-e0b8-4545-ad11-c560cddda2e3	2026-10-10 17:43:03.100204+06	2026-10-10 17:43:03.100204+06	DHR-20261010-APYHPS	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	\N	\N	Test Recipient RELOADMV2BS44055KT	\N	01732582352	House 12, Road 5, Dhanmondi RELOADMV2BS44055KT	Dhaka	Dhanmondi	{"zone": "INSIDE_DHAKA", "thana": "Dhanmondi", "district": "Dhaka", "riskTier": "MEDIUM", "riskScore": 35, "confidenceTier": "MEDIUM", "rtoProbability": 30, "confidenceScore": 55}	1.00	1000.00	60.00	CREATED	\N	\N	0	\N	0	\N
\.


--
-- Data for Name: payout_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payout_requests (id, "createdAt", "updatedAt", merchant_id, wallet_id, amount, payout_method, account_details, status, processed_by, processed_at, transaction_reference, rejection_reason, notes, payout_code, idempotency_key, failure_reason, approved_by, approved_at) FROM stdin;
7762cd25-4fc1-4568-86a3-b87548f887bf	2026-10-09 09:01:40.945+06	2026-10-10 15:01:41.975481+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	0425712d-4b41-40c6-aa35-0416de0edb06	25000.00	BKASH	{"accountType": "MERCHANT", "accountNumber": "01700000002"}	COMPLETED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
c1cc87cb-b061-4907-a074-5e63441fe453	2026-10-10 11:01:40.945+06	2026-10-10 15:01:41.981829+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	0425712d-4b41-40c6-aa35-0416de0edb06	15000.00	BANK_TRANSFER	{"branch": "Uttara Branch", "bankName": "BRAC Bank PLC", "accountName": "Rahim Enterprise BD", "accountNumber": "1501203498120001"}	REQUESTED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8aff8f67-3c0d-42f1-9e90-5423f02e17bb	2026-10-10 09:01:40.945+06	2026-10-10 15:01:41.985422+06	b2610025-c66e-4c17-9e5b-439fca2a40ac	9c32043a-1b37-48e5-a9c5-c9a4da6267e8	8000.00	NAGAD	{"accountType": "PERSONAL", "accountNumber": "01700000012"}	APPROVED	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: recipient_feature_aggregates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipient_feature_aggregates (id, "createdAt", "updatedAt", phone_hash, merchant_id, scope, as_of, total_orders, delivered_orders, returned_orders, failed_attempts, recent_failed_deliveries, cod_collected_minor, cod_failed_minor, recent_order_count, address_confidence, feature_version, computed_at) FROM stdin;
a6781008-edb9-40d6-a86f-bb1f5b1a755a	2026-10-10 17:24:10.755679+06	2026-10-10 17:24:10.755679+06	310020a72520ab7b92e9736d96b190c85ba3a5dda3d15ef661f55677fc7c7925	\N	PLATFORM	2026-10-10 17:24:10.499+06	1	0	0	0	0	0	0	1	0.65	features-v1	2026-10-10 17:24:10.755+06
3157e938-4859-4a69-8b15-10247df1245c	2026-10-10 17:24:10.778498+06	2026-10-10 17:24:10.778498+06	310020a72520ab7b92e9736d96b190c85ba3a5dda3d15ef661f55677fc7c7925	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	MERCHANT	2026-10-10 17:24:10.499+06	1	0	0	0	0	0	0	1	0.65	features-v1	2026-10-10 17:24:10.778+06
\.


--
-- Data for Name: recipient_risk_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipient_risk_snapshots (id, "createdAt", "updatedAt", phone_hash, merchant_id, scope, risk_score, level, reasons, risk_confidence, scoring_version, features, scored_at) FROM stdin;
425c9fd1-3987-4f6f-a9d3-3a4e1ad36c48	2026-10-10 17:24:10.760511+06	2026-10-10 17:24:10.760511+06	310020a72520ab7b92e9736d96b190c85ba3a5dda3d15ef661f55677fc7c7925	\N	PLATFORM	30	MEDIUM	[{"code": "LOW_DELIVERY_COMPLETION_RATE", "detail": "Successful delivery rate is 0% across 1 order(s)."}]	LOW	rule-risk-v1	{"asOf": "2026-10-10T11:24:10.499Z", "scope": "PLATFORM", "phoneHash": "310020a72520ab7b92e9736d96b190c85ba3a5dda3d15ef661f55677fc7c7925", "merchantId": null, "totalOrders": 1, "codFailedMinor": 0, "failedAttempts": 0, "featureVersion": "features-v1", "returnedOrders": 0, "deliveredOrders": 0, "recentOrderCount": 1, "addressConfidence": 0.65, "codCollectedMinor": 0, "recentFailedDeliveries": 0}	2026-10-10 17:24:10.76+06
8ef24ab9-3aea-4ab8-b0ef-0ef922f420c5	2026-10-10 17:24:10.782673+06	2026-10-10 17:24:10.782673+06	310020a72520ab7b92e9736d96b190c85ba3a5dda3d15ef661f55677fc7c7925	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	MERCHANT	30	MEDIUM	[{"code": "LOW_DELIVERY_COMPLETION_RATE", "detail": "Successful delivery rate is 0% across 1 order(s)."}]	LOW	rule-risk-v1	{"asOf": "2026-10-10T11:24:10.499Z", "scope": "MERCHANT", "phoneHash": "310020a72520ab7b92e9736d96b190c85ba3a5dda3d15ef661f55677fc7c7925", "merchantId": "d4cdfdb4-f9d3-492c-b45e-6b72ac731dce", "totalOrders": 1, "codFailedMinor": 0, "failedAttempts": 0, "featureVersion": "features-v1", "returnedOrders": 0, "deliveredOrders": 0, "recentOrderCount": 1, "addressConfidence": 0.65, "codCollectedMinor": 0, "recentFailedDeliveries": 0}	2026-10-10 17:24:10.782+06
\.


--
-- Data for Name: report_exports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_exports (id, "createdAt", "updatedAt", dataset, format, status, idempotency_key, filters, tenant_id, requested_by, row_count, content, file_name, failure_reason, expires_at, ready_at) FROM stdin;
\.


--
-- Data for Name: riders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.riders (id, "createdAt", "updatedAt", user_id, hub_id, status, joined_at, rider_code) FROM stdin;
a14628fd-0ffa-4615-8561-81d34dd104ef	2026-10-10 15:01:40.640096+06	2026-10-10 15:01:40.923092+06	9643f6a3-1253-46b4-8b14-a6aa86fd6974	605e5c84-a443-4c41-9452-8e57d27a969b	ON_DUTY	2026-10-10 15:01:40.640096+06	RDR-266280
98d02dbf-e366-400e-8b4e-ac3622da0aab	2026-10-10 15:01:40.925729+06	2026-10-10 15:01:40.925729+06	e28c3795-9e2e-47fb-a8f2-2defe9569707	605e5c84-a443-4c41-9452-8e57d27a969b	ON_DUTY	2026-10-10 15:01:40.925729+06	RDR-000002
23790d2d-77e6-43bb-8c61-c67d5039bcd9	2026-10-10 15:01:40.929587+06	2026-10-10 15:01:40.929587+06	9b6daf8e-9187-48d4-9102-d0980414147e	8b7bfed1-6ee0-4f8e-8bfa-a10be808dd91	ACTIVE	2026-10-10 15:01:40.929587+06	RDR-000003
\.


--
-- Data for Name: rto_predictions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rto_predictions (id, "createdAt", "updatedAt", parcel_id, phone_hash, merchant_id, score, level, reasons, model_type, model_version, features, predicted_at, outcome, outcome_at) FROM stdin;
ffbed7ea-d58e-4410-aac3-c0fa6febf055	2026-10-10 17:24:10.794923+06	2026-10-10 17:24:10.794923+06	4b73ac51-38c2-4c60-8db8-eb8a052166ef	310020a72520ab7b92e9736d96b190c85ba3a5dda3d15ef661f55677fc7c7925	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	30	MEDIUM	[{"code": "LOW_DELIVERY_COMPLETION_RATE", "detail": "Historical delivery success is 0%."}]	RULE_BASED	rule-based-rto-v1	{"rtoRate": 0, "codAmountMinor": 100000, "codFailureRate": 0, "featureVersion": "features-v1", "recentOrderCount": 1, "addressConfidence": 0.65, "recentFailureCount": 0, "deliverySuccessRate": 0}	2026-10-10 17:24:10.794+06	\N	\N
\.


--
-- Data for Name: scoring_models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scoring_models (id, "createdAt", "updatedAt", name, version, type, status, configuration, activated_at, retired_at) FROM stdin;
d7aaa30b-f725-404e-be4b-32a2f456de45	2026-10-10 15:01:45.061487+06	2026-10-10 15:01:45.061487+06	address-parser	address-parser-v1.0	RULE_BASED	ACTIVE	{}	2026-10-10 15:01:45.06+06	\N
3d8043f4-e7ff-43cd-ab1a-7ea9453ea205	2026-10-10 15:01:45.065385+06	2026-10-10 15:01:45.065385+06	recipient-risk	rule-risk-v1	RULE_BASED	ACTIVE	{}	2026-10-10 15:01:45.064+06	\N
684100b0-f9a9-4dbc-abe8-7924a5c43dae	2026-10-10 15:01:45.069136+06	2026-10-10 15:01:45.069136+06	rto-predictor	rule-based-rto-v1	RULE_BASED	ACTIVE	{}	2026-10-10 15:01:45.067+06	\N
\.


--
-- Data for Name: settlement_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settlement_batches (id, "createdAt", "updatedAt", settlement_code, merchant_id, status, gross_minor, fee_minor, net_minor, settlement_count, notes, created_by, completed_at) FROM stdin;
\.


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settlements (id, "createdAt", "updatedAt", settlement_code, merchant_id, parcel_id, cash_ledger_id, gross_minor, fee_minor, net_minor, currency, status, transaction_id, batch_id, settled_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, "createdAt", "updatedAt", name, email, phone, password_hash, role, status) FROM stdin;
ebc9c6cd-048c-4c7a-b0e0-ce24fa40468e	2026-10-10 15:01:40.608138+06	2026-10-10 15:01:40.801504+06	Dhruto System Admin	admin@dhruto.com	01700000001	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	ADMIN	ACTIVE
e55e6fe7-eda2-4766-8c86-c924232ce0bc	2026-10-10 15:01:40.615354+06	2026-10-10 15:01:40.805815+06	Rahim Uddin (Rahim Enterprise)	merchant@dhruto.com	01700000002	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	MERCHANT	ACTIVE
533d0d32-6697-4091-bf0b-e9d7b649a9f2	2026-10-10 15:01:40.808085+06	2026-10-10 15:01:40.808085+06	Ananya Chowdhury (Ananya Fashion & Crafts)	merchant2@dhruto.com	01700000012	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	MERCHANT	ACTIVE
00af8780-fea3-4d2a-9ebb-eccdff97971b	2026-10-10 15:01:40.81286+06	2026-10-10 15:01:40.81286+06	Tanvir Hossain (Star Tech Express Gadgets)	merchant3@dhruto.com	01700000013	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	MERCHANT	ACTIVE
a8d9de3f-4756-4fe9-8992-a14cd531f320	2026-10-10 15:01:40.654667+06	2026-10-10 15:01:40.818368+06	Tareq Hub Manager (Dhaka Central)	hubmanager@dhruto.com	01700000004	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	HUB_MANAGER	ACTIVE
8fd67574-0765-48ff-9eab-a07709df7c70	2026-10-10 15:01:40.820631+06	2026-10-10 15:01:40.820631+06	Enamul Haque (Chittagong Hub Manager)	hubmanager_ctg@dhruto.com	01700000014	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	HUB_MANAGER	ACTIVE
9643f6a3-1253-46b4-8b14-a6aa86fd6974	2026-10-10 15:01:40.630783+06	2026-10-10 15:01:40.826164+06	Karim Rider (Dhaka Central Fleet)	rider@dhruto.com	01700000003	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	RIDER	ACTIVE
e28c3795-9e2e-47fb-a8f2-2defe9569707	2026-10-10 15:01:40.82935+06	2026-10-10 15:01:40.82935+06	Rafiqul Islam (Dhanmondi-Mirpur Route)	rider2@dhruto.com	01700000023	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	RIDER	ACTIVE
9b6daf8e-9187-48d4-9102-d0980414147e	2026-10-10 15:01:40.833163+06	2026-10-10 15:01:40.833163+06	Jamil Ahmed (Chittagong GEC Route)	rider3@dhruto.com	01700000033	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	RIDER	ACTIVE
4b8fee73-7da3-41e9-b95b-98973f5eb27d	2026-10-10 15:01:40.836743+06	2026-10-10 15:01:40.836743+06	Mahmudur Rahman	customer@dhruto.com	01700000005	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	CUSTOMER	ACTIVE
665a569c-fc4e-4732-9a9b-450a0b19e807	2026-10-10 15:01:40.840998+06	2026-10-10 15:01:40.840998+06	Nusrat Jahan	customer2@dhruto.com	01700000015	$2b$10$Iflw2YcjYKRjGkkky9lSSeVvtI82CbWFSAzdaHqqF0RHMMxlSk8oy	CUSTOMER	ACTIVE
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_transactions (id, "createdAt", "updatedAt", wallet_id, type, amount, balance_after, reference_type, reference_id, description) FROM stdin;
fc495d1a-a719-4ace-87c1-050dc182df56	2026-10-08 23:01:40.945+06	2026-10-10 15:01:41.950621+06	0425712d-4b41-40c6-aa35-0416de0edb06	COD_CREDIT	1850.00	48500.00	PARCEL	DHR-2610-00101	COD collected for parcel DHR-2610-00101
91c27c74-c278-4970-a863-23b4fa31b98f	2026-10-08 23:01:40.945+06	2026-10-10 15:01:41.958042+06	0425712d-4b41-40c6-aa35-0416de0edb06	DELIVERY_FEE	-70.00	48430.00	PARCEL	DHR-2610-00101	Delivery fee deducted for parcel DHR-2610-00101
d3d37a34-16ca-4092-ba59-6e34660da87c	2026-10-09 01:01:40.945+06	2026-10-10 15:01:41.962726+06	0425712d-4b41-40c6-aa35-0416de0edb06	COD_CREDIT	2450.00	50880.00	PARCEL	DHR-2610-00102	COD collected for parcel DHR-2610-00102
73f6a759-171d-434b-a81d-579e9887079e	2026-10-09 01:01:40.945+06	2026-10-10 15:01:41.96582+06	0425712d-4b41-40c6-aa35-0416de0edb06	DELIVERY_FEE	-60.00	50820.00	PARCEL	DHR-2610-00102	Delivery fee deducted for parcel DHR-2610-00102
a73085e2-253b-4345-a666-213f2ad3c543	2026-10-09 09:01:40.945+06	2026-10-10 15:01:41.968505+06	0425712d-4b41-40c6-aa35-0416de0edb06	PAYOUT_DEBIT	-25000.00	25820.00	PAYOUT_REQUEST	PO-202610-001	Weekly merchant payout to bKash Merchant Account
e2502069-5705-44ae-9501-38b99f72ed17	2026-10-09 13:01:40.945+06	2026-10-10 15:01:41.971128+06	9c32043a-1b37-48e5-a9c5-c9a4da6267e8	COD_CREDIT	1450.00	15200.00	PARCEL	DHR-2610-00104	COD collected for parcel DHR-2610-00104
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallets (id, "createdAt", "updatedAt", merchant_id, balance, pending_balance, withdrawn_total, currency, status) FROM stdin;
0425712d-4b41-40c6-aa35-0416de0edb06	2026-10-10 15:01:40.861145+06	2026-10-10 15:01:40.861145+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	48500.00	12400.00	185000.00	BDT	ACTIVE
9c32043a-1b37-48e5-a9c5-c9a4da6267e8	2026-10-10 15:01:40.890945+06	2026-10-10 15:01:40.890945+06	b2610025-c66e-4c17-9e5b-439fca2a40ac	15200.00	6800.00	62000.00	BDT	ACTIVE
0579c629-694e-49f4-a830-5727a9f2f3e1	2026-10-10 15:01:40.904871+06	2026-10-10 15:01:40.904871+06	98b1f798-a67b-40d9-abd9-54d3492fbbd9	93400.00	24500.00	410000.00	BDT	ACTIVE
\.


--
-- Data for Name: webhook_deliveries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhook_deliveries (id, "createdAt", "updatedAt", subscription_id, merchant_id, event, payload, signature, status_code, response_body, status, attempt_count, next_retry_at, last_attempt_at, delivered_at, event_id) FROM stdin;
\.


--
-- Data for Name: webhook_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhook_subscriptions (id, "createdAt", "updatedAt", merchant_id, url, secret, events, status, description, failure_count) FROM stdin;
a9013d0f-08f2-40ef-9cb4-987635aaf23b	2026-10-10 15:01:42.013386+06	2026-10-10 15:01:42.013386+06	d4cdfdb4-f9d3-492c-b45e-6b72ac731dce	https://example.com/dhruto-webhooks/orders	dhr_whsec_seed00000000000000000000000000000000	["parcel.created", "parcel.delivered", "cash.verified", "payout.completed"]	INACTIVE	Example order-sync endpoint (inactive by default)	0
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 10, true);


--
-- Name: parcel_status_histories PK_1bb129f2ab69f4418192d4350d9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_status_histories
    ADD CONSTRAINT "PK_1bb129f2ab69f4418192d4350d9" PRIMARY KEY (id);


--
-- Name: parcel_assignments PK_36d5183e18f4bb9b3b7be00a3d4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_assignments
    ADD CONSTRAINT "PK_36d5183e18f4bb9b3b7be00a3d4" PRIMARY KEY (id);


--
-- Name: payout_requests PK_3a6acb302f56ad7dadda35c86b8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT "PK_3a6acb302f56ad7dadda35c86b8" PRIMARY KEY (id);


--
-- Name: hubs PK_44b53d1f2b4568b26ce4710b843; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hubs
    ADD CONSTRAINT "PK_44b53d1f2b4568b26ce4710b843" PRIMARY KEY (id);


--
-- Name: parcels PK_47847f79fee8a3926f2b3022a96; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcels
    ADD CONSTRAINT "PK_47847f79fee8a3926f2b3022a96" PRIMARY KEY (id);


--
-- Name: bag_parcels PK_4ee9e8cae34fec5a6ad27168ed5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bag_parcels
    ADD CONSTRAINT "PK_4ee9e8cae34fec5a6ad27168ed5" PRIMARY KEY (id);


--
-- Name: merchants PK_4fd312ef25f8e05ad47bfe7ed25; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT "PK_4fd312ef25f8e05ad47bfe7ed25" PRIMARY KEY (id);


--
-- Name: wallet_transactions PK_5120f131bde2cda940ec1a621db; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY (id);


--
-- Name: webhook_deliveries PK_535dd409947fb6d8fc6dfc0112a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT "PK_535dd409947fb6d8fc6dfc0112a" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: riders PK_6c17e67f760677500c29d68e689; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT "PK_6c17e67f760677500c29d68e689" PRIMARY KEY (id);


--
-- Name: wallets PK_8402e5df5a30a229380e83e4f7e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: cash_ledgers PK_8e6a11ee2d0cb4e128cf78a8958; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledgers
    ADD CONSTRAINT "PK_8e6a11ee2d0cb4e128cf78a8958" PRIMARY KEY (id);


--
-- Name: bags PK_8ea1bfb4f475f35d6cffd0966ca; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bags
    ADD CONSTRAINT "PK_8ea1bfb4f475f35d6cffd0966ca" PRIMARY KEY (id);


--
-- Name: idempotency_records PK_9ae4e93699362b0d4e3da3dd1c2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idempotency_records
    ADD CONSTRAINT "PK_9ae4e93699362b0d4e3da3dd1c2" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: address_aliases PK_address_aliases; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_aliases
    ADD CONSTRAINT "PK_address_aliases" PRIMARY KEY (id);


--
-- Name: address_confirmations PK_address_confirmations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_confirmations
    ADD CONSTRAINT "PK_address_confirmations" PRIMARY KEY (id);


--
-- Name: address_parses PK_address_parses; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_parses
    ADD CONSTRAINT "PK_address_parses" PRIMARY KEY (id);


--
-- Name: analytics_alerts PK_analytics_alerts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_alerts
    ADD CONSTRAINT "PK_analytics_alerts" PRIMARY KEY (id);


--
-- Name: webhook_subscriptions PK_bf631ae77d39849d599817fb6f4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_subscriptions
    ADD CONSTRAINT "PK_bf631ae77d39849d599817fb6f4" PRIMARY KEY (id);


--
-- Name: cash_discrepancies PK_cash_discrepancies; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_discrepancies
    ADD CONSTRAINT "PK_cash_discrepancies" PRIMARY KEY (id);


--
-- Name: cash_handin_items PK_cash_handin_items; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_handin_items
    ADD CONSTRAINT "PK_cash_handin_items" PRIMARY KEY (id);


--
-- Name: cash_handins PK_cash_handins; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_handins
    ADD CONSTRAINT "PK_cash_handins" PRIMARY KEY (id);


--
-- Name: delivery_attempts PK_delivery_attempts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_attempts
    ADD CONSTRAINT "PK_delivery_attempts" PRIMARY KEY (id);


--
-- Name: event_outbox PK_event_outbox; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_outbox
    ADD CONSTRAINT "PK_event_outbox" PRIMARY KEY (id);


--
-- Name: manifests PK_fb41b22d800467667616837784b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manifests
    ADD CONSTRAINT "PK_fb41b22d800467667616837784b" PRIMARY KEY (id);


--
-- Name: financial_entries PK_financial_entries; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_entries
    ADD CONSTRAINT "PK_financial_entries" PRIMARY KEY (id);


--
-- Name: financial_transactions PK_financial_transactions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT "PK_financial_transactions" PRIMARY KEY (id);


--
-- Name: geo_dataset_versions PK_geo_dataset_versions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geo_dataset_versions
    ADD CONSTRAINT "PK_geo_dataset_versions" PRIMARY KEY (id);


--
-- Name: geo_places PK_geo_places; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geo_places
    ADD CONSTRAINT "PK_geo_places" PRIMARY KEY (id);


--
-- Name: hub_user_assignments PK_hub_user_assignments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hub_user_assignments
    ADD CONSTRAINT "PK_hub_user_assignments" PRIMARY KEY (id);


--
-- Name: integration_failures PK_integration_failures; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_failures
    ADD CONSTRAINT "PK_integration_failures" PRIMARY KEY (id);


--
-- Name: intelligence_feedback PK_intelligence_feedback; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intelligence_feedback
    ADD CONSTRAINT "PK_intelligence_feedback" PRIMARY KEY (id);


--
-- Name: intelligence_recommendations PK_intelligence_recommendations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intelligence_recommendations
    ADD CONSTRAINT "PK_intelligence_recommendations" PRIMARY KEY (id);


--
-- Name: manifest_items PK_manifest_items; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manifest_items
    ADD CONSTRAINT "PK_manifest_items" PRIMARY KEY (id);


--
-- Name: notification_preferences PK_notification_preferences; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT "PK_notification_preferences" PRIMARY KEY (id);


--
-- Name: operational_exceptions PK_operational_exceptions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operational_exceptions
    ADD CONSTRAINT "PK_operational_exceptions" PRIMARY KEY (id);


--
-- Name: parcel_scans PK_parcel_scans; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_scans
    ADD CONSTRAINT "PK_parcel_scans" PRIMARY KEY (id);


--
-- Name: recipient_feature_aggregates PK_recipient_feature_aggregates; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipient_feature_aggregates
    ADD CONSTRAINT "PK_recipient_feature_aggregates" PRIMARY KEY (id);


--
-- Name: recipient_risk_snapshots PK_recipient_risk_snapshots; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipient_risk_snapshots
    ADD CONSTRAINT "PK_recipient_risk_snapshots" PRIMARY KEY (id);


--
-- Name: report_exports PK_report_exports; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT "PK_report_exports" PRIMARY KEY (id);


--
-- Name: rto_predictions PK_rto_predictions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rto_predictions
    ADD CONSTRAINT "PK_rto_predictions" PRIMARY KEY (id);


--
-- Name: scoring_models PK_scoring_models; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scoring_models
    ADD CONSTRAINT "PK_scoring_models" PRIMARY KEY (id);


--
-- Name: settlement_batches PK_settlement_batches; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_batches
    ADD CONSTRAINT "PK_settlement_batches" PRIMARY KEY (id);


--
-- Name: settlements PK_settlements; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT "PK_settlements" PRIMARY KEY (id);


--
-- Name: merchants REL_698f612a3134c503f711479a4e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT "REL_698f612a3134c503f711479a4e" UNIQUE (user_id);


--
-- Name: bags UQ_01a71554d9f2e44f4702f39e871; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bags
    ADD CONSTRAINT "UQ_01a71554d9f2e44f4702f39e871" UNIQUE (bag_code);


--
-- Name: cash_ledgers UQ_1f6f23601eeb83820f2d2183804; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledgers
    ADD CONSTRAINT "UQ_1f6f23601eeb83820f2d2183804" UNIQUE (parcel_id);


--
-- Name: parcels UQ_4225843afe07879602c9a7c0d3f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcels
    ADD CONSTRAINT "UQ_4225843afe07879602c9a7c0d3f" UNIQUE (tracking_code);


--
-- Name: manifests UQ_5618dab437bf7588bb43826ab16; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manifests
    ADD CONSTRAINT "UQ_5618dab437bf7588bb43826ab16" UNIQUE (manifest_code);


--
-- Name: wallets UQ_64c3c9dd2323f27efbe86f4a961; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "UQ_64c3c9dd2323f27efbe86f4a961" UNIQUE (merchant_id);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: users UQ_a000cca60bcf04454e727699490; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE (phone);


--
-- Name: hubs UQ_a5b22a077572b2ebcff8be166e2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hubs
    ADD CONSTRAINT "UQ_a5b22a077572b2ebcff8be166e2" UNIQUE (code);


--
-- Name: address_aliases UQ_address_alias_normalized; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_aliases
    ADD CONSTRAINT "UQ_address_alias_normalized" UNIQUE (normalized_alias);


--
-- Name: analytics_alerts UQ_analytics_alert_dedup; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics_alerts
    ADD CONSTRAINT "UQ_analytics_alert_dedup" UNIQUE (dedup_key);


--
-- Name: cash_discrepancies UQ_cash_discrepancies_ledger; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_discrepancies
    ADD CONSTRAINT "UQ_cash_discrepancies_ledger" UNIQUE (cash_ledger_id);


--
-- Name: cash_handin_items UQ_cash_handin_items_ledger; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_handin_items
    ADD CONSTRAINT "UQ_cash_handin_items_ledger" UNIQUE (cash_ledger_id);


--
-- Name: cash_handins UQ_cash_handins_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_handins
    ADD CONSTRAINT "UQ_cash_handins_code" UNIQUE (handin_code);


--
-- Name: event_outbox UQ_event_outbox_event; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_outbox
    ADD CONSTRAINT "UQ_event_outbox_event" UNIQUE (event_id);


--
-- Name: financial_transactions UQ_financial_transactions_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT "UQ_financial_transactions_code" UNIQUE (transaction_code);


--
-- Name: geo_dataset_versions UQ_geo_dataset_version; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geo_dataset_versions
    ADD CONSTRAINT "UQ_geo_dataset_version" UNIQUE (version);


--
-- Name: geo_places UQ_geo_place_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geo_places
    ADD CONSTRAINT "UQ_geo_place_code" UNIQUE (code);


--
-- Name: integration_failures UQ_integration_failures_job; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_failures
    ADD CONSTRAINT "UQ_integration_failures_job" UNIQUE (job_id);


--
-- Name: rto_predictions UQ_rto_prediction_parcel; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rto_predictions
    ADD CONSTRAINT "UQ_rto_prediction_parcel" UNIQUE (parcel_id);


--
-- Name: scoring_models UQ_scoring_model_version; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scoring_models
    ADD CONSTRAINT "UQ_scoring_model_version" UNIQUE (name, version);


--
-- Name: settlement_batches UQ_settlement_batches_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_batches
    ADD CONSTRAINT "UQ_settlement_batches_code" UNIQUE (settlement_code);


--
-- Name: settlements UQ_settlements_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT "UQ_settlements_code" UNIQUE (settlement_code);


--
-- Name: settlements UQ_settlements_ledger; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT "UQ_settlements_ledger" UNIQUE (cash_ledger_id);


--
-- Name: settlements UQ_settlements_parcel; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT "UQ_settlements_parcel" UNIQUE (parcel_id);


--
-- Name: IDX_076a51d3e7bafa6daad0ce1869; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_076a51d3e7bafa6daad0ce1869" ON public.parcel_status_histories USING btree (to_status);


--
-- Name: IDX_171531df2750490b9c18f197ee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_171531df2750490b9c18f197ee" ON public.webhook_deliveries USING btree (merchant_id, "createdAt");


--
-- Name: IDX_33f97a9c53955a85c5eaed5295; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_33f97a9c53955a85c5eaed5295" ON public.parcel_status_histories USING btree (parcel_id, "createdAt");


--
-- Name: IDX_38c4b6b72893b14158df07c15d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_38c4b6b72893b14158df07c15d" ON public.cash_ledgers USING btree (rider_id, hand_in_status);


--
-- Name: IDX_4740d26c62da4be22b4e4c55a4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_4740d26c62da4be22b4e4c55a4" ON public.parcels USING btree (recipient_phone);


--
-- Name: IDX_668f25ec1b47c2086d4e4872aa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_668f25ec1b47c2086d4e4872aa" ON public.parcels USING btree (merchant_id, status);


--
-- Name: IDX_66b4fb76cca4c993138e478d19; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_66b4fb76cca4c993138e478d19" ON public.parcels USING btree (status);


--
-- Name: IDX_681da848e80563d766f4633b14; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_681da848e80563d766f4633b14" ON public.cash_ledgers USING btree (collected_at);


--
-- Name: IDX_7168740cff228d95930428d1bc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7168740cff228d95930428d1bc" ON public.webhook_subscriptions USING btree (merchant_id);


--
-- Name: IDX_8493e84631cab23682b27f2696; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_8493e84631cab23682b27f2696" ON public.parcels USING btree (current_rider_id, status);


--
-- Name: IDX_9c03b6adebf385ca991d085063; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_9c03b6adebf385ca991d085063" ON public.idempotency_records USING btree (key, scope);


--
-- Name: IDX_address_alias_place; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_address_alias_place" ON public.address_aliases USING btree (place_id);


--
-- Name: IDX_address_confirmations_parse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_address_confirmations_parse" ON public.address_confirmations USING btree (parse_id);


--
-- Name: IDX_address_parses_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_address_parses_created" ON public.address_parses USING btree ("createdAt");


--
-- Name: IDX_address_parses_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_address_parses_hash" ON public.address_parses USING btree (normalized_hash);


--
-- Name: IDX_address_parses_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_address_parses_parcel" ON public.address_parses USING btree (parcel_id);


--
-- Name: IDX_analytics_alerts_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_analytics_alerts_key" ON public.analytics_alerts USING btree (alert_key, status);


--
-- Name: IDX_analytics_alerts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_analytics_alerts_status" ON public.analytics_alerts USING btree (status, triggered_at);


--
-- Name: IDX_b625f677dcb5849d72445365e9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b625f677dcb5849d72445365e9" ON public.parcels USING btree (merchant_id, "createdAt");


--
-- Name: IDX_b65dee577687a42378e02ecd53; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b65dee577687a42378e02ecd53" ON public.parcels USING btree (current_hub_id, status);


--
-- Name: IDX_badd75f47a7cdc7d27d3204cf0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_badd75f47a7cdc7d27d3204cf0" ON public.parcels USING btree (merchant_id, district);


--
-- Name: IDX_bags_destination_hub_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_bags_destination_hub_status" ON public.bags USING btree (destination_hub_id, status);


--
-- Name: IDX_bags_origin_hub_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_bags_origin_hub_status" ON public.bags USING btree (origin_hub_id, status);


--
-- Name: IDX_cash_discrepancies_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cash_discrepancies_status_created" ON public.cash_discrepancies USING btree (status, "createdAt");


--
-- Name: IDX_cash_handins_hub_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cash_handins_hub_status" ON public.cash_handins USING btree (hub_id, status) WHERE (hub_id IS NOT NULL);


--
-- Name: IDX_cash_handins_rider_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cash_handins_rider_status" ON public.cash_handins USING btree (rider_id, status);


--
-- Name: IDX_ccdeebefc7a7ab6e4f224589b4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_ccdeebefc7a7ab6e4f224589b4" ON public.bag_parcels USING btree (bag_id, parcel_id);


--
-- Name: IDX_d9d777d4635ceca185b94b8bec; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d9d777d4635ceca185b94b8bec" ON public.cash_ledgers USING btree (hub_id, hand_in_status);


--
-- Name: IDX_dd2bb63babab173a4513bd18d0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_dd2bb63babab173a4513bd18d0" ON public.notifications USING btree (merchant_id, "createdAt");


--
-- Name: IDX_delivery_attempts_parcel_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_delivery_attempts_parcel_created" ON public.delivery_attempts USING btree (parcel_id, "createdAt");


--
-- Name: IDX_delivery_attempts_rider_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_delivery_attempts_rider_created" ON public.delivery_attempts USING btree (rider_id, "createdAt");


--
-- Name: IDX_e3ac3b5ed7e3475ab13a5cda4c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_e3ac3b5ed7e3475ab13a5cda4c" ON public.wallet_transactions USING btree (reference_type, reference_id);


--
-- Name: IDX_eacd4d00fc59447f435cefcc58; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_eacd4d00fc59447f435cefcc58" ON public.webhook_deliveries USING btree (subscription_id, "createdAt");


--
-- Name: IDX_event_outbox_aggregate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_event_outbox_aggregate" ON public.event_outbox USING btree (aggregate_type, aggregate_id);


--
-- Name: IDX_event_outbox_status_available; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_event_outbox_status_available" ON public.event_outbox USING btree (status, available_at);


--
-- Name: IDX_f297fd7508a3c4bff98fb9e1d6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_f297fd7508a3c4bff98fb9e1d6" ON public.wallet_transactions USING btree (wallet_id, "createdAt");


--
-- Name: IDX_f46a24eaeb63cd29881a4d78a3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_f46a24eaeb63cd29881a4d78a3" ON public.parcels USING btree ("createdAt");


--
-- Name: IDX_f8119e95a07eeea356486ed134; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_f8119e95a07eeea356486ed134" ON public.notifications USING btree (user_id, "createdAt");


--
-- Name: IDX_financial_entries_account_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_financial_entries_account_created" ON public.financial_entries USING btree (account, "createdAt");


--
-- Name: IDX_financial_entries_merchant_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_financial_entries_merchant_account" ON public.financial_entries USING btree (merchant_id, account) WHERE (merchant_id IS NOT NULL);


--
-- Name: IDX_financial_entries_transaction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_financial_entries_transaction" ON public.financial_entries USING btree (transaction_id);


--
-- Name: IDX_financial_transactions_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_financial_transactions_reference" ON public.financial_transactions USING btree (reference_type, reference_id);


--
-- Name: IDX_financial_transactions_type_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_financial_transactions_type_created" ON public.financial_transactions USING btree (type, "createdAt");


--
-- Name: IDX_geo_places_dataset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_geo_places_dataset" ON public.geo_places USING btree (dataset_version);


--
-- Name: IDX_geo_places_kind_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_geo_places_kind_parent" ON public.geo_places USING btree (kind, parent_id);


--
-- Name: IDX_hub_user_assignments_hub; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_hub_user_assignments_hub" ON public.hub_user_assignments USING btree (hub_id);


--
-- Name: IDX_hubs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_hubs_status" ON public.hubs USING btree (status);


--
-- Name: IDX_integration_failures_queue_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_integration_failures_queue_status" ON public.integration_failures USING btree (queue, status);


--
-- Name: IDX_integration_failures_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_integration_failures_status_created" ON public.integration_failures USING btree (status, "createdAt");


--
-- Name: IDX_intel_feedback_signal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_intel_feedback_signal" ON public.intelligence_feedback USING btree (signal);


--
-- Name: IDX_intel_feedback_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_intel_feedback_subject" ON public.intelligence_feedback USING btree (subject_type, subject_id);


--
-- Name: IDX_intel_reco_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_intel_reco_parcel" ON public.intelligence_recommendations USING btree (parcel_id);


--
-- Name: IDX_intel_reco_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_intel_reco_status" ON public.intelligence_recommendations USING btree (status);


--
-- Name: IDX_manifest_items_bag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_manifest_items_bag" ON public.manifest_items USING btree (bag_id);


--
-- Name: IDX_manifest_items_manifest_bag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_manifest_items_manifest_bag" ON public.manifest_items USING btree (manifest_id, bag_id);


--
-- Name: IDX_manifests_destination_hub_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_manifests_destination_hub_status" ON public.manifests USING btree (destination_hub_id, status);


--
-- Name: IDX_manifests_origin_hub_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_manifests_origin_hub_status" ON public.manifests USING btree (origin_hub_id, status);


--
-- Name: IDX_notifications_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_notifications_event" ON public.notifications USING btree (event_id) WHERE (event_id IS NOT NULL);


--
-- Name: IDX_operational_exceptions_hub_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_operational_exceptions_hub_status" ON public.operational_exceptions USING btree (hub_id, status);


--
-- Name: IDX_operational_exceptions_manifest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_operational_exceptions_manifest" ON public.operational_exceptions USING btree (manifest_id);


--
-- Name: IDX_operational_exceptions_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_operational_exceptions_parcel" ON public.operational_exceptions USING btree (parcel_id);


--
-- Name: IDX_operational_exceptions_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_operational_exceptions_status_created" ON public.operational_exceptions USING btree (status, "createdAt");


--
-- Name: IDX_parcel_scans_bag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_parcel_scans_bag" ON public.parcel_scans USING btree (bag_id);


--
-- Name: IDX_parcel_scans_hub_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_parcel_scans_hub_created" ON public.parcel_scans USING btree (hub_id, "createdAt");


--
-- Name: IDX_parcel_scans_parcel_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_parcel_scans_parcel_created" ON public.parcel_scans USING btree (parcel_id, "createdAt");


--
-- Name: IDX_parcels_merchant_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_parcels_merchant_status_created" ON public.parcels USING btree (merchant_id, status, "createdAt" DESC);


--
-- Name: IDX_parcels_otp_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_parcels_otp_expires" ON public.parcels USING btree (otp_expires_at) WHERE (otp_expires_at IS NOT NULL);


--
-- Name: IDX_recipient_features_computed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_recipient_features_computed" ON public.recipient_feature_aggregates USING btree (computed_at);


--
-- Name: IDX_recipient_features_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_recipient_features_phone" ON public.recipient_feature_aggregates USING btree (phone_hash);


--
-- Name: IDX_report_exports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_report_exports_status" ON public.report_exports USING btree (status, expires_at);


--
-- Name: IDX_report_exports_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_report_exports_user" ON public.report_exports USING btree (requested_by, "createdAt");


--
-- Name: IDX_risk_snapshots_merchant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_risk_snapshots_merchant" ON public.recipient_risk_snapshots USING btree (merchant_id);


--
-- Name: IDX_risk_snapshots_phone_scored; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_risk_snapshots_phone_scored" ON public.recipient_risk_snapshots USING btree (phone_hash, scored_at);


--
-- Name: IDX_rto_predictions_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_rto_predictions_model" ON public.rto_predictions USING btree (model_version);


--
-- Name: IDX_rto_predictions_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_rto_predictions_phone" ON public.rto_predictions USING btree (phone_hash, predicted_at);


--
-- Name: IDX_scoring_models_name_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_scoring_models_name_status" ON public.scoring_models USING btree (name, status);


--
-- Name: IDX_settlement_batches_merchant_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_settlement_batches_merchant_status" ON public.settlement_batches USING btree (merchant_id, status);


--
-- Name: IDX_settlements_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_settlements_batch" ON public.settlements USING btree (batch_id) WHERE (batch_id IS NOT NULL);


--
-- Name: IDX_settlements_merchant_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_settlements_merchant_status" ON public.settlements USING btree (merchant_id, status);


--
-- Name: UQ_bag_parcels_active_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_bag_parcels_active_parcel" ON public.bag_parcels USING btree (parcel_id) WHERE is_active;


--
-- Name: UQ_delivery_attempts_parcel_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_delivery_attempts_parcel_number" ON public.delivery_attempts USING btree (parcel_id, attempt_number);


--
-- Name: UQ_hub_user_assignments_user_hub; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_hub_user_assignments_user_hub" ON public.hub_user_assignments USING btree (user_id, hub_id);


--
-- Name: UQ_notification_preferences_merchant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_notification_preferences_merchant" ON public.notification_preferences USING btree (merchant_id, channel, category) WHERE (merchant_id IS NOT NULL);


--
-- Name: UQ_notification_preferences_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_notification_preferences_user" ON public.notification_preferences USING btree (user_id, channel, category) WHERE (user_id IS NOT NULL);


--
-- Name: UQ_notifications_dedupe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_notifications_dedupe" ON public.notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: UQ_parcel_scans_idempotency_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_parcel_scans_idempotency_key" ON public.parcel_scans USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: UQ_payout_requests_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_payout_requests_code" ON public.payout_requests USING btree (payout_code) WHERE (payout_code IS NOT NULL);


--
-- Name: UQ_payout_requests_idempotency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_payout_requests_idempotency" ON public.payout_requests USING btree (merchant_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: UQ_recipient_features_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_recipient_features_scope" ON public.recipient_feature_aggregates USING btree (phone_hash, merchant_id);


--
-- Name: UQ_report_export_idempotency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_report_export_idempotency" ON public.report_exports USING btree (idempotency_key);


--
-- Name: UQ_riders_rider_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_riders_rider_code" ON public.riders USING btree (rider_code) WHERE (rider_code IS NOT NULL);


--
-- Name: UQ_webhook_deliveries_subscription_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UQ_webhook_deliveries_subscription_event" ON public.webhook_deliveries USING btree (subscription_id, event_id) WHERE (event_id IS NOT NULL);


--
-- Name: bag_parcels FK_063f1c9b6e7e849dcec08ccd0e4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bag_parcels
    ADD CONSTRAINT "FK_063f1c9b6e7e849dcec08ccd0e4" FOREIGN KEY (bag_id) REFERENCES public.bags(id);


--
-- Name: payout_requests FK_0a9fab16f4dc03c7a675d32ba85; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT "FK_0a9fab16f4dc03c7a675d32ba85" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: parcels FK_0b1038d06dc742dfeb74c148a0e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcels
    ADD CONSTRAINT "FK_0b1038d06dc742dfeb74c148a0e" FOREIGN KEY (current_rider_id) REFERENCES public.riders(id);


--
-- Name: cash_ledgers FK_1f6f23601eeb83820f2d2183804; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledgers
    ADD CONSTRAINT "FK_1f6f23601eeb83820f2d2183804" FOREIGN KEY (parcel_id) REFERENCES public.parcels(id);


--
-- Name: webhook_deliveries FK_23eb2b6ae801c52cfb79a556b8a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT "FK_23eb2b6ae801c52cfb79a556b8a" FOREIGN KEY (subscription_id) REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE;


--
-- Name: parcel_status_histories FK_29462c181ed24ffea197415365c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_status_histories
    ADD CONSTRAINT "FK_29462c181ed24ffea197415365c" FOREIGN KEY (parcel_id) REFERENCES public.parcels(id);


--
-- Name: payout_requests FK_3179eb6a30c74ca38fbd4e8e47a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT "FK_3179eb6a30c74ca38fbd4e8e47a" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- Name: bags FK_39917c83c1cfab0ed78c5f96070; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bags
    ADD CONSTRAINT "FK_39917c83c1cfab0ed78c5f96070" FOREIGN KEY (origin_hub_id) REFERENCES public.hubs(id);


--
-- Name: riders FK_3b76d47a57c06bd04edfe99b629; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT "FK_3b76d47a57c06bd04edfe99b629" FOREIGN KEY (hub_id) REFERENCES public.hubs(id);


--
-- Name: cash_ledgers FK_55171cff336d44d27dd142da80a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledgers
    ADD CONSTRAINT "FK_55171cff336d44d27dd142da80a" FOREIGN KEY (hub_id) REFERENCES public.hubs(id);


--
-- Name: parcel_assignments FK_5cd238aa2f8cb59b8a9f457e21c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_assignments
    ADD CONSTRAINT "FK_5cd238aa2f8cb59b8a9f457e21c" FOREIGN KEY (parcel_id) REFERENCES public.parcels(id);


--
-- Name: wallets FK_64c3c9dd2323f27efbe86f4a961; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_64c3c9dd2323f27efbe86f4a961" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- Name: merchants FK_698f612a3134c503f711479a4e5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT "FK_698f612a3134c503f711479a4e5" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cash_ledgers FK_6d6ca889e7d578c92b80f1cbf4b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledgers
    ADD CONSTRAINT "FK_6d6ca889e7d578c92b80f1cbf4b" FOREIGN KEY (rider_id) REFERENCES public.riders(id);


--
-- Name: webhook_subscriptions FK_7168740cff228d95930428d1bc4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_subscriptions
    ADD CONSTRAINT "FK_7168740cff228d95930428d1bc4" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: parcels FK_84d3757f0e4a20f86842a05a0a2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcels
    ADD CONSTRAINT "FK_84d3757f0e4a20f86842a05a0a2" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- Name: riders FK_8d3d41e9ec12eff82b325fa8c07; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT "FK_8d3d41e9ec12eff82b325fa8c07" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: parcel_assignments FK_8e7633c7f908b77e61a45ecf857; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_assignments
    ADD CONSTRAINT "FK_8e7633c7f908b77e61a45ecf857" FOREIGN KEY (rider_id) REFERENCES public.riders(id);


--
-- Name: manifests FK_9a4ee3fbbb2a176d70da7f6a9aa; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manifests
    ADD CONSTRAINT "FK_9a4ee3fbbb2a176d70da7f6a9aa" FOREIGN KEY (destination_hub_id) REFERENCES public.hubs(id);


--
-- Name: notifications FK_9a8a82462cab47c73d25f49261f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: manifests FK_a2684f0dd51d36a035803ebee0a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manifests
    ADD CONSTRAINT "FK_a2684f0dd51d36a035803ebee0a" FOREIGN KEY (origin_hub_id) REFERENCES public.hubs(id);


--
-- Name: bags FK_a9ed3384d9a289fddfb8f390e27; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bags
    ADD CONSTRAINT "FK_a9ed3384d9a289fddfb8f390e27" FOREIGN KEY (destination_hub_id) REFERENCES public.hubs(id);


--
-- Name: bag_parcels FK_b52b6d04e515b2568c31fcea0e7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bag_parcels
    ADD CONSTRAINT "FK_b52b6d04e515b2568c31fcea0e7" FOREIGN KEY (parcel_id) REFERENCES public.parcels(id);


--
-- Name: notifications FK_bc9b909dcfd2c2b41ac18798cd6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_bc9b909dcfd2c2b41ac18798cd6" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions FK_c57d19129968160f4db28fc8b28; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT "FK_c57d19129968160f4db28fc8b28" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- Name: cash_discrepancies FK_cash_discrepancies_ledger; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_discrepancies
    ADD CONSTRAINT "FK_cash_discrepancies_ledger" FOREIGN KEY (cash_ledger_id) REFERENCES public.cash_ledgers(id);


--
-- Name: cash_handin_items FK_cash_handin_items_batch; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_handin_items
    ADD CONSTRAINT "FK_cash_handin_items_batch" FOREIGN KEY (handin_id) REFERENCES public.cash_handins(id) ON DELETE CASCADE;


--
-- Name: cash_handin_items FK_cash_handin_items_ledger; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_handin_items
    ADD CONSTRAINT "FK_cash_handin_items_ledger" FOREIGN KEY (cash_ledger_id) REFERENCES public.cash_ledgers(id);


--
-- Name: cash_handins FK_cash_handins_rider; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_handins
    ADD CONSTRAINT "FK_cash_handins_rider" FOREIGN KEY (rider_id) REFERENCES public.riders(id);


--
-- Name: delivery_attempts FK_delivery_attempts_parcel; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_attempts
    ADD CONSTRAINT "FK_delivery_attempts_parcel" FOREIGN KEY (parcel_id) REFERENCES public.parcels(id) ON DELETE CASCADE;


--
-- Name: delivery_attempts FK_delivery_attempts_rider; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_attempts
    ADD CONSTRAINT "FK_delivery_attempts_rider" FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE CASCADE;


--
-- Name: parcels FK_df32d27847d05ab0b991075a0b6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcels
    ADD CONSTRAINT "FK_df32d27847d05ab0b991075a0b6" FOREIGN KEY (current_hub_id) REFERENCES public.hubs(id);


--
-- Name: financial_entries FK_financial_entries_transaction; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_entries
    ADD CONSTRAINT "FK_financial_entries_transaction" FOREIGN KEY (transaction_id) REFERENCES public.financial_transactions(id) ON DELETE RESTRICT;


--
-- Name: hub_user_assignments FK_hub_user_assignments_hub; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hub_user_assignments
    ADD CONSTRAINT "FK_hub_user_assignments_hub" FOREIGN KEY (hub_id) REFERENCES public.hubs(id) ON DELETE CASCADE;


--
-- Name: hub_user_assignments FK_hub_user_assignments_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hub_user_assignments
    ADD CONSTRAINT "FK_hub_user_assignments_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: manifest_items FK_manifest_items_bag; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manifest_items
    ADD CONSTRAINT "FK_manifest_items_bag" FOREIGN KEY (bag_id) REFERENCES public.bags(id);


--
-- Name: manifest_items FK_manifest_items_manifest; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manifest_items
    ADD CONSTRAINT "FK_manifest_items_manifest" FOREIGN KEY (manifest_id) REFERENCES public.manifests(id) ON DELETE CASCADE;


--
-- Name: operational_exceptions FK_operational_exceptions_hub; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operational_exceptions
    ADD CONSTRAINT "FK_operational_exceptions_hub" FOREIGN KEY (hub_id) REFERENCES public.hubs(id);


--
-- Name: parcel_scans FK_parcel_scans_bag; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_scans
    ADD CONSTRAINT "FK_parcel_scans_bag" FOREIGN KEY (bag_id) REFERENCES public.bags(id);


--
-- Name: parcel_scans FK_parcel_scans_hub; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_scans
    ADD CONSTRAINT "FK_parcel_scans_hub" FOREIGN KEY (hub_id) REFERENCES public.hubs(id);


--
-- Name: parcel_scans FK_parcel_scans_parcel; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_scans
    ADD CONSTRAINT "FK_parcel_scans_parcel" FOREIGN KEY (parcel_id) REFERENCES public.parcels(id);


--
-- Name: settlement_batches FK_settlement_batches_merchant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_batches
    ADD CONSTRAINT "FK_settlement_batches_merchant" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- Name: settlements FK_settlements_ledger; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT "FK_settlements_ledger" FOREIGN KEY (cash_ledger_id) REFERENCES public.cash_ledgers(id);


--
-- Name: settlements FK_settlements_merchant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT "FK_settlements_merchant" FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- Name: settlements FK_settlements_parcel; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT "FK_settlements_parcel" FOREIGN KEY (parcel_id) REFERENCES public.parcels(id);


--
-- Name: settlements FK_settlements_transaction; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT "FK_settlements_transaction" FOREIGN KEY (transaction_id) REFERENCES public.financial_transactions(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Q6eUIlcXxmux8wBp2nUJ5rlKnlCqobkMO7JMfWqQhEj1CBf9ABFWneruEKUb7nj

