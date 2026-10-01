create table public.bookings (
    id uuid primary key default gen_random_uuid(),

    customer_name text not null,
    customer_email text not null,
    customer_phone text not null,

    date date not null,
    start_time time not null,
    end_time time not null,

    children integer not null check (children > 0),
    package text not null,

    total_price integer not null check (total_price >= 0),
    deposit_amount integer not null check (deposit_amount >= 0),

    payment_status text not null default 'pending'
        check (payment_status in ('pending', 'paid', 'failed')),
    booking_status text not null default 'pending'
        check (booking_status in ('pending', 'confirmed', 'cancelled', 'completed')),

    stripe_session_id text,
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.booking_children (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid not null references public.bookings (id) on delete cascade,
    name text not null,
    age integer check (age is null or (age >= 1 and age <= 18))
);

create index booking_children_booking_id_idx
    on public.booking_children (booking_id);

alter table public.bookings enable row level security;
alter table public.booking_children enable row level security;
