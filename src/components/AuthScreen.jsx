import { useState } from 'react'

export default function AuthScreen({ supabase, onSignedIn }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm, or sign in if confirmations are disabled.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onSignedIn?.()
      }
    } catch (err) {
      setMessage(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const signupInfo =
    message && (message.toLowerCase().includes('email') || message.toLowerCase().includes('confirm'))

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <p className="auth-badge">Split expenses fairly</p>
        <h1 className="app-title">Grad Trip Splitter</h1>
        <p className="muted">Shared costs, clear balances, fewer transfers.</p>

        <div className="tabs">
          <button
            type="button"
            className={mode === 'signin' ? 'tab active' : 'tab'}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'tab active' : 'tab'}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Email
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="label">
            Password
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {message ? (
            <p className={`form-message${signupInfo ? ' success' : ''}`} role="status">
              {message}
            </p>
          ) : null}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
