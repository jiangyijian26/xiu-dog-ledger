create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  nickname text not null default '阿修用户',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  name text not null,
  balance numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  icon text not null default 'tag',
  parent_id uuid references categories(id) on delete set null,
  sort_order integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('natural_month', 'monthly_start', 'fixed_days')),
  start_date date not null,
  end_date date not null,
  start_day integer,
  fixed_days integer,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  cycle_id uuid references cycles(id) on delete cascade,
  type text not null check (type in ('total', 'category')),
  amount numeric(12,2) not null check (amount >= 0),
  category_id uuid references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(12,2) not null check (amount > 0),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  target_account_id uuid references accounts(id) on delete set null,
  occurred_at timestamptz not null,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_settings (
  user_id uuid primary key references users(id) on delete cascade,
  enabled boolean not null default false,
  allowance_day integer not null default 1,
  allowance_amount numeric(12,2) not null default 0,
  extra_income numeric(12,2) not null default 0,
  allocation_method text not null default 'monthly' check (allocation_method in ('monthly', 'weekly', 'category')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_user_idx on accounts(user_id);
create index if not exists categories_user_idx on categories(user_id);
create index if not exists cycles_user_current_idx on cycles(user_id, is_current);
create index if not exists budgets_user_cycle_idx on budgets(user_id, cycle_id);
create index if not exists bills_user_time_idx on bills(user_id, occurred_at desc);
