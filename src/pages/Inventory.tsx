import { useEffect, useState } from 'react'
import { supabase, money } from '../lib/supabase'
import { useAuth } from '../lib/auth'
export default function Inventory() {
  const { isAdmin } = useAuth(); const [st, setSt] = useState<any[]>([]); const [lots, setLots] = useState<any[]>([]); const [mv, setMv] = useState<any[]>([])
  useEffect(() => {
    supabase.from('v_stock').select('*').order('name').then(r => setSt(r.data || []))
    if (isAdmin) {
      supabase.from('product_lots').select('*,products(code,name)').order('created_at', { ascending: false }).then(r => setLots(r.data || []))
      supabase.from('inventory_movements').select('*,products(code,name)').order('created_at', { ascending: false }).limit(100).then(r => setMv(r.data || []))
    }
  }, [isAdmin])
  return <><h1>Inventario</h1><div className="card"><table><thead><tr><th>Código</th><th>Producto</th><th>Stock</th><th>Mínimo</th><th>Unidad</th></tr></thead><tbody>
    {st.map(p => <tr key={p.product_id} className={p.stock <= p.min_stock ? 'low' : ''}><td>{p.code}</td><td>{p.name}</td><td>{p.stock}</td><td>{p.min_stock}</td><td>{p.unit}</td></tr>)}</tbody></table></div>
    {isAdmin && <><div className="card"><b>Lotes</b><table><thead><tr><th>Producto</th><th>Fecha</th><th>Recibido</th><th>Disponible</th><th>Costo unit. (BOB)</th></tr></thead><tbody>
      {lots.map(l => <tr key={l.id}><td>{l.products?.code} {l.products?.name}</td><td>{new Date(l.created_at).toLocaleDateString('es-BO')}</td><td>{l.qty_received}</td><td>{l.qty_available}</td><td>{money(l.unit_cost_bob)}</td></tr>)}</tbody></table></div>
      <div className="card"><b>Últimos movimientos</b><table><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th></tr></thead><tbody>
        {mv.map(m => <tr key={m.id}><td>{new Date(m.created_at).toLocaleString('es-BO')}</td><td>{m.products?.name}</td><td>{m.movement_type}</td><td>{m.qty}</td></tr>)}</tbody></table></div></>}</>
}
