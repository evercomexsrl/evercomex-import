-- PEGAR COMPLETO EN SUPABASE > SQL Editor > Run (una sola vez)
create extension if not exists pgcrypto;
create sequence import_seq;

create table profiles(id uuid primary key references auth.users(id) on delete cascade, full_name text, role text not null default 'employee' check(role in('admin','employee')), is_active boolean not null default true, created_at timestamptz default now());
create function is_admin() returns boolean language sql security definer stable set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin' and is_active) $$;
create function is_user() returns boolean language sql security definer stable set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and is_active) $$;
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table categories(id uuid primary key default gen_random_uuid(), name text unique not null, created_at timestamptz default now());
create table products(id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, category_id uuid references categories(id), brand text, unit text not null default 'unidad', barcode text unique, min_stock numeric not null default 0 check(min_stock>=0), price_retail numeric not null default 0 check(price_retail>=0), price_wholesale numeric not null default 0 check(price_wholesale>=0), is_active boolean not null default true, created_at timestamptz default now());
create table suppliers(id uuid primary key default gen_random_uuid(), name text not null, country text, tax_id text, phone text, email text, is_active boolean not null default true, created_at timestamptz default now());
create table customers(id uuid primary key default gen_random_uuid(), name text not null, tax_id text, phone text, email text, address text, credit_limit numeric, is_active boolean not null default true, created_at timestamptz default now());

create table imports(id uuid primary key default gen_random_uuid(), code text unique not null, supplier_id uuid references suppliers(id), currency text not null check(currency in('USD','BOB')), exchange_rate numeric not null check(exchange_rate>0), status text not null default 'en_transito' check(status in('borrador','en_transito','recepcion_parcial','recibida','cerrada','anulada')), purchase_date date default current_date, invoice_no text, notes text, paid_amount numeric not null default 0, created_by uuid, created_at timestamptz default now());
create table import_items(id uuid primary key default gen_random_uuid(), import_id uuid not null references imports(id) on delete cascade, product_id uuid not null references products(id), qty_ordered numeric not null check(qty_ordered>0), qty_received numeric not null default 0 check(qty_received>=0), unit_price numeric not null check(unit_price>=0), unique(import_id,product_id));
create table import_expenses(id uuid primary key default gen_random_uuid(), import_id uuid not null references imports(id) on delete cascade, expense_type text not null, amount numeric not null check(amount>0), currency text not null check(currency in('USD','BOB')), exchange_rate numeric not null check(exchange_rate>0), amount_bob numeric not null, distribution text not null default 'valor', is_cost boolean not null default true, created_at timestamptz default now());
create table import_receipts(id uuid primary key default gen_random_uuid(), import_id uuid not null references imports(id), created_by uuid, created_at timestamptz default now());
create table product_lots(id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id), import_id uuid references imports(id), receipt_id uuid references import_receipts(id), qty_received numeric not null check(qty_received>0), qty_available numeric not null check(qty_available>=0), unit_cost_bob numeric(14,4) not null, created_at timestamptz default now());
create index on product_lots(product_id,created_at);
create table inventory_movements(id uuid primary key default gen_random_uuid(), product_id uuid not null, lot_id uuid, movement_type text not null, qty numeric not null, unit_cost_bob numeric(14,4), ref_id uuid, created_by uuid, created_at timestamptz default now());
create index on inventory_movements(product_id,created_at);

create table sales(id uuid primary key default gen_random_uuid(), sale_no bigint generated always as identity unique, customer_id uuid references customers(id), sale_type text not null check(sale_type in('minorista','mayorista')), currency text not null check(currency in('USD','BOB')), exchange_rate numeric not null check(exchange_rate>0), total numeric not null default 0, total_bob numeric not null default 0, paid_amount numeric not null default 0, status text not null default 'confirmada' check(status in('confirmada','anulada')), void_reason text, created_by uuid, created_at timestamptz default now());
create table sale_items(id uuid primary key default gen_random_uuid(), sale_id uuid not null references sales(id), product_id uuid not null references products(id), qty numeric not null check(qty>0), unit_price numeric not null check(unit_price>=0), line_total numeric not null);
create table sale_lot_allocations(id uuid primary key default gen_random_uuid(), sale_item_id uuid not null references sale_items(id), lot_id uuid not null references product_lots(id), qty numeric not null check(qty>0), unit_cost_bob numeric(14,4) not null);
create table payments(id uuid primary key default gen_random_uuid(), direction text not null check(direction in('in','out')), sale_id uuid references sales(id), import_id uuid references imports(id), customer_id uuid, amount numeric not null check(amount>0), currency text not null, exchange_rate numeric not null, amount_bob numeric not null, paid_at timestamptz default now(), created_by uuid);
create table audit_logs(id uuid primary key default gen_random_uuid(), user_id uuid, action text, record_id uuid, data jsonb, created_at timestamptz default now());

