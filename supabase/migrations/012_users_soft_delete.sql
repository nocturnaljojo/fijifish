-- FijiFish — Migration 012
-- Add soft-delete support to the users table.
--
-- Why: Clerk's user.deleted webhook fires when a user deletes their account.
-- We MUST NOT hard-delete the users row because:
--   orders.customer_id → customers.id → users.id
-- Hard deleting a user cascades and destroys their order history, which we
-- need to keep for financial records and dispute resolution.
--
-- is_active: false once a user deletes their Clerk account.
-- deleted_at: timestamp of the soft-delete (NULL means active).

begin;

alter table users add column if not exists is_active boolean not null default true;
alter table users add column if not exists deleted_at timestamptz;

create index if not exists users_is_active_idx on users(is_active);

commit;
