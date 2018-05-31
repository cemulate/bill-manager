\c billmanager

create table bm.user (
    id serial primary key,
    username text check (char_length(username) < 80),
    created_at timestamp with time zone default now()
);

create table bm.group (
    id serial primary key,
    name text not null check (char_length(name) < 80),
    owner_id integer not null references bm.user (id),
    created_at timestamp with time zone default now()
);

-- Don't generate create mutation (custom)
comment on table bm.group is E'@omit create';

create function bm.create_group(name text) returns bm.group as $$
declare newgroup bm.group;
begin
    insert into bm.group ("name", "owner_id") values (name, bm.current_user_id()) returning bm.group.* into newgroup;
    insert into bm.user_group (user_id, group_id) values (bm.current_user_id(), newgroup.id);
    return newgroup;
end;
$$ language plpgsql;

-- Group membership
create table bm.user_group (
    user_id integer not null references bm.user (id) on delete cascade,
    group_id integer not null references bm.group (id) on delete cascade,
    primary key (user_id, group_id)
);

-- Pure pivot table; don't generate any GraphQL schema
comment on table bm.user_group is E'@omit';

create function bm.user_participating_groups(u bm.user) returns setof bm.group as $$
    select bm.group.* from bm.group inner join bm.user_group on (bm.group.id = bm.user_group.group_id) where bm.user_group.user_id = u.id;
$$ language sql stable;

create function bm.group_members(g bm.group) returns setof bm.user as $$
    select bm.user.* from bm.user inner join bm.user_group on (bm.user.id = bm.user_group.user_id) where bm.user_group.group_id = g.id;
$$ language sql stable;

create table bm.bill (
    id serial primary key,
    name text not null check (char_length(name) < 80),
    amount text not null check (amount ~* '\-?\d+\.\d\d'),
    group_id integer not null references bm.group (id) on delete cascade,
    owner_id integer not null references bm.user (id),
    created_at timestamp with time zone default now()
);

-- Don't generate create mutation (custom)
comment on table bm.bill is E'@omit create';

create function bm.create_bill(name text, amount text, group_id integer) returns bm.bill as $$
declare newbill bm.bill;
begin
    insert into bm.bill ("name", "amount", "group_id", "owner_id") values (name, amount, group_id, bm.current_user_id()) returning bm.bill.* into newbill;
    insert into bm.user_bill_status (user_id, bill_id, paid) values (bm.current_user_id(), newbill.id, true);
    return newbill;
end;
$$ language plpgsql;

-- User-bill status (percent responsible; paid status)
create table bm.user_bill_status (
    user_id integer not null references bm.user (id),
    bill_id integer not null references bm.bill (id) on delete cascade,
    percent integer not null default 0 check (percent >= 0 and percent <= 100),
    paid boolean not null default false,
    primary key (user_id, bill_id)
);

-- Omit most of the schema, allow update
comment on table bm.user_bill_status is E'@omit create,delete,all';

create function bm.bill_participating_users(b bm.bill) returns setof bm.user as $$
    select bm.user.* from bm.user inner join bm.user_bill_status on (bm.user.id = bm.user_bill_status.user_id) where (bm.user_bill_status.bill_id = b.id);
$$ language sql stable;

create function bm.bill_paid_users(b bm.bill) returns setof bm.user as $$
    select bm.user.* from bm.user inner join bm.user_bill_status on (bm.user.id = bm.user_bill_status.user_id) where (bm.user_bill_status.bill_id = b.id and bm.user_bill_status.paid = true);
$$ language sql stable;

create function bm.add_users_to_bill(user_ids integer[], bill_id integer) returns void as $$
begin
    insert into bm.user_bill_status (user_id, bill_id) values (unnest(user_ids), bill_id);
end;
$$ language plpgsql;

create function bm.remove_users_from_bill(user_ids integer[], bill_id integer) returns void as $$
begin
    delete from bm.user_bill_status where (bm.user_bill_status.user_id = any(user_ids) and bm.user_bill_status.bill_id = $2);
end;
$$ language plpgsql;

create function bm.user_user_bill_status_by_bill_id(u bm.user, bill_id integer) returns bm.user_bill_status as $$
    select * from bm.user_bill_status where (user_id = u.id and bill_id = $2);
$$ language sql stable;

----------------------------------------------------

-- Authentication

create table bm_private.user_account (
    user_id integer primary key references bm.user (id) on delete cascade,
    email text not null unique check (email ~* '^.+@.+\..+$'),
    phash text not null
);

create type bm.jwt_token as (
    role text,
    user_id integer
);

create function bm.authenticate(email text, password text) returns bm.jwt_token as $$
declare account bm_private.user_account;
begin
    select bm_private.user_account.* into account from bm_private.user_account where bm_private.user_account.email = $1;
    if not found then
        raise exception 'Authentication error';
    end if;
    if account.phash = crypt(password, account.phash) then
        return ('bm_user', account.user_id)::bm.jwt_token;
    else
        raise exception 'Authentication error';
    end if;
end;
$$ language plpgsql strict security definer;

create function bm.current_user_id() returns integer as $$
begin
    return current_setting('jwt.claims.user_id')::integer;
end;
$$ language plpgsql stable;

create function bm.current_person() returns bm.user as $$
    select * from bm.user where bm.user.id = bm.current_user_id()
$$ language sql stable;

create function bm.register_user(email text, password text, username text = null) returns bm.user as $$
declare newuser bm.user;
begin
    insert into bm.user (username) values ($3) returning * into newuser;
    insert into bm_private.user_account (user_id, email, phash) values (newuser.id, email, crypt(password, gen_salt('bf')));
    return newuser;
end;
$$  language plpgsql security definer;

create table bm.invitation (
    id serial primary key,
    uuid text not null,
    group_id integer not null references bm.group (id) on delete cascade,
    created_at timestamp with time zone default now()
);

comment on table bm.invitation is E'@omit';

create function bm.make_invite_code_for_group(group_id integer) returns text as $$
declare code text;
begin
    insert into bm.invitation (uuid, group_id) values (gen_random_uuid(), $1) returning uuid into code;
    return code;
end;
$$ language plpgsql;

comment on function bm.make_invite_code_for_group(integer) is E'@resultFieldName code';

create function bm.redeem_invite_code_for_group(code text) returns bm.group as $$
declare invite bm.invitation;
declare time_since_invite interval;
declare return_group bm.group;
begin
    select * into invite from bm.invitation where (uuid = code);
    if not found then
        raise exception 'No such invitation';
    end if;
    select into time_since_invite age(now(), invite.created_at);
    if (time_since_invite > interval '1 hour') then
        delete from bm.invitation where (id = invite.id);
        raise exception 'Invite has expired';
    end if;
    insert into bm.user_group (user_id, group_id) values (bm.current_user_id(), invite.group_id);
    select * into return_group from bm.group where (id = invite.group_id);
    delete from bm.invitation where (id = invite.id);
    return return_group;
end;
$$ language plpgsql;
