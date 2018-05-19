\c billmanager

create extension if not exists "pgcrypto";

drop schema if exists bm_private cascade;
drop schema if exists bm cascade;
drop user if exists bm_postgraphile;
drop user if exists bm_anonymous;
drop user if exists bm_user;

create schema if not exists bm;
create schema if not exists bm_private;

create role bm_postgraphile login password 'bm_password';

create role bm_anonymous;
grant bm_anonymous to bm_postgraphile;

create role bm_user;
grant bm_user to bm_postgraphile;

alter default privileges revoke execute on functions from public;