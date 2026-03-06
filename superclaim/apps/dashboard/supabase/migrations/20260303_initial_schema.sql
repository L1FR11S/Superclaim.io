-- ============================================================
-- Superclaim.io — Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- organizations
-- ────────────────────────────────────────────────────────────
create table if not exists organizations (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    email           text not null unique,
    org_number      text,
    onboarding_step integer not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- org_settings
-- ────────────────────────────────────────────────────────────
create table if not exists org_settings (
    id                  uuid primary key default uuid_generate_v4(),
    org_id              uuid not null unique references organizations(id) on delete cascade,
    tone                text not null default 'professional' check (tone in ('professional', 'friendly', 'direct')),
    sms_enabled         boolean not null default false,
    sms_preview         boolean not null default true,
    email_preview       boolean not null default true,
    preferred_erp       text,
    agentmail_inbox_id  text,
    agentmail_pod_id    text,
    sms_sender_name     text,
    step_delays         jsonb not null default '{"step1":3,"step2":7,"step3":7,"step4":8}'::jsonb,
    agent_flow          jsonb,
    custom_domain       text,
    updated_at          timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- claims
-- ────────────────────────────────────────────────────────────
create table if not exists claims (
    id                  uuid primary key default uuid_generate_v4(),
    org_id              uuid not null references organizations(id) on delete cascade,
    debtor_name         text not null,
    debtor_email        text not null,
    debtor_phone        text,
    invoice_number      text,
    amount              numeric(12,2) not null,
    currency            text not null default 'SEK',
    due_date            date not null,
    status              text not null default 'active' check (status in ('active', 'paid', 'escalated', 'cancelled')),
    current_step        integer not null default 0,
    current_node_id     text,
    next_action_at      timestamptz,
    last_action_at      timestamptz,
    paused              boolean not null default false,
    attachment_url      text,
    agentmail_thread_id text,
    notes               text,
    days_overdue        integer generated always as (
                            greatest(0, extract(day from now() - due_date)::integer)
                        ) stored,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index if not exists claims_org_id_idx          on claims(org_id);
create index if not exists claims_status_idx          on claims(status);
create index if not exists claims_next_action_at_idx  on claims(next_action_at);

-- ────────────────────────────────────────────────────────────
-- claim_communications
-- ────────────────────────────────────────────────────────────
create table if not exists claim_communications (
    id                      uuid primary key default uuid_generate_v4(),
    claim_id                uuid not null references claims(id) on delete cascade,
    org_id                  uuid not null references organizations(id) on delete cascade,
    channel                 text not null check (channel in ('email', 'sms')),
    direction               text not null check (direction in ('outbound', 'inbound')),
    step                    integer,
    subject                 text,
    body                    text,
    agentmail_message_id    text,
    agentmail_thread_id     text,
    metadata                jsonb,
    created_at              timestamptz not null default now()
);

create index if not exists comms_claim_id_idx on claim_communications(claim_id);
create index if not exists comms_direction_idx on claim_communications(direction);

-- ────────────────────────────────────────────────────────────
-- email_drafts
-- ────────────────────────────────────────────────────────────
create table if not exists email_drafts (
    id          uuid primary key default uuid_generate_v4(),
    claim_id    uuid not null references claims(id) on delete cascade,
    org_id      uuid not null references organizations(id) on delete cascade,
    "to"        text not null,
    subject     text not null,
    body        text not null,
    tone        text,
    step        integer,
    status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'sent')),
    sent_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index if not exists email_drafts_org_id_idx    on email_drafts(org_id);
create index if not exists email_drafts_status_idx    on email_drafts(status);

-- ────────────────────────────────────────────────────────────
-- sms_drafts
-- ────────────────────────────────────────────────────────────
create table if not exists sms_drafts (
    id          uuid primary key default uuid_generate_v4(),
    claim_id    uuid not null references claims(id) on delete cascade,
    org_id      uuid not null references organizations(id) on delete cascade,
    "to"        text not null,
    body        text not null,
    step        integer,
    status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'sent')),
    sent_at     timestamptz,
    created_at  timestamptz not null default now()
);

create index if not exists sms_drafts_org_id_idx  on sms_drafts(org_id);
create index if not exists sms_drafts_status_idx  on sms_drafts(status);

-- ────────────────────────────────────────────────────────────
-- agent_runs
-- ────────────────────────────────────────────────────────────
create table if not exists agent_runs (
    id                  uuid primary key default uuid_generate_v4(),
    org_id              uuid not null references organizations(id) on delete cascade,
    status              text not null default 'running' check (status in ('running', 'completed', 'failed')),
    claims_processed    integer default 0,
    emails_generated    integer default 0,
    emails_sent         integer default 0,
    sms_sent            integer default 0,
    errors              jsonb default '[]'::jsonb,
    started_at          timestamptz not null default now(),
    completed_at        timestamptz
);

create index if not exists agent_runs_org_id_idx on agent_runs(org_id);

-- ────────────────────────────────────────────────────────────
-- domains (anpassad avsändardomän)
-- ────────────────────────────────────────────────────────────
create table if not exists domains (
    id          uuid primary key default uuid_generate_v4(),
    org_id      uuid not null unique references organizations(id) on delete cascade,
    domain      text not null,
    verified    boolean not null default false,
    dns_records jsonb,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────
-- Vi använder service_role i alla API-routes — RLS är därmed
-- mest ett skyddsnät. Aktivera RLS men tillåt service_role full access.

alter table organizations        enable row level security;
alter table org_settings         enable row level security;
alter table claims               enable row level security;
alter table claim_communications enable row level security;
alter table email_drafts         enable row level security;
alter table sms_drafts           enable row level security;
alter table agent_runs           enable row level security;
alter table domains              enable row level security;

-- Service role bypass (alla API-routes använder service_role)
create policy "service_role full access on organizations"
    on organizations for all to service_role using (true) with check (true);

create policy "service_role full access on org_settings"
    on org_settings for all to service_role using (true) with check (true);

create policy "service_role full access on claims"
    on claims for all to service_role using (true) with check (true);

create policy "service_role full access on claim_communications"
    on claim_communications for all to service_role using (true) with check (true);

create policy "service_role full access on email_drafts"
    on email_drafts for all to service_role using (true) with check (true);

create policy "service_role full access on sms_drafts"
    on sms_drafts for all to service_role using (true) with check (true);

create policy "service_role full access on agent_runs"
    on agent_runs for all to service_role using (true) with check (true);

create policy "service_role full access on domains"
    on domains for all to service_role using (true) with check (true);

-- anon/authenticated kan läsa organizations via proxy (för onboarding-check)
create policy "authenticated read own org"
    on organizations for select to authenticated
    using (email = auth.jwt() ->> 'email');

-- ────────────────────────────────────────────────────────────
-- Supabase Storage bucket för fakturabilagor
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('claim-attachments', 'claim-attachments', true)
on conflict (id) do nothing;

create policy "service_role full access on claim-attachments"
    on storage.objects for all to service_role using (true) with check (true);

create policy "public read claim-attachments"
    on storage.objects for select to public
    using (bucket_id = 'claim-attachments');
