import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, money, msg } from '../lib/supabase'
import { useAuth } from '../lib/auth'
export function Sales() {
  const { isAdmin } = useAuth(); const [rows, setRows] = useState<any[]>([]); const [err, setErr] = useState('')
  const load = async () => setRows((await supabase.from('sales').select('*,customers(name)').order('created_at', { ascending: false }).limit(200)).data || [])
  useEffect(() => { load() }, [])
  const pay = async (s: any) => { const a = prompt('Monto a cobrar (' + s.currency + ')'); if (!a) return; const { error } = await supabase.rpc('register_payment', { p_dir: 'in', p_ref: s.id, p_amount: Number(a) }); if (error) setErr(msg(error)); else load() }
  const voidIt = async (s: any) => { const r = prompt('Motivo de la anulación'); if (!r) return; const { error } = await supabase.rpc('void_sale', { p_sale: s.id, p_reason: r }); if (error) setErr(msg(error)); else load() }
  return <><h1>Ventas</h1><p><Link to="/ventas/nueva"><button>Nueva venta</button></Link></p>{err && <p className="err">{err}</p>}
    <div className="card"><table><thead><tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Total</th><th>Pagado</th><th>Estado</th><th></th></tr></thead><tbody>
      {rows.map(s => <tr key={s.id} style={{ opacity: s.status === 'anulada' ? .5 : 1 }}><td><Link to={'/ventas/' + s.id}>{s.sale_no}</Link></td><td>{new Date(s.created_at).toLocaleDateString('es-BO')}</td><td>{s.customers?.name || 'Mostrador'}</td><td>{s.sale_type}</td><td>{money(s.total)} {s.currency}</td><td>{money(s.paid_amount)}</td><td>{s.status}</td>
        <td>{s.status === 'confirmada' && s.paid_amount < s.total && <button className="sec" onClick={() => pay(s)}>Cobrar</button>} {isAdmin && s.status === 'confirmada' && <button className="bad" onClick={() => voidIt(s)}>Anular</button>}</td></tr>)}</tbody></table></div></>
}
export function NewSale() {
  const nav = useNavigate(); const [cust, setCust] = useState<any[]>([]); const [prods, setProds] = useState<any[]>([]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [h, setH] = useState<any>({ customer_id: '', sale_type: 'minorista', currency: 'BOB', exchange_rate: '1', paid: '' }); const [items, setItems] = useState<any[]>([{ product_id: '', qty: '', price: '' }])
  useEffect(() => {
    supabase.from('customers').select('id,name').eq('is_active', true).order('name').then(r => setCust(r.data || []))
    supabase.from('v_stock').select('*').eq('is_active', true).gt('stock', 0).order('name').then(r => setProds(r.data || []))
  }, [])
  const price = (pid: string, type: string) => { const p = prods.find(x => x.product_id === pid); return p ? String(type === 'mayorista' ? p.price_wholesale : p.price_retail) : '' }
  const setItem = (i: number, patch: any) => setItems(items.map((x, j) => j === i ? { ...x, ...patch } : x))
  const total = items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.price || 0), 0)
  const save = async (e: any) => {
    e.preventDefault(); if (busy) return; setErr(''); setBusy(true)
    const paid = h.paid === '' ? (h.customer_id ? 0 : total) : Number(h.paid)
    const { data, error } = await supabase.rpc('confirm_sale', { p: { ...h, exchange_rate: Number(h.exchange_rate), paid, items: items.map(x => ({ product_id: x.product_id, qty: Number(x.qty), price: Number(x.price) })) } })
    setBusy(false); if (error) setErr(msg(error)); else nav('/ventas/' + data)
  }
  return <><h1>Nueva venta</h1><form className="card" onSubmit={save}>
    <div className="row"><label>Cliente<select value={h.customer_id} onChange={e => setH({ ...h, customer_id: e.target.value })}><option value="">Mostrador</option>{cust.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Tipo<select value={h.sale_type} onChange={e => { setH({ ...h, sale_type: e.target.value }); setItems(items.map(x => ({ ...x, price: price(x.product_id, e.target.value) }))) }}><option>minorista</option><option>mayorista</option></select></label>
      <label>Moneda<select value={h.currency} onChange={e => setH({ ...h, currency: e.target.value, exchange_rate: e.target.value === 'BOB' ? '1' : '' })}><option>BOB</option><option>USD</option></select></label>
      {h.currency === 'USD' && <label>Tipo de cambio<input type="number" step="any" required value={h.exchange_rate} onChange={e => setH({ ...h, exchange_rate: e.target.value })} /></label>}</div>
    {items.map((x, i) => <div className="row" key={i}>
      <label>Producto<select required value={x.product_id} onChange={e => setItem(i, { product_id: e.target.value, price: price(e.target.value, h.sale_type) })}><option value="">—</option>{prods.map(p => <option key={p.product_id} value={p.product_id}>{p.code} · {p.name} (stock {p.stock})</option>)}</select></label>
      <label>Cantidad<input type="number" step="any" required value={x.qty} onChange={e => setItem(i, { qty: e.target.value })} /></label>
      <label>Precio ({h.currency})<input type="number" step="any" required value={x.price} onChange={e => setItem(i, { price: e.target.value })} /></label></div>)}
    <button type="button" className="sec" onClick={() => setItems([...items, { product_id: '', qty: '', price: '' }])}>+ Producto</button>
    <p>Total: <b>{money(total)} {h.currency}</b></p>
    <div className="row"><label>Monto cobrado ahora<input type="number" step="any" value={h.paid} placeholder={h.customer_id ? '0 = a crédito' : 'total'} onChange={e => setH({ ...h, paid: e.target.value })} /></label></div>
    {err && <p className="err">{err}</p>}<button disabled={busy}>Confirmar venta</button></form></>
}
export function SaleDetail() {
  const { id } = useParams(); const { isAdmin } = useAuth(); const [s, setS] = useState<any>(null); const [items, setItems] = useState<any[]>([]); const [cost, setCost] = useState<number | null>(null)
  useEffect(() => {
    (async () => {
      setS((await supabase.from('sales').select('*,customers(name,tax_id)').eq('id', id).single()).data)
      const it = (await supabase.from('sale_items').select('*,products(code,name)').eq('sale_id', id)).data || []; setItems(it)
      if (isAdmin) { const a = (await supabase.from('sale_lot_allocations').select('qty,unit_cost_bob').in('sale_item_id', it.map((x: any) => x.id))).data || []; setCost(a.reduce((t: number, x: any) => t + x.qty * x.unit_cost_bob, 0)) }
    })()
  }, [id, isAdmin])
  if (!s) return <p>Cargando…</p>
  return <div className="card"><h1>Nota de venta N.º {s.sale_no}</h1><p className="muted">Documento comercial interno — no es factura fiscal.</p>
    <p>Fecha: {new Date(s.created_at).toLocaleString('es-BO')} · Cliente: {s.customers?.name || 'Mostrador'} · {s.sale_type} · {s.status}{s.void_reason && ' (' + s.void_reason + ')'}</p>
    <table><thead><tr><th>Código</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>{items.map(i => <tr key={i.id}><td>{i.products?.code}</td><td>{i.products?.name}</td><td>{i.qty}</td><td>{money(i.unit_price)}</td><td>{money(i.line_total)}</td></tr>)}</tbody></table>
    <p><b>Total: {money(s.total)} {s.currency}</b> (= {money(s.total_bob)} BOB, T.C. {s.exchange_rate}) · Pagado {money(s.paid_amount)} · Saldo {money(s.total - s.paid_amount)}</p>
    {cost !== null && <p className="noprint">Costo: {money(cost)} BOB · Ganancia bruta: {money(s.total_bob - cost)} BOB</p>}
    <button className="noprint" onClick={() => window.print()}>Imprimir</button></div>
}
