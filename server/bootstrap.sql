select bm.register_user('Chase', 'Meadors', 'c.ed.mead@gmail.com', 'bad');
select bm.register_user('Test', 'Person', 'test.person@gmail.com', 'bad');

insert into bm.group (name, owner_id) values ('Chase Group', 1), ('Test Group', 2);

insert into bm.user_group (user_id, group_id) values (1, 1), (1, 2), (2, 1), (2, 2);

insert into bm.bill (name, amount, group_id, owner_id) values ('Bill1', 100, 1, 1);
insert into bm.user_bill (user_id, bill_id) values (1, 1), (2, 1);

insert into bm.bill (name, amount, group_id, owner_id) values ('Bill2', 150, 1, 2);
insert into bm.user_bill (user_id, bill_id) values (1, 2), (2, 2);