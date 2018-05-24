\c billmanager

grant usage on schema bm to bm_anonymous, bm_user;

grant all on all sequences in schema bm to bm_user;

grant execute on all functions in schema bm to bm_user;
grant execute on function bm.register_user(text, text, text, text) to bm_anonymous;
grant execute on function bm.authenticate(text, text) to bm_anonymous;

-- In the following comments, CU stands for current user

grant select, update(first_name, last_name), delete on table bm.user to bm_user;
-- This table should not have rows inserted (use register_user)
alter table bm.user enable row level security;
-- CU should only see themselves and users that are in some group that CU is a member of
create policy select_user on bm.user for select using (
    id = bm.current_user_id()
    or
    id in (
        select t2.user_id
        from bm.user_group as t1
        join bm.user_group as t2 on (t1.group_id = t2.group_id)
        where t1.user_id = bm.current_user_id()
    )
);
-- CU should only be able to update/delete themselves
create policy update_user on bm.user for update using (id = bm.current_user_id());
create policy delete_user on bm.user for delete using (id = bm.current_user_id());

grant all on table bm.group to bm_user;
alter table bm.group enable row level security;
-- CU should only see groups they own and for which they are a member
create policy select_group on bm.group for select using (
    owner_id = bm.current_user_id()
    or
    id in (
        select group_id
        from bm.user_group
        where user_id = bm.current_user_id()
    )
);
-- If CU inserts a group, CU should be set as the owner
create policy insert_group on bm.group for insert with check (owner_id = bm.current_user_id());
-- CU should only be able to update/delete groups they own
create policy update_group on bm.group for update using (owner_id = bm.current_user_id());
create policy delete_group on bm.group for delete using (owner_id = bm.current_user_id());

grant all on table bm.bill to bm_user;
alter table bm.bill enable row level security;
-- CU should only see bills that they own or are part of a group they are a member of
create policy select_bill on bm.bill for select using (
    owner_id = bm.current_user_id()
    or
    group_id in (
        select group_id
        from bm.user_group
        where user_id = bm.current_user_id()
    )
);
-- If CU inserts a bill, CU should be set as the owner
create policy insert_bill on bm.bill for insert with check (owner_id = bm.current_user_id());
-- CU should only be able to update/delete bills they own
create policy update_bill on bm.bill for update using (owner_id = bm.current_user_id());
create policy delete_bill on bm.bill for delete using (owner_id = bm.current_user_id());

grant select, insert, delete on table bm.user_group to bm_user;

grant all on table bm.user_bill_status to bm_user;
grant update(percent, paid) on table bm.user_bill_status to bm_user;
alter table bm.user_bill_status enable row level security;
-- No policy on select
create policy select_user_bill_status on bm.user_bill_status for select using (true);
-- If CU adds a user to a bill, they should own that bill
create policy insert_user_bill_status on bm.user_bill_status for insert with check (
    bill_id in (
        select id
        from bm.bill
        where owner_id = bm.current_user_id()
    )
);
-- CU can update their own percent responsible or paid status for a bill; bill owner can update everybody's
create policy update_user_bill_status_percent on bm.user_bill_status for update using (
    user_id = bm.current_user_id()
    or
    bm.current_user_id() = (
        select owner_id
        from bm.bill
        where id = bill_id
    )
);
-- If CU removes a user from a bill, they should own that bill
create policy delete_user_bill_status on bm.user_bill_status for delete using (
    bill_id in (
        select id
        from bm.bill
        where owner_id = bm.current_user_id()
    )
);

grant select, insert on table bm.invitation to bm_user;