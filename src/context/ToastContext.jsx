import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, opts = {}) => {
    const id = uid()
    const type = opts.type === 'error' ? 'error' : 'success'
    setToasts((prev) => [...prev, { id, message, type }])
    const ms = typeof opts.duration === 'number' ? opts.duration : 4000
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, ms)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions">
        <ul className="toast-stack">
          {toasts.map((t) => (
            <li key={t.id} className={`toast toast-${t.type}`} role="status">
              <span className="toast-text">{t.message}</span>
              <button
                type="button"
                className="toast-dismiss"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return { showToast: () => {} }
  return ctx
}
