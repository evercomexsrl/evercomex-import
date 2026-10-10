import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, msg } from '../lib/supabase'
export default function Login() {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const nav = useNavigate()
  const go = async (e: any) => {
    e.preventDefault(); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setErr('Correo o contraseña incorrectos. ' + msg(error)); else nav('/dashboard')
  }
  return <main style={{ maxWidth: 380 }}><h1>Ingresar</h1><form className="card" onSubmit={go}>
    <div className="row"><label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label></div>
    <div className="row"><label>Contraseña<input type="password" value={pw} onChange={e => setPw(e.target.value)} required /></label></div>
    {err && <p className="err">{err}</p>}<button>Ingresar</button></form></main>
}
