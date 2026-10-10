import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { Products, Categories, Suppliers, Customers } from './pages/Crud'
import { Imports, ImportDetail } from './pages/Imports'
import { Sales, NewSale, SaleDetail } from './pages/Sales'
import Inventory from './pages/Inventory'
import Users from './pages/Users'

function Guard({ admin, children }: { admin?: boolean; children: any }) {
  const { profile, loading, isAdmin, signOut } = useAuth()
  if (loading) return <main>Cargando…</main>
  if (!profile) return <Navigate to="/login" replace />
  if (!profile.is_active) { signOut(); return <Navigate to="/login" replace /> }
  if (admin && !isAdmin) return <main><div className="card">No tienes permiso para ver esta sección.</div></main>
  return children
}
function Shell({ children }: { children: any }) {
  const { isAdmin, profile, signOut } = useAuth()
  const links: [string, string, boolean][] = [['/dashboard', 'Panel', false], ['/productos', 'Productos', false], ['/inventario', 'Inventario', false], ['/ventas', 'Ventas', false], ['/clientes', 'Clientes', false], ['/proveedores', 'Proveedores', true], ['/importaciones', 'Importaciones', true], ['/categorias', 'Categorías', true], ['/usuarios', 'Usuarios', true]]
  return <><nav>{links.filter(l => !l[2] || isAdmin).map(l => <NavLink key={l[0]} to={l[0]}>{l[1]}</NavLink>)}<span className="sp" /><span style={{ color: '#fff' }}>{profile?.full_name}</span><button className="sec" onClick={signOut}>Salir</button></nav><main>{children}</main></>
}
const P = (el: any, admin?: boolean) => <Guard admin={admin}><Shell>{el}</Shell></Guard>
export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={P(<Dashboard />)} />
    <Route path="/productos" element={P(<Products />)} />
    <Route path="/categorias" element={P(<Categories />, true)} />
    <Route path="/proveedores" element={P(<Suppliers />, true)} />
    <Route path="/clientes" element={P(<Customers />)} />
    <Route path="/importaciones" element={P(<Imports />, true)} />
    <Route path="/importaciones/nueva" element={P(<Imports />, true)} />
    <Route path="/importaciones/:id" element={P(<ImportDetail />, true)} />
    <Route path="/inventario" element={P(<Inventory />)} />
    <Route path="/ventas" element={P(<Sales />)} />
    <Route path="/ventas/nueva" element={P(<NewSale />)} />
    <Route path="/ventas/:id" element={P(<SaleDetail />)} />
    <Route path="/usuarios" element={P(<Users />, true)} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
}
