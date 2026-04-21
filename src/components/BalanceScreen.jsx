import { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from './Layout.jsx'
import { formatMoney, roundMoney } from '../utils/money.js'
import { computeUserNets, simplifyDebts, computePaidAndOwed } from '../utils/balances.js'
import { userLabel, fetchProfilesMap } from '../utils/userDisplay.js'
import { useToast } from '../context/ToastContext.jsx'

export default function BalanceScreen({ supabase, session, tripId, tripName, onBack, onShowItinerary }) {
  const { showToast } = useToast()
  const [members, setMembers] = useState([])
  const [profilesById, setProfilesById] = useState({})
  const [expenses, setExpenses] = useState([])
  const [settlements, setSettlements] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [settlingIdx, setSettlingIdx] = useState(null)

  const uid = session?.user?.id

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const [memRes, expRes, setRes] = await Promise.all([
      supabase.from('trip_members').select('user_id').eq('trip_id', tripId),
      supabase
        .from('expenses')
        .select('id, paid_by, amount, expense_participants ( user_id, share_amount )')
        .eq('trip_id', tripId),
      supabase.from('settlements').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
    ])

    if (memRes.error) setError(memRes.error.message)
    else if (expRes.error) setError(expRes.error.message)
    else if (setRes.error) setError(setRes.error.message)
    else {
      const mems = memRes.data || []
      setMembers(mems)
      setExpenses(expRes.data || [])
      setSettlements(setRes.data || [])
      const ids = new Set(mems.map((m) => m.user_id))
      for (const s of setRes.data || []) {
        ids.add(s.from_user)
        ids.add(s.to_user)
      }
      try {
        setProfilesById(await fetchProfilesMap(supabase, [...ids]))
      } catch {
        setProfilesById({})
      }
    }
    setLoading(false)
  }, [supabase, tripId])

  useEffect(() => {
    load()
  }, [load])

  const memberIds = useMemo(() => members.map((m) => m.user_id), [members])

  const participantsByExpenseId = useMemo(() => {
    const map = {}
    for (const exp of expenses) {
      map[exp.id] = exp.expense_participants || []
    }
    return map
  }, [expenses])

  const flatExpenses = useMemo(
    () => expenses.map(({ expense_participants, ...rest }) => rest),
    [expenses],
  )

  const { paid: paidMap, owed: owedMap } = useMemo(() => {
    if (!memberIds.length) return { paid: {}, owed: {} }
    return computePaidAndOwed(memberIds, flatExpenses, participantsByExpenseId)
  }, [memberIds, flatExpenses, participantsByExpenseId])

  const nets = useMemo(() => {
    if (!memberIds.length) return {}
    return computeUserNets(memberIds, flatExpenses, participantsByExpenseId, settlements)
  }, [memberIds, flatExpenses, participantsByExpenseId, settlements])

  const transfers = useMemo(() => simplifyDebts(nets), [nets])

  async function recordSettlement(fromUserId, toUserId, amount, idx) {
    setError('')
    setSettlingIdx(idx)
    const { error: err } = await supabase.from('settlements').insert({
      trip_id: tripId,
      from_user: fromUserId,
      to_user: toUserId,
      amount: roundMoney(amount),
    })
    setSettlingIdx(null)
    if (err) setError(err.message)
    else {
      showToast('Payment recorded')
      await load()
    }
  }

  return (
    <Layout
      title="Balances"
      subtitle={tripName || ''}
      onBack={onBack}
      actions={
        <div className="top-bar-actions">
          <button type="button" className="btn btn-ghost" onClick={onShowItinerary}>
            Itinerary
          </button>
        </div>
      }
    >
      {error ? <p className="error-banner">{error}</p> : null}
      {loading ? (
        <div className="section" aria-busy="true" aria-label="Loading balances">
          <ul className="card skeleton-list" style={{ listStyle: 'none', padding: '0.75rem' }}>
            {[1, 2, 3].map((i) => (
              <li key={i} style={{ padding: '0.65rem 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <div className="skeleton-line w-60" />
                <div className="skeleton-line sm" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <section className="section">
            <div className="section-head">
              <span className="section-eyebrow">Overview</span>
              <h2 className="section-title">Summary</h2>
            </div>
            <p className="muted small">
              Positive net means the group owes you (you paid more than your share). We then simplify debts so
              fewer payments settle everyone.
            </p>
            <ul className="card summary-list">
              {memberIds.map((id) => {
                const n = roundMoney(nets[id] || 0)
                const paid = roundMoney(paidMap[id] || 0)
                const owed = roundMoney(owedMap[id] || 0)
                let line
                if (n > 0.005) line = `Net: +${formatMoney(n)} (owed to you)`
                else if (n < -0.005) line = `Net: ${formatMoney(n)} (you owe)`
                else line = `Net: even`
                return (
                  <li key={id} className="summary-row summary-block">
                    <div className="summary-name">{userLabel(id, session, profilesById)}</div>
                    <div className="summary-details muted small">
                      Paid {formatMoney(paid)} · Share {formatMoney(owed)}
                    </div>
                    <div className="summary-net">{line}</div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="section">
            <div className="section-head">
              <span className="section-eyebrow">Settle up</span>
              <h2 className="section-title">Who pays whom</h2>
            </div>
            <p className="muted small" style={{ marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
              Fewest transfers to zero everyone out.
            </p>
            {transfers.length === 0 ? (
              <p className="muted">All settled up. Nice work.</p>
            ) : (
              <ul className="transfer-list">
                {transfers.map((t, idx) => (
                  <li key={`${t.fromUserId}-${t.toUserId}-${idx}`} className="card transfer-row">
                    <div>
                      <strong>
                        {userLabel(t.fromUserId, session, profilesById)} owes{' '}
                        {userLabel(t.toUserId, session, profilesById)}
                      </strong>
                      <div className="transfer-amount">{formatMoney(t.amount)}</div>
                    </div>
                    {t.fromUserId === uid ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        disabled={settlingIdx !== null}
                        onClick={() => recordSettlement(t.fromUserId, t.toUserId, t.amount, idx)}
                      >
                        {settlingIdx === idx ? 'Recording…' : 'I paid this'}
                      </button>
                    ) : (
                      <span className="muted small">Only the payer can record</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {settlements.length > 0 ? (
            <section className="section">
              <div className="section-head">
                <span className="section-eyebrow">History</span>
                <h2 className="section-title">Recorded payments</h2>
              </div>
              <ul className="muted small settlement-history">
                {settlements.map((s) => (
                  <li key={s.id}>
                    {userLabel(s.from_user, session, profilesById)} →{' '}
                    {userLabel(s.to_user, session, profilesById)} ·{' '}
                    {formatMoney(s.amount)} · {new Date(s.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </Layout>
  )
}
