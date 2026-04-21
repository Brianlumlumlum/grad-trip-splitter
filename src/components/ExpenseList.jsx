import { useState } from 'react'
import { formatMoney, roundMoney } from '../utils/money.js'
import { userLabel } from '../utils/userDisplay.js'
import { useToast } from '../context/ToastContext.jsx'

function shareSummary(parts) {
  if (!parts.length) return null
  const shares = parts.map((p) => roundMoney(Number(p.share_amount))).filter((n) => !Number.isNaN(n))
  if (!shares.length) return null
  const lo = Math.min(...shares)
  const hi = Math.max(...shares)
  const n = shares.length
  if (n === 1) return `${formatMoney(lo)} (one person)`
  if (lo === hi) return `${formatMoney(lo)} each · ${n} people`
  return `${formatMoney(lo)}–${formatMoney(hi)} each · ${n} people`
}

export default function ExpenseList({
  expenses,
  participantsByExpenseId,
  session,
  profilesById = {},
  supabase,
  onDeleted,
}) {
  const { showToast } = useToast()
  const [deletingId, setDeletingId] = useState(null)

  const uid = session?.user?.id

  async function deleteExpense(exp) {
    if (!supabase || exp.created_by !== uid) return
    const ok = window.confirm(
      `Delete “${exp.title}” (${formatMoney(exp.amount)})? This updates everyone’s balances.`,
    )
    if (!ok) return
    setDeletingId(exp.id)
    const { error } = await supabase.from('expenses').delete().eq('id', exp.id)
    setDeletingId(null)
    if (error) {
      showToast(error.message, { type: 'error' })
      return
    }
    showToast('Expense removed')
    onDeleted?.()
  }

  if (!expenses?.length) {
    return (
      <div className="empty-state card" style={{ padding: '1.35rem 1rem' }} role="status">
        <div className="empty-state-icon" style={{ width: '2.5rem', height: '2.5rem', marginBottom: '0.75rem' }} />
        <p className="empty-state-title" style={{ fontSize: '0.95rem' }}>
          No expenses yet
        </p>
        <p className="muted small">Add one below — everyone on the trip can log what they paid.</p>
      </div>
    )
  }

  return (
    <ul className="expense-list">
      {expenses.map((exp) => {
        const parts = participantsByExpenseId[exp.id] || []
        const names = parts.map((p) => userLabel(p.user_id, session, profilesById)).join(', ')
        const shareLine = shareSummary(parts)
        const isCreator = uid && exp.created_by === uid
        return (
          <li key={exp.id} className="card expense-row">
            <div className="expense-row-main">
              <div className="expense-title">{exp.title}</div>
              <div className="muted small">
                Paid by {userLabel(exp.paid_by, session, profilesById)}
                {parts.length ? ` · Split: ${names}` : ''}
              </div>
              <div className="muted small expense-row-meta">
                <span>{new Date(exp.created_at).toLocaleString()}</span>
                {isCreator && supabase ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small expense-delete"
                    disabled={deletingId !== null}
                    onClick={() => deleteExpense(exp)}
                  >
                    {deletingId === exp.id ? 'Deleting…' : 'Delete'}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="expense-amount-block">
              <div className="expense-amount-total">
                <span className="muted small">Total </span>
                <span className="expense-amount">{formatMoney(exp.amount)}</span>
              </div>
              {shareLine ? <div className="muted small expense-share-line">{shareLine}</div> : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
