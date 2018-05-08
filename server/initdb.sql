create extension if not exists "pgcrypto";

drop schema bm_private cascade;
drop schema bm cascade;
drop user bm_postgraphile;
drop user bm_anonymous;
drop user bm_user;

create schema if not exists bm;
create schema if not exists bm_private;

create role bm_postgraphile login password 'bm_password';

create role bm_anonymous;
grant bm_anonymous to bm_postgraphile;

create role bm_user;
grant bm_user to bm_postgraphile;

alter default privileges revoke execute on functions from public;

create table bm.user (
    id serial primary key,
    first_name text check (char_length(first_name) < 80),
    last_name text check (char_length(last_name) < 80),
    created_at timestamp with time zone default now()
);

create function bm.user_best_identifier(u bm.user) returns text as $$
    select case
      when u.first_name is null and u.last_name is null then '<No name>'
      when u.last_name is null then u.first_name
      else u.first_name || ' ' || u.last_name
    end
$$ language sql stable;

create table bm.group (
    id serial primary key,
    name text not null check (char_length(name) < 80),
    owner_id integer not null references bm.user (id),
    created_at timestamp with time zone default now()
);

create table bm.bill (
    id serial primary key,
    name text not null check (char_length(name) < 80),
    amount float not null,
    group_id integer not null references bm.group (id),
    owner_id integer not null references bm.user (id),
    created_at timestamp with time zone default now()
);

create table bm.user_group (
    user_id integer not null references bm.user (id),
    group_id integer not null references bm.group (id),
    primary key (user_id, group_id)
);

create function bm.user_groups_by_user_id(u bm.user) returns setof bm.group as $$
    select bm.group.* from bm.group inner join bm.user_group on (bm.group.id = bm.user_group.group_id) where bm.user_group.user_id = u.id;
$$ language sql stable;

create function bm.group_users_by_group_id(g bm.group) returns setof bm.user as $$
    select bm.user.* from bm.user inner join bm.user_group on (bm.user.id = bm.user_group.user_id) where bm.user_group.group_id = g.id;
$$ language sql stable;

create table bm.user_bill (
    user_id integer not null references bm.user (id),
    bill_id integer not null references bm.bill (id),
    paid boolean not null default false,
    primary key (user_id, bill_id)
);

-- Authentication

create table bm_private.user_account (
    user_id integer primary key references bm.user (id) on delete cascade,
    email text not null unique check (email ~* '^.+@.+\..+$'),
    phash text not null
);

create function bm.register_user(first_name text, last_name text, email text, password text) returns bm.user as $$
declare newuser bm.user;
begin
    insert into bm.user (first_name, last_name) values (first_name, last_name) returning * into newuser;
    insert into bm_private.user_account (user_id, email, phash) values (newuser.id, email, crypt(password, gen_salt('bf')));
    return newuser;
end;
$$  language plpgsql strict security definer;

create type bm.jwt_token as (
    role text,
    user_id integer
);

create function bm.authenticate(email text, password text) returns bm.jwt_token as $$
declare account bm_private.user_account;
begin
    select bm_private.user_account.* into account from bm_private.user_account where bm_private.user_account.email = $1;
    if account.phash = crypt(password, account.phash) then
        return ('bm_user', account.user_id)::bm.jwt_token;
    else
        return null;
    end if;
end;
$$ language plpgsql strict security definer;

create function bm.current_person() returns bm.user as $$
    select * from bm.user where bm.user.id = current_setting('jwt.claims.user_id')::integer
$$ language sql stable;

-- Security policy

grant usage on schema bm to bm_anonymous, bm_user;

grant all on all sequences in schema bm to bm_user;

grant execute on all functions in schema bm to bm_user;
grant execute on function bm.register_user(text, text, text, text) to bm_anonymous;
grant execute on function bm.authenticate(text, text) to bm_anonymous;

grant select, update, delete on table bm.user to bm_user;
alter table bm.user enable row level security;
create policy select_user on bm.user for select using (true);
create policy update_user on bm.user for update using (id = current_setting('jwt.claims.user_id')::integer);
create policy delete_user on bm.user for delete using (id = current_setting('jwt.claims.user_id')::integer);

grant all on table bm.group to bm_user;
alter table bm.group enable row level security;
create policy select_group on bm.group for select using (true);
create policy insert_group on bm.group for insert with check (true);
create policy update_group on bm.group for update using (owner_id = current_setting('jwt.claims.user_id')::integer);
create policy delete_group on bm.group for delete using (owner_id = current_setting('jwt.claims.user_id')::integer);

grant all on table bm.bill to bm_user;
alter table bm.bill enable row level security;
create policy select_bill on bm.bill for select using (true);
create policy insert_bill on bm.bill for insert with check (true);
create policy update_bill on bm.bill for update using (owner_id = current_setting('jwt.claims.user_id')::integer);
create policy delete_bill on bm.bill for delete using (owner_id = current_setting('jwt.claims.user_id')::integer);

grant all on table bm.user_bill to bm_user;
alter table bm.user_bill enable row level security;
create policy select_user_bill on bm.user_bill for select using (true);
create policy update_user_bill on bm.user_bill for update using ((select owner_id from bm.bill where id = bill_id) = current_setting('jwt.claims.user_id')::integer);
create policy insert_user_bill on bm.user_bill for insert with check (true);
create policy delete_user_bill on bm.user_bill for delete using ((select owner_id from bm.bill where id = bill_id) = current_setting('jwt.claims.user_id')::integer);

grant all on table bm.user_group to bm_user;
alter table bm.user_group enable row level security;
create policy select_user_group on bm.user_group for select using (true);
create policy update_user_group on bm.user_group for update using (user_id = current_setting('jwt.claims.user_id')::integer);
create policy insert_user_group on bm.user_group for insert with check ((select owner_id from bm.group where id = group_id) = current_setting('jwt.claims.user_id')::integer);
create policy delete_user_group on bm.user_group for delete using ((select owner_id from bm.group where id = group_id) = current_setting('jwt.claims.user_id')::integer);
