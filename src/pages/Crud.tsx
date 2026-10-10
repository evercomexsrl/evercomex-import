import { useEffect, useState } from 'react'
import { supabase, msg } from '../lib/supabase'
type F = { k: string; l: string; n?: boolean }
function Crud({ table, title, fields, active = true }: { table: string; title: string; fields: F[]; active?: boolean }) {
  const [rows, setRows] = useState<any[]>([]); const [f, setF] = useState<any>({}); const [err, setErr] = useState('')
  const load = async () => { const { data, error } = await supabase.from(table).select('*').order('name'); if (error) setErr(error.message); else setRows(data || []) }
  useEffect(() => { load() }, [])
  const save = async (e: any) => {
    e.preventDefault(); setErr('')
    const body: any = {}; fields.forEach(x => { const v = f[x.k]; body[x.k] = v === '' || v === undefined ? null : x.n ? Number(v) : v })
    const { error } = f.id ? await supabase.from(table).update(body).eq('id', f.id) : await supabase.from(table).insert(body)
    if (error) setErr(msg(error)); else { setF({}); load() }
  }
  const toggle = async (r: any) => { await supabase.from(table).update({ is_active: !r.is_active }).eq('id', r.id); load() }
  return <><h1>{title}</h1>
    <form className="card" onSubmit={save}><div className="row">{fields.map(x => <label key={x.k}>{x.l}<input type={x.n ? 'number' : 'text'} step="any" value={f[x.k] ?? ''} onChange={e => setF({ ...f, [x.k]: e.target.value })} required={x.k === 'name' || x.k === 'code'} /></label>)}
      <button>{f.id ? 'Guardar cambios' : 'Agregar'}</button>{f.id && <button type="button" className="sec" onClick={() => setF({})}>Cancelar</button>}</div>{err && <p className="err">{err}</p>}</form>
    <div className="card"><table><thead><tr>{fields.map(x => <th key={x.k}>{x.l}</th>)}<th></th></tr></thead><tbody>
      {rows.map(r => <tr key={r.id} style={{ opacity: r.is_active === false ? .5 : 1 }}>{fields.map(x => <td key={x.k}>{r[x.k]}</td>)}
        <td><button className="sec" onClick={() => setF(r)}>Editar</button> {active && <button className="sec" onClick={() => toggle(r)}>{r.is_active ? 'Desactivar' : 'Activar'}</button>}</td></tr>)}</tbody></table></div></>
}
export const Products = () => <Crud table="products" title="Productos" fields={[{ k: 'code', l: 'Código' }, { k: 'name', l: 'Nombre' }, { k: 'brand', l: 'Marca' }, { k: 'unit', l: 'Unidad' }, { k: 'barcode', l: 'Cód. barras' }, { k: 'min_stock', l: 'Stock mínimo', n: true }, { k: 'price_retail', l: 'Precio minorista (BOB)', n: true }, { k: 'price_wholesale', l: 'Precio mayorista (BOB)', n: true }]} />
export const Categories = () => <Crud table="categories" title="Categorías" active={false} fields={[{ k: 'name', l: 'Nombre' }]} />
export const Suppliers = () => <Crud table="suppliers" title="Proveedores" fields={[{ k: 'name', l: 'Nombre' }, { k: 'country', l: 'País' }, { k: 'tax_id', l: 'ID fiscal' }, { k: 'phone', l: 'Teléfono' }, { k: 'email', l: 'Correo' }]} />
export const Customers = () => <Crud table="customers" title="Clientes" fields={[{ k: 'name', l: 'Nombre' }, { k: 'tax_id', l: 'NIT/CI' }, { k: 'phone', l: 'Teléfono' }, { k: 'email', l: 'Correo' }, { k: 'address', l: 'Dirección' }, { k: 'credit_limit', l: 'Límite de crédito', n: true }]} />
