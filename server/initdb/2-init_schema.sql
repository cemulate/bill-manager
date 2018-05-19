\c billmanager

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

-- Don't generate create mutation (custom)
comment on table bm.group is E'@omit create';

create function bm.group_owner(g bm.group) returns bm.user as $$
    select bm.user.* from bm.user inner join bm.group on (bm.user.id = bm.group.owner_id) where bm.group.owner_id = g.id;
$$ language sql stable;

create function bm.create_group(name text) returns bm.group as $$
declare newgroup bm.group;
begin
    insert into bm.group ("name", "owner_id") values (name, current_setting('jwt.claims.user_id')::integer) returning bm.group.* into newgroup;
    insert into bm.user_group (user_id, group_id) values (current_setting('jwt.claims.user_id')::integer, newgroup.id);
    return newgroup;
end;
$$ language plpgsql;

-- Group membership
create table bm.user_group (
    user_id integer not null references bm.user (id) on delete cascade,
    group_id integer not null references bm.group (id) on delete cascade,
    primary key (user_id, group_id)
);

-- Don't generate any GraphQL schema for pivot tables
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
    group_id integer not null references bm.group (id),
    owner_id integer not null references bm.user (id),
    created_at timestamp with time zone default now()
);

-- Don't generate create mutation (custom)
comment on table bm.bill is E'@omit create';

create function bm.create_bill(name text, amount text, group_id integer) returns bm.bill as $$
declare newbill bm.bill;
begin
    insert into bm.bill ("name", "amount", "group_id", "owner_id") values (name, amount, group_id, current_setting('jwt.claims.user_id')::integer) returning bm.bill.* into newbill;
    insert into bm.user_bill (user_id, bill_id) values (current_setting('jwt.claims.user_id')::integer, newbill.id);
    return newbill;
end;
$$ language plpgsql;

-- Bill membership
create table bm.user_bill (
    user_id integer not null references bm.user (id),
    bill_id integer not null references bm.bill (id),
    paid boolean not null default false,
    primary key (user_id, bill_id)
);

-- Don't generate any GraphQL schema for pivot tables
comment on table bm.user_bill is E'@omit';

create function bm.bill_participating_users(b bm.bill) returns setof bm.user as $$
    select bm.user.* from bm.user inner join bm.user_bill on (bm.user.id = bm.user_bill.user_id) where (bm.user_bill.bill_id = b.id);
$$ language sql stable;

create function bm.bill_paid_users(b bm.bill) returns setof bm.user as $$
    select bm.user.* from bm.user inner join bm.user_bill on (bm.user.id = bm.user_bill.user_id) where (bm.user_bill.bill_id = b.id and bm.user_bill.paid = true);
$$ language sql stable;

create function bm.add_user_to_bill(user_id integer, bill_id integer) returns void as $$
    insert into bm.user_bill (user_id, bill_id, paid) values ($1, $2, false);
$$ language sql;

create function bm.remove_user_from_bill(user_id integer, bill_id integer) returns void as $$
    delete from bm.user_bill where (user_id = $1 and bill_id = $2);
$$ language sql;

create function bm.update_user_paid_status_on_bill(user_id integer, bill_id integer, paid boolean) returns void as $$
    update bm.user_bill set paid = $3 where (user_id = $1 and bill_id = $2);
$$ language sql;

----------------------------------------------------

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