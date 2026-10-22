import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children, tipoEsperado }) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const tipoUsuario = String(
    localStorage.getItem('tipo_usuario') || sessionStorage.getItem('tipo_usuario') || ''
  ).trim().toLowerCase()
  
  if (!token) {
    return <Navigate to="/" replace />
  }
  
  const tiposPermitidos = (Array.isArray(tipoEsperado) ? tipoEsperado : [tipoEsperado])
    .filter(Boolean)
    .map((tipo) => String(tipo).trim().toLowerCase())

  if (tipoEsperado && !tiposPermitidos.includes(tipoUsuario)) {
    const destino = tipoUsuario === 'root'
      ? '/home-root'
      : tipoUsuario === 'admin' ? '/home-admin' : '/home-alunos'
    return <Navigate to={destino} replace />
  }
  
  return children
}

export default ProtectedRoute