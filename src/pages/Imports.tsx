import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, money, msg } from '../lib/supabase'
export function Imports() {
  const nav = useNavigate(); const [sup, setSup] = useState<any[]>([]); const [prods, setProds] = useState<any[]>([]); const [list, setList] = useState<any[]>([]); const [err, setErr] = useState('')
  const [h, setH] = useState<any>({ currency: 'USD', exchange_rate: '', invoice_no: '', supplier_id: '' })
  const [items, setItems] = useState<any[]>([{ product_id: '', qty: '', price: '' }]); const [exps, setExps] = useState<any[]>([])
  useEffect(() => {
    supabase.from('suppliers').select('id,name').eq('is_active', true).then(r => setSup(r.data || []))
    supabase.from('products').select('id,code,name').eq('is_active', true).order('name').then(r => setProds(r.data || []))
    supabase.from('imports').select('*,suppliers(name)').order('created_at', { ascending: false }).then(r => setList(r.data || []))
  }, [])
  const up = (a: any[], set: any, i: number, k: string, v: any) => set(a.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const save = async (e: any) => {
    e.preventDefault(); setErr('')
    const { data, error } = await supabase.rpc('create_import', { p: { ...h, exchange_rate: Number(h.exchange_rate), items: items.map(x => ({ ...x, qty: Number(x.qty), price: Number(x.price) })), expenses: exps.filter(x => x.amount).map(x => ({ ...x, amount: Number(x.amount), rate: Number(x.rate || h.exchange_rate) })) } })
    if (error) setErr(msg(error)); else nav('/importaciones/' + data)
  }
  return <><h1>Importaciones</h1>
    <form className="card" onSubmit={save}><b>Nueva importación</b>
      <div className="row"><label>Proveedor<select value={h.supplier_id} onChange={e => setH({ ...h, supplier_id: e.target.value })}><option value="">—</option>{sup.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Moneda<select value={h.currency} onChange={e => setH({ ...h, currency: e.target.value })}><option>USD</option><option>BOB</option></select></label>
        <label>Tipo de cambio a BOB<input type="number" step="any" required value={h.exchange_rate} onChange={e => setH({ ...h, exchange_rate: e.target.value })} /></label>
        <label>N.º factura<input value={h.invoice_no} onChange={e => setH({ ...h, invoice_no: e.target.value })} /></label></div>
      <b>Productos</b>{items.map((x, i) => <div className="row" key={i}>
        <label>Producto<select required value={x.product_id} onChange={e => up(items, setItems, i, 'product_id', e.target.value)}><option value="">—</option>{prods.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>
        <label>Cantidad<input type="number" step="any" required value={x.qty} onChange={e => up(items, setItems, i, 'qty', e.target.value)} /></label>
        <label>Precio unitario ({h.currency})<input type="number" step="any" required value={x.price} onChange={e => up(items, setItems, i, 'price', e.target.value)} /></label></div>)}
      <button type="button" className="sec" onClick={() => setItems([...items, { product_id: '', qty: '', price: '' }])}>+ Producto</button>
      <p><b>Gastos de importación</b> <span className="muted">(se reparten por valor; "Sí" = entra al costo)</span></p>
      {exps.map((x, i) => <div className="row" key={i}>
        <label>Tipo<input value={x.type} onChange={e => up(exps, setExps, i, 'type', e.target.value)} placeholder="Flete, aduana, seguro…" /></label>
        <label>Monto<input type="number" step="any" value={x.amount} onChange={e => up(exps, setExps, i, 'amount', e.target.value)} /></label>
        <label>Moneda<select value={x.currency} onChange={e => up(exps, setExps, i, 'currency', e.target.value)}><option>USD</option><option>BOB</option></select></label>
        <label>T. cambio<input type="number" step="any" value={x.rate} onChange={e => up(exps, setExps, i, 'rate', e.target.value)} /></label>
        <label>¿Entra al costo?<select value={x.is_cost ? 'si' : 'no'} onChange={e => up(exps, setExps, i, 'is_cost', e.target.value === 'si')}><option value="si">Sí</option><option value="no">No (recuperable)</option></select></label></div>)}
      <button type="button" className="sec" onClick={() => setExps([...exps, { type: '', amount: '', currency: 'BOB', rate: '1', is_cost: true }])}>+ Gasto</button>
      {err && <p className="err">{err}</p>}<p><button>Crear importación</button></p></form>
    <div className="card"><table><thead><tr><th>Código</th><th>Proveedor</th><th>Fecha</th><th>Moneda</th><th>Estado</th></tr></thead><tbody>
      {list.map(i => <tr key={i.id}><td><Link to={'/importaciones/' + i.id}>{i.code}</Link></td><td>{i.suppliers?.name}</td><td>{i.purchase_date}</td><td>{i.currency}</td><td>{i.status}</td></tr>)}</tbody></table></div></>
}
export function ImportDetail() {
  const { id } = useParams(); const [imp, setImp] = useState<any>(null); const [items, setItems] = useState<any[]>([]); const [exps, setExps] = useState<any[]>([]); const [lots, setLots] = useState<any[]>([]); const [q, setQ] = useState<any>({}); const [err, setErr] = useState('')
  const load = async () => {
    setImp((await supabase.from('imports').select('*,suppliers(name)').eq('id', id).single()).data)
    setItems((await supabase.from('import_items').select('*,products(code,name)').eq('import_id', id)).data || [])
    setExps((await supabase.from('import_expenses').select('*').eq('import_id', id)).data || [])
    setLots((await supabase.from('product_lots').select('*,products(code,name)').eq('import_id', id)).data || [])
  }
  useEffect(() => { load() }, [id])
  const receive = async () => {
    setErr(''); const { error } = await supabase.rpc('receive_import', { p_import: id, p_items: Object.entries(q).map(([item_id, qty]) => ({ item_id, qty: Number(qty) })) })
    if (error) setErr(msg(error)); else { setQ({}); load() }
  }
  const pay = async () => { const a = prompt('Monto a pagar al proveedor (' + imp.currency + ')'); if (!a) return; const { error } = await supabase.rpc('register_payment', { p_dir: 'out', p_ref: id, p_amount: Number(a) }); if (error) setErr(msg(error)); else load() }
  if (!imp) return <p>Cargando…</p>
  const val = items.reduce((s, i) => s + i.qty_ordered * i.unit_price, 0); const canRecv = ['en_transito', 'recepcion_parcial'].includes(imp.status)
  return <><h1>{imp.code} <small className="muted">{imp.status}</small></h1>
    <div className="card">Proveedor: {imp.suppliers?.name || '—'} · Moneda {imp.currency} · T. cambio {imp.exchange_rate} · Valor {money(val)} {imp.currency} · Pagado {money(imp.paid_amount)} <button className="sec" onClick={pay}>Registrar pago</button></div>
    <div className="card"><table><thead><tr><th>Producto</th><th>Pedido</th><th>Recibido</th><th>Pendiente</th><th>Precio</th>{canRecv && <th>Recibir ahora</th>}</tr></thead><tbody>
      {items.map(i => <tr key={i.id}><td>{i.products?.code} {i.products?.name}</td><td>{i.qty_ordered}</td><td>{i.qty_received}</td><td>{i.qty_ordered - i.qty_received}</td><td>{money(i.unit_price)}</td>
        {canRecv && <td><input type="number" step="any" max={i.qty_ordered - i.qty_received} value={q[i.id] ?? ''} onChange={e => setQ({ ...q, [i.id]: e.target.value })} style={{ width: 90 }} /></td>}</tr>)}</tbody></table>
      {canRecv && <p><button onClick={receive}>Confirmar recepción</button></p>}{err && <p className="err">{err}</p>}</div>
    <div className="card"><b>Gastos</b><table><tbody>{exps.map(x => <tr key={x.id}><td>{x.expense_type}</td><td>{money(x.amount)} {x.currency}</td><td>= {money(x.amount_bob)} BOB</td><td>{x.is_cost ? 'entra al costo' : 'no entra al costo'}</td></tr>)}</tbody></table></div>
    <div className="card"><b>Lotes generados</b><table><thead><tr><th>Producto</th><th>Recibido</th><th>Disponible</th><th>Costo unitario (BOB)</th></tr></thead><tbody>{lots.map(l => <tr key={l.id}><td>{l.products?.code} {l.products?.name}</td><td>{l.qty_received}</td><td>{l.qty_available}</td><td>{money(l.unit_cost_bob)}</td></tr>)}</tbody></table></div></>
}
