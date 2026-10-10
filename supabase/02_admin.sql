-- 1) Crea tu usuario en Authentication > Users > Add user (marca "Auto Confirm User").
-- 2) Cambia el correo de abajo por el tuyo y ejecuta este script.
insert into profiles(id,full_name,role,is_active)
select id,email,'admin',true from auth.users where email='TU_CORREO@ejemplo.com'
on conflict (id) do update set role='admin',is_active=true;
