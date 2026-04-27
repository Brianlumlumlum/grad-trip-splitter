import { useState, useMemo, useEffect } from 'react'
import { equalShareAmounts, formatMoney, roundMoney } from '../utils/money.js'
import { getCadPerUnit } from '../utils/exchangeRates.js'
import { userLabel } from '../utils/userDisplay.js'
import { useToast } from '../context/ToastContext.jsx'
import { usePet } from '../context/PetContext.jsx'
import { isLegacyExpenseSchemaError } from '../utils/expenseSchema.js'

const PAYMENT_CURRENCIES = [
  { value: 'CAD', label: 'CAD — Canadian dollar' },
  { value: 'JPY', label: 'JPY — Japanese yen' },
  { value: 'CNY', label: 'CNY — Chinese yuan (RMB)' },
  { value: 'KRW', label: 'KRW — Korean won' },
]

export default function ExpenseForm({
  tripId,
  members,
  session,
  supabase,
  profilesById = {},
  expenseCurrencySchema = true,
  onSaved,
}) {
  const { showToast } = useToast()
  const { registerExpenseCreated } = usePet()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidCurrency, setPaidCurrency] = useState('CAD')
  const [convertToCad, setConvertToCad] = useState(true)
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

  const fixedCadRate = useMemo(() => {
    if (paidCurrency === 'CAD' || !convertToCad) return null
    return getCadPerUnit(paidCurrency)
  }, [paidCurrency, convertToCad])

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
    const original = parseFloat(amount)
    if (!title.trim() || Number.isNaN(original) || original <= 0) {
      setError('Enter a title and a valid amount.')
      return
    }
    if (paidCurrency !== 'CAD' && !convertToCad) {
      setError('Turn on “Convert to CAD” so splits and balances stay in Canadian dollars, or choose CAD if you already entered that.')
      return
    }
    const participantIds = memberIds.filter((id) => selected.has(id))
    if (participantIds.length === 0) {
      setError('Pick at least one person to split with.')
      return
    }

    const payer = paidBy || uid
    if (!memberIds.includes(payer)) {
      setError('Choose who paid (must be a trip member).')
      return
    }

    let amountCad = roundMoney(original)
    if (paidCurrency !== 'CAD') {
      amountCad = roundMoney(original * getCadPerUnit(paidCurrency))
    }

    setSaving(true)
    const shares = equalShareAmounts(amountCad, participantIds.length)

    const rowFull = {
      trip_id: tripId,
      paid_by: payer,
      created_by: uid,
      title: title.trim(),
      amount: amountCad,
      original_amount: paidCurrency === 'CAD' ? amountCad : original,
      original_currency: paidCurrency,
    }
    const rowLegacy = {
      trip_id: tripId,
      paid_by: payer,
      created_by: uid,
      title: title.trim(),
      amount: amountCad,
    }

    let expRow
    let expErr
    if (expenseCurrencySchema) {
      const ins = await supabase.from('expenses').insert(rowFull).select('id').single()
      expRow = ins.data
      expErr = ins.error
      if (expErr && isLegacyExpenseSchemaError(expErr)) {
        const ins2 = await supabase.from('expenses').insert(rowLegacy).select('id').single()
        expRow = ins2.data
        expErr = ins2.error
      }
    } else {
      const ins = await supabase.from('expenses').insert(rowLegacy).select('id').single()
      expRow = ins.data
      expErr = ins.error
    }

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
    setPaidCurrency('CAD')
    setConvertToCad(true)
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
        Paid in
        <select
          className="input"
          value={paidCurrency}
          onChange={(e) => {
            const v = e.target.value
            setPaidCurrency(v)
            if (v === 'CAD') setConvertToCad(true)
          }}
        >
          {PAYMENT_CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Amount
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min="0.01"
          step={paidCurrency === 'JPY' || paidCurrency === 'KRW' ? '1' : '0.01'}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      {paidCurrency !== 'CAD' ? (
        <label className="check-label" style={{ marginTop: '0.35rem' }}>
          <input
            type="checkbox"
            checked={convertToCad}
            onChange={(e) => setConvertToCad(e.target.checked)}
          />
          Convert to CAD using fixed rates (splits and balances use CAD)
        </label>
      ) : null}
      {paidCurrency !== 'CAD' && convertToCad && fixedCadRate != null ? (
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          {(() => {
            const amt = parseFloat(amount)
            const rateStr =
              fixedCadRate < 0.01 ? fixedCadRate.toFixed(6) : fixedCadRate.toFixed(4)
            if (!Number.isNaN(amt) && amt > 0) {
              return `≈ ${formatMoney(roundMoney(amt * fixedCadRate))} for this expense · 1 ${paidCurrency} = ${rateStr} CAD`
            }
            return `1 ${paidCurrency} = ${rateStr} CAD (edit in code if needed)`
          })()}
        </p>
      ) : null}

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
