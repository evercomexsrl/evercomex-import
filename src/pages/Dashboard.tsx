import { useEffect, useState } from 'react'
import { supabase, money } from '../lib/supabase'
export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState('')
  useEffect(() => { supabase.rpc('dashboard_stats').then(({ data, error }) => error ? setErr(error.message) : setD(data)) }, [])
  if (err) return <p className="err">{err}</p>; if (!d) return <p>Cargando…</p>
  const K = (t: string, v: any, show = true) => show && <div className="card kpi"><span className="muted">{t}</span><b>{v}</b></div>
  const hasCost = d.inventory_value !== null && d.inventory_value !== undefined
  return <><h1>Panel</h1><div className="grid">
    {K('Productos activos', d.products)}{K('Unidades en stock', d.units)}{K('Valor del inventario (BOB)', money(d.inventory_value), hasCost)}
    {K('Ventas de hoy (BOB)', money(d.sales_today))}{K('Ventas del mes (BOB)', money(d.sales_month))}
    {K('Costo de lo vendido, mes (BOB)', money(d.cogs_month), hasCost)}{K('Ganancia bruta del mes (BOB)', money(d.sales_month - d.cogs_month), hasCost)}
    {K('Por cobrar (BOB)', money(d.receivable_bob))}{K('Importaciones en tránsito', d.in_transit)}{K('Productos con stock bajo', d.low_stock)}</div>
    <p className="muted">Ganancia bruta = ventas − costo de los lotes vendidos. No es utilidad neta.</p></>
}
