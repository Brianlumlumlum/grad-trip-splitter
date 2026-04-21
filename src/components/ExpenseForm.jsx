import { useState, useMemo, useEffect } from 'react'
import { equalShareAmounts } from '../utils/money.js'
import { userLabel } from '../utils/userDisplay.js'
import { useToast } from '../context/ToastContext.jsx'
import { usePet } from '../context/PetContext.jsx'

export default function ExpenseForm({ tripId, members, session, supabase, profilesById = {}, onSaved }) {
  const { showToast } = useToast()
  const { registerExpenseCreated } = usePet()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(() => session?.user?.id || '')
  const [selected, setSelected] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const uid = session?.user?.id

  const memberIds = useMemo(() => members.map((m) => m.user_id), [members])

  useEffect(() => {
    if (uid && !paidBy) setPaidBy(uid)
  }, [uid, paidBy])

  useEffect(() => {
    if (memberIds.length && paidBy && !memberIds.includes(paidBy)) {
      setPaidBy(memberIds.includes(uid) ? uid : memberIds[0])
    }
  }, [memberIds, paidBy, uid])

  const memberKey = [...memberIds].sort().join('|')
  useEffect(() => {
    if (memberIds.length) setSelected(new Set(memberIds))
  }, [memberKey])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(memberIds))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const amt = parseFloat(amount)
    if (!title.trim() || Number.isNaN(amt) || amt <= 0) {
      setError('Enter a title and a valid amount.')
      return
    }
    const participantIds = memberIds.filter((id) => selected.has(id))
    if (participantIds.length === 0) {
      setError('Pick at least one person to split with.')
      return
    }

    setSaving(true)
    const shares = equalShareAmounts(amt, participantIds.length)

    const payer = paidBy || uid
    if (!memberIds.includes(payer)) {
      setError('Choose who paid (must be a trip member).')
      setSaving(false)
      return
    }

    const { data: expRow, error: expErr } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        paid_by: payer,
        created_by: uid,
        title: title.trim(),
        amount: amt,
      })
      .select('id')
      .single()

    if (expErr) {
      setError(expErr.message)
      setSaving(false)
      return
    }

    const rows = participantIds.map((user_id, i) => ({
      expense_id: expRow.id,
      user_id,
      share_amount: shares[i],
    }))

    const { error: partErr } = await supabase.from('expense_participants').insert(rows)

    if (partErr) {
      setError(partErr.message)
      setSaving(false)
      return
    }

    setTitle('')
    setAmount('')
    setSaving(false)
    registerExpenseCreated()
    showToast('Expense added')
    onSaved?.()
  }

  if (!memberIds.length) {
    return <p className="muted">Invite others by sharing the trip—once they join, you can split expenses.</p>
  }

  return (
    <form className="card form expense-form" onSubmit={submit}>
      <h3 className="form-heading">Add expense</h3>
      <p className="muted small">You pay now; the cost is split evenly across everyone you select.</p>

      <label className="label">
        Paid by
        <select
          className="input"
          value={paidBy || uid || ''}
          onChange={(e) => setPaidBy(e.target.value)}
        >
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {userLabel(m.user_id, session, profilesById)}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Title
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dinner, Uber, Misc."
          required
        />
      </label>
      <label className="label">
        Amount
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>

      <div className="label">
        Split between
        <div className="chip-row">
          <button type="button" className="btn btn-ghost btn-small" onClick={selectAll}>
            Select all
          </button>
        </div>
        <ul className="member-checklist">
          {members.map((m) => {
            const id = m.user_id
            const label = userLabel(id, session, profilesById)
            return (
              <li key={id}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={selected.has(id)}
                    onChange={() => toggle(id)}
                  />
                  {label}
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save expense'}
      </button>
    </form>
  )
}