create view v_stock as select p.id product_id,p.code,p.name,p.unit,p.min_stock,p.price_retail,p.price_wholesale,p.is_active,coalesce(sum(l.qty_available),0) stock from products p left join product_lots l on l.product_id=p.id group by p.id;

-- ===== SEGURIDAD (RLS) =====
do $$ declare t text; begin
 foreach t in array array['profiles','categories','products','suppliers','customers','imports','import_items','import_expenses','import_receipts','product_lots','inventory_movements','sales','sale_items','sale_lot_allocations','payments','audit_logs'] loop
  execute format('alter table %I enable row level security',t); end loop;
 foreach t in array array['categories','products','suppliers'] loop
  execute format('create policy "%1$s_r" on %1$s for select using (is_user())',t);
  execute format('create policy "%1$s_w" on %1$s for all using (is_admin()) with check (is_admin())',t); end loop;
 foreach t in array array['imports','import_items','import_expenses','import_receipts','product_lots','inventory_movements','sale_lot_allocations','payments','audit_logs'] loop
  execute format('create policy "%1$s_a" on %1$s for select using (is_admin())',t); end loop;
 foreach t in array array['sales','sale_items'] loop
  execute format('create policy "%1$s_r" on %1$s for select using (is_user())',t); end loop;
end $$;
create policy prof_r on profiles for select using (id=auth.uid() or is_admin());
create policy prof_u on profiles for update using (is_admin()) with check (is_admin());
create policy cust_r on customers for select using (is_user());
create policy cust_i on customers for insert with check (is_user());
create policy cust_u on customers for update using (is_user()) with check (is_user());
grant select on v_stock to authenticated;

-- ===== OPERACIONES ATÓMICAS =====
create function create_import(p jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v uuid; it jsonb; ex jsonb;
begin
 if not is_admin() then raise exception 'Solo el administrador puede crear importaciones'; end if;
 insert into imports(code,supplier_id,currency,exchange_rate,invoice_no,notes,created_by)
 values('IMP-'||to_char(now(),'YYMM')||'-'||lpad(nextval('import_seq')::text,4,'0'),nullif(p->>'supplier_id','')::uuid,p->>'currency',(p->>'exchange_rate')::numeric,p->>'invoice_no',p->>'notes',auth.uid()) returning id into v;
 for it in select * from jsonb_array_elements(p->'items') loop
  insert into import_items(import_id,product_id,qty_ordered,unit_price) values(v,(it->>'product_id')::uuid,(it->>'qty')::numeric,(it->>'price')::numeric); end loop;
 for ex in select * from jsonb_array_elements(coalesce(p->'expenses','[]'::jsonb)) loop
  insert into import_expenses(import_id,expense_type,amount,currency,exchange_rate,amount_bob,is_cost)
  values(v,ex->>'type',(ex->>'amount')::numeric,ex->>'currency',(ex->>'rate')::numeric,round((ex->>'amount')::numeric*(ex->>'rate')::numeric,2),coalesce((ex->>'is_cost')::boolean,true)); end loop;
 insert into audit_logs(user_id,action,record_id) values(auth.uid(),'create_import',v);
 return v;
end $$;

-- Recepción: costo del lote = precio×tipo de cambio + gastos incorporables repartidos por valor
create function receive_import(p_import uuid,p_items jsonb) returns void language plpgsql security definer set search_path=public as $$
declare imp imports; r uuid; it jsonb; ii import_items; tv numeric; te numeric; q numeric; uc numeric; lid uuid; pend int;
begin
 if not is_admin() then raise exception 'Solo el administrador puede recibir importaciones'; end if;
 select * into imp from imports where id=p_import for update;
 if not found or imp.status not in('en_transito','recepcion_parcial') then raise exception 'La importación no admite recepciones en su estado actual'; end if;
 select sum(qty_ordered*unit_price*imp.exchange_rate) into tv from import_items where import_id=p_import;
 select coalesce(sum(amount_bob),0) into te from import_expenses where import_id=p_import and is_cost;
 insert into import_receipts(import_id,created_by) values(p_import,auth.uid()) returning id into r;
 for it in select * from jsonb_array_elements(p_items) loop
  q:=coalesce((it->>'qty')::numeric,0); continue when q<=0;
  select * into ii from import_items where id=(it->>'item_id')::uuid and import_id=p_import for update;
  if not found or ii.qty_received+q>ii.qty_ordered then raise exception 'La cantidad recibida excede lo pedido'; end if;
  uc:=round(ii.unit_price*imp.exchange_rate+case when tv>0 then te*(ii.qty_ordered*ii.unit_price*imp.exchange_rate/tv)/ii.qty_ordered else 0 end,4);
  insert into product_lots(product_id,import_id,receipt_id,qty_received,qty_available,unit_cost_bob) values(ii.product_id,p_import,r,q,q,uc) returning id into lid;
  insert into inventory_movements(product_id,lot_id,movement_type,qty,unit_cost_bob,ref_id,created_by) values(ii.product_id,lid,'recepcion',q,uc,r,auth.uid());
  update import_items set qty_received=qty_received+q where id=ii.id;
 end loop;
 select count(*) into pend from import_items where import_id=p_import and qty_received<qty_ordered;
 update imports set status=case when pend=0 then 'recibida' else 'recepcion_parcial' end where id=p_import;
 insert into audit_logs(user_id,action,record_id) values(auth.uid(),'receive_import',r);
end $$;

-- Venta: asigna lotes (más antiguo primero), bloquea filas, descuenta, calcula costo
create function confirm_sale(p jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare s uuid; it jsonb; si uuid; pid uuid; need numeric; take numeric; l record; tot numeric:=0; q numeric; pr numeric; rate numeric; paid numeric; cur text; cust uuid;
begin
 if not is_user() then raise exception 'Cuenta inactiva'; end if;
 rate:=(p->>'exchange_rate')::numeric; cur:=p->>'currency'; cust:=nullif(p->>'customer_id','')::uuid;
 if rate is null or rate<=0 then raise exception 'Tipo de cambio inválido'; end if;
 if jsonb_array_length(p->'items')=0 then raise exception 'La venta no tiene productos'; end if;
 insert into sales(customer_id,sale_type,currency,exchange_rate,created_by) values(cust,p->>'sale_type',cur,rate,auth.uid()) returning id into s;
 for it in select * from jsonb_array_elements(p->'items') loop
  pid:=(it->>'product_id')::uuid; q:=(it->>'qty')::numeric; pr:=(it->>'price')::numeric;
  if q<=0 or pr<0 then raise exception 'Cantidad o precio inválido'; end if;
  insert into sale_items(sale_id,product_id,qty,unit_price,line_total) values(s,pid,q,pr,round(q*pr,2)) returning id into si;
  need:=q;
  for l in select id,qty_available,unit_cost_bob from product_lots where product_id=pid and qty_available>0 order by created_at,id for update loop
   exit when need<=0; take:=least(need,l.qty_available);
   update product_lots set qty_available=qty_available-take where id=l.id;
   insert into sale_lot_allocations(sale_item_id,lot_id,qty,unit_cost_bob) values(si,l.id,take,l.unit_cost_bob);
   insert into inventory_movements(product_id,lot_id,movement_type,qty,unit_cost_bob,ref_id,created_by) values(pid,l.id,'venta',-take,l.unit_cost_bob,s,auth.uid());
   need:=need-take;
  end loop;
  if need>0 then raise exception 'Stock insuficiente'; end if;
  tot:=tot+round(q*pr,2);
 end loop;
 paid:=least(greatest(coalesce((p->>'paid')::numeric,0),0),tot);
 if cust is null and paid<tot then raise exception 'La venta de mostrador debe pagarse completa'; end if;
 update sales set total=tot,total_bob=round(tot*rate,2),paid_amount=paid where id=s;
 if paid>0 then insert into payments(direction,sale_id,customer_id,amount,currency,exchange_rate,amount_bob,created_by) values('in',s,cust,paid,cur,rate,round(paid*rate,2),auth.uid()); end if;
 insert into audit_logs(user_id,action,record_id) values(auth.uid(),'confirm_sale',s);
 return s;
end $$;

create function register_payment(p_dir text,p_ref uuid,p_amount numeric) returns void language plpgsql security definer set search_path=public as $$
declare s sales; i imports; tot numeric;
begin
 if not is_user() then raise exception 'Cuenta inactiva'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Monto inválido'; end if;
 if p_dir='in' then
  select * into s from sales where id=p_ref for update;
  if not found or s.status<>'confirmada' then raise exception 'Venta no válida'; end if;
  if s.paid_amount+p_amount>s.total then raise exception 'El cobro excede el saldo'; end if;
  update sales set paid_amount=paid_amount+p_amount where id=p_ref;
  insert into payments(direction,sale_id,customer_id,amount,currency,exchange_rate,amount_bob,created_by) values('in',p_ref,s.customer_id,p_amount,s.currency,s.exchange_rate,round(p_amount*s.exchange_rate,2),auth.uid());
 else
  if not is_admin() then raise exception 'Solo el administrador'; end if;
  select * into i from imports where id=p_ref for update;
  select sum(qty_ordered*unit_price) into tot from import_items where import_id=p_ref;
  if i.paid_amount+p_amount>tot then raise exception 'El pago excede el valor de la compra'; end if;
  update imports set paid_amount=paid_amount+p_amount where id=p_ref;
  insert into payments(direction,import_id,amount,currency,exchange_rate,amount_bob,created_by) values('out',p_ref,p_amount,i.currency,i.exchange_rate,round(p_amount*i.exchange_rate,2),auth.uid());
 end if;
end $$;

create function void_sale(p_sale uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare s sales; r record;
begin
 if not is_admin() then raise exception 'Solo el administrador puede anular'; end if;
 if coalesce(trim(p_reason),'')='' then raise exception 'El motivo es obligatorio'; end if;
 select * into s from sales where id=p_sale for update;
 if not found or s.status<>'confirmada' then raise exception 'La venta no se puede anular'; end if;
 for r in select a.lot_id,a.qty,a.unit_cost_bob,i.product_id from sale_lot_allocations a join sale_items i on i.id=a.sale_item_id where i.sale_id=p_sale loop
  update product_lots set qty_available=qty_available+r.qty where id=r.lot_id;
  insert into inventory_movements(product_id,lot_id,movement_type,qty,unit_cost_bob,ref_id,created_by) values(r.product_id,r.lot_id,'anulacion',r.qty,r.unit_cost_bob,p_sale,auth.uid());
 end loop;
 update sales set status='anulada',void_reason=p_reason where id=p_sale;
 insert into audit_logs(user_id,action,record_id,data) values(auth.uid(),'void_sale',p_sale,jsonb_build_object('reason',p_reason));
end $$;

create function dashboard_stats() returns json language plpgsql security definer stable set search_path=public as $$
declare d date:=(now() at time zone 'America/La_Paz')::date; a boolean:=is_admin();
begin
 if not is_user() then raise exception 'Cuenta inactiva'; end if;
 return json_build_object(
  'products',(select count(*) from products where is_active),
  'units',(select coalesce(sum(qty_available),0) from product_lots),
  'inventory_value',case when a then (select coalesce(sum(qty_available*unit_cost_bob),0) from product_lots) end,
  'sales_today',(select coalesce(sum(total_bob),0) from sales where status='confirmada' and (created_at at time zone 'America/La_Paz')::date=d),
  'sales_month',(select coalesce(sum(total_bob),0) from sales where status='confirmada' and date_trunc('month',created_at at time zone 'America/La_Paz')=date_trunc('month',d)),
  'cogs_month',case when a then (select coalesce(sum(x.qty*x.unit_cost_bob),0) from sale_lot_allocations x join sale_items i on i.id=x.sale_item_id join sales s on s.id=i.sale_id where s.status='confirmada' and date_trunc('month',s.created_at at time zone 'America/La_Paz')=date_trunc('month',d)) end,
  'receivable_bob',(select coalesce(sum((total-paid_amount)*exchange_rate),0) from sales where status='confirmada'),
  'in_transit',(select count(*) from imports where status in('en_transito','recepcion_parcial')),
  'low_stock',(select count(*) from v_stock where is_active and stock<=min_stock));
end $$;

revoke all on function create_import(jsonb),receive_import(uuid,jsonb),confirm_sale(jsonb),register_payment(text,uuid,numeric),void_sale(uuid,text),dashboard_stats() from public,anon;
grant execute on function create_import(jsonb),receive_import(uuid,jsonb),confirm_sale(jsonb),register_payment(text,uuid,numeric),void_sale(uuid,text),dashboard_stats() to authenticated;
