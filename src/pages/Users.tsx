import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase, URL, KEY, msg } from '../lib/supabase'
import { useAuth } from '../lib/auth'
export default function Users() {
  const { profile } = useAuth(); const [rows, setRows] = useState<any[]>([]); const [f, setF] = useState<any>({ role: 'employee' }); const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const load = async () => setRows((await supabase.from('profiles').select('*').order('created_at')).data || [])
  useEffect(() => { load() }, [])
  const create = async (e: any) => {
    e.preventDefault(); setErr(''); setOk('')
    const tmp = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'tmp-signup' } })
    const { data, error } = await tmp.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.name } } })
    if (error) return setErr(msg(error))
    if (data.user && f.role === 'admin') await supabase.from('profiles').update({ role: 'admin' }).eq('id', data.user.id)
    setOk('Usuario creado.'); setF({ role: 'employee' }); setTimeout(load, 500)
  }
  const upd = async (id: string, patch: any) => { const { error } = await supabase.from('profiles').update(patch).eq('id', id); if (error) setErr(msg(error)); load() }
  return <><h1>Usuarios</h1><form className="card" onSubmit={create}><div className="row">
    <label>Nombre<input required value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} /></label>
    <label>Correo<input type="email" required value={f.email || ''} onChange={e => setF({ ...f, email: e.target.value })} /></label>
    <label>Contraseña (mín. 6)<input type="password" minLength={6} required value={f.password || ''} onChange={e => setF({ ...f, password: e.target.value })} /></label>
    <label>Rol<select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option value="employee">Empleado</option><option value="admin">Administrador</option></select></label>
    <button>Crear usuario</button></div>{err && <p className="err">{err}</p>}{ok && <p>{ok}</p>}</form>
    <div className="card"><table><thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th></tr></thead><tbody>
      {rows.map(u => <tr key={u.id}><td>{u.full_name}</td><td><select disabled={u.id === profile.id} value={u.role} onChange={e => upd(u.id, { role: e.target.value })}><option value="employee">Empleado</option><option value="admin">Administrador</option></select></td>
        <td>{u.is_active ? 'Activo' : 'Desactivado'} {u.id !== profile.id && <button className="sec" onClick={() => upd(u.id, { is_active: !u.is_active })}>{u.is_active ? 'Desactivar' : 'Activar'}</button>}</td></tr>)}</tbody></table></div></>
}
