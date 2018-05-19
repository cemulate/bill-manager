\c billmanager

grant usage on schema bm to bm_anonymous, bm_user;

grant all on all sequences in schema bm to bm_user;

grant execute on all functions in schema bm to bm_user;
grant execute on function bm.register_user(text, text, text, text) to bm_anonymous;
grant execute on function bm.authenticate(text, text) to bm_anonymous;

-- In the following comments, CU stands for current user

grant select, update, delete on table bm.user to bm_user;
alter table bm.user enable row level security;
-- CU should only see themselves and users that are in some group that CU is a member of
create policy select_user on bm.user for select using 
(
    id = current_setting('jwt.claims.user_id')::integer 
    or 
    id in (select t2.user_id from bm.user_group as t1 join bm.user_group as t2 on (t1.group_id = t2.group_id) where t1.user_id = current_setting('jwt.claims.user_id')::integer)
);
-- This table should not have rows inserted (use register_user)
-- CU should only be able to update/delete themselves
create policy update_user on bm.user for update using (id = current_setting('jwt.claims.user_id')::integer);
create policy delete_user on bm.user for delete using (id = current_setting('jwt.claims.user_id')::integer);

grant all on table bm.group to bm_user;
alter table bm.group enable row level security;
-- CU should only see groups they own and for which they are a member
create policy select_group on bm.group for select using 
(
    owner_id = current_setting('jwt.claims.user_id')::integer
    or
    id in (select group_id from bm.user_group where user_id = current_setting('jwt.claims.user_id')::integer)
);
-- If CU inserts a group, CU should be set as the owner
create policy insert_group on bm.group for insert with check (owner_id = current_setting('jwt.claims.user_id')::integer);
-- CU should only be able to update/delete groups they own
create policy update_group on bm.group for update using (owner_id = current_setting('jwt.claims.user_id')::integer);
create policy delete_group on bm.group for delete using (owner_id = current_setting('jwt.claims.user_id')::integer);

grant all on table bm.bill to bm_user;
alter table bm.bill enable row level security;
-- CU should only see bills that they own or are part of a group they are a member of
create policy select_bill on bm.bill for select using 
(
    owner_id = current_setting('jwt.claims.user_id')::integer
    or
    group_id in (select group_id from bm.user_group where user_id = current_setting('jwt.claims.user_id')::integer)
);
-- If CU inserts a bill, CU should be set as the owner
create policy insert_bill on bm.bill for insert with check (owner_id = current_setting('jwt.claims.user_id')::integer);
-- CU should only be able to update/delete bills they own
create policy update_bill on bm.bill for update using (
    owner_id = current_setting('jwt.claims.user_id')::integer
);
create policy delete_bill on bm.bill for delete using (owner_id = current_setting('jwt.claims.user_id')::integer);

grant select, insert, delete on table bm.user_group to bm_user;
alter table bm.user_group enable row level security;
-- -- CU should only see group membership information if they're in the group
-- create policy select_user_group on bm.user_group for select using (group_id in (select group_id from bm.user_group where user_id = current_setting('jwt.claims.user_id')::integer));
create policy select_user_group on bm.user_group for select using (true);
-- This table should not have rows updated
-- If CU adds a user to a group, they should own that group
create policy insert_user_group on bm.user_group for insert with check (group_id in (select id from bm.group where owner_id = current_setting('jwt.claims.user_id')::integer));
-- If CU removes a user from a group, they should own that group
create policy delete_user_group on bm.user_group for delete using (group_id in (select id from bm.group where owner_id = current_setting('jwt.claims.user_id')::integer));

grant select, insert, delete on table bm.user_bill to bm_user;
alter table bm.user_bill enable row level security;
-- -- CU should only see bill membership if the bill is in a group they are a member of
-- create policy select_user_bill on bm.user_bill for select using 
--     (exists (select t2.group_id from bm.bill as t1 join bm.user_group as t2 on (t1.group_id = t2.group_id) where t1.id = bill_id and t2.user_id = current_setting('jwt.claims.user_id')::integer));
create policy select_user_bill on bm.user_bill for select using (true);
-- This table should not have rows updated
-- If CU adds a user to a bill, they should own that bill
create policy insert_user_bill on bm.user_bill for insert with check (bill_id in (select id from bm.bill where owner_id = current_setting('jwt.claims.user_id')::integer));
-- If CU removes a user from a bill, they should own that bill
create policy delete_user_bill on bm.user_bill for delete using (bill_id in (select id from bm.bill where owner_id = current_setting('jwt.claims.user_id')::integer));