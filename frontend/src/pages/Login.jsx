import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) await register(email, password, name)
      else await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7f4' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '2.5rem', width: 400, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '0.5px solid #e5e4de' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eeedfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📄</div>
          <span style={{ fontSize: 20, fontWeight: 500, color: '#1a1a18' }}>DocuAI</span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4, color: '#1a1a18' }}>{isRegister ? 'Create account' : 'Welcome back'}</h2>
        <p style={{ color: '#888780', fontSize: 14, marginBottom: '1.5rem' }}>{isRegister ? 'Start analyzing your documents' : 'Sign in to your account'}</p>
        {error && <div style={{ background: '#fcebeb', color: '#a32d2d', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isRegister && <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '10px 12px', borderRadius: 8, border: '0.5px solid #d3d1c7', fontSize: 14, outline: 'none' }} />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '10px 12px', borderRadius: 8, border: '0.5px solid #d3d1c7', fontSize: 14, outline: 'none' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '10px 12px', borderRadius: 8, border: '0.5px solid #d3d1c7', fontSize: 14, outline: 'none' }} />
          <button type="submit" disabled={loading} style={{ padding: '10px', borderRadius: 8, background: '#534ab7', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 4 }}>
            {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 13, color: '#888780' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => setIsRegister(!isRegister)} style={{ color: '#534ab7', cursor: 'pointer', fontWeight: 500 }}>
            {isRegister ? 'Sign in' : 'Create one'}
          </span>
        </p>
      </div>
    </div>
  )
}
