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
      <div className="auth-shell card">
        <section className="auth-hero">
          <p className="auth-badge">Built for group trips</p>
          <h1 className="app-title">Plan boldly. Split fairly. Travel stress-free.</h1>
          <p className="auth-subtext">
            One clean place for friends to track expenses, see balances instantly, and settle up in minutes.
          </p>
          <ul className="auth-benefits" aria-label="Key benefits">
            <li>Real-time shared expenses for your trip crew</li>
            <li>Automatic split math and simplified transfers</li>
          </ul>
        </section>

        <section className="auth-card" aria-label="Sign in form">
          <p className="auth-form-title">Welcome back</p>
          <p className="muted small auth-form-subtitle">Sign in or create an account to start splitting.</p>

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
        </section>
      </div>
    </div>
  )
}
