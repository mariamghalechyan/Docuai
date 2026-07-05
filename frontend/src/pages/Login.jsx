import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');"

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFE9DA', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{FONT_IMPORT}</style>

      {/* Faint ruled-paper texture in the background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(30,37,48,0.045) 28px)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', width: 420 }}>
        {/* Torn/stamped header tab */}
        <div style={{
          position: 'absolute', top: -14, left: 32, background: '#1E2530', color: '#EFE9DA',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em',
          padding: '5px 12px', borderRadius: '3px 3px 0 0', textTransform: 'uppercase'
        }}>
          Case File · DocuAI
        </div>

        <div style={{
          background: '#FBF9F3', borderRadius: 4, padding: '2.75rem 2.5rem 2.25rem',
          boxShadow: '0 18px 40px -12px rgba(30,37,48,0.28)',
          border: '1px solid #DAD3BF'
        }}>
          <h1 style={{
            fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: '#1E2530',
            margin: 0, marginBottom: 6, letterSpacing: '-0.01em'
          }}>
            {isRegister ? 'Open a new case' : 'Welcome back'}
          </h1>
          <p style={{ color: '#6B6656', fontSize: 14, marginBottom: '1.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>
            {isRegister ? '// register to start analyzing documents' : '// sign in to your workspace'}
          </p>

          {error && (
            <div style={{
              background: '#FBEAE7', color: '#9A3226', borderRadius: 3, padding: '10px 14px',
              fontSize: 13, marginBottom: '1.25rem', borderLeft: '3px solid #C0392B',
              fontFamily: "'IBM Plex Mono', monospace"
            }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isRegister && (
              <Field label="Full name">
                <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="Jordan Blake" />
              </Field>
            )}
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@company.com" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
            </Field>

            <button type="submit" disabled={loading} style={{
              marginTop: 8, padding: '13px', borderRadius: 3, background: '#1E2530', color: '#EFE9DA',
              border: 'none', fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em', opacity: loading ? 0.7 : 1,
              transition: 'transform 0.12s ease'
            }}>
              {loading ? 'Processing…' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: 13, color: '#6B6656' }}>
            {isRegister ? 'Already have a case? ' : "No case on file yet? "}
            <span onClick={() => setIsRegister(!isRegister)} style={{ color: '#1E2530', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              {isRegister ? 'Sign in' : 'Open one'}
            </span>
          </p>
        </div>

        {/* Stamp mark, bottom right of the card */}
        <div style={{
          position: 'absolute', bottom: -16, right: 24, transform: 'rotate(-6deg)',
          border: '2px solid #C0392B', color: '#C0392B', borderRadius: 4,
          padding: '3px 10px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
          fontWeight: 500, letterSpacing: '0.08em', opacity: 0.85, background: 'rgba(251,249,243,0.9)'
        }}>
          AI-INDEXED
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#8A8471', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle = {
  padding: '11px 12px', borderRadius: 3, border: '1px solid #D9D2BC', fontSize: 14,
  outline: 'none', fontFamily: "'Inter', sans-serif", background: '#FBF9F3', color: '#1E2530'
}
