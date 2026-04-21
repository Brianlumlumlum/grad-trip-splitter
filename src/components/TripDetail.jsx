import { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from './Layout.jsx'
import ExpenseList from './ExpenseList.jsx'
import ExpenseForm from './ExpenseForm.jsx'
import { fetchProfilesMap } from '../utils/userDisplay.js'

export default function TripDetail({
  supabase,
  session,
  tripId,
  tripName,
  onBack,
  onBalances,
  onShowItinerary,
}) {
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [profilesById, setProfilesById] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const [{ data: memData, error: memErr }, { data: expData, error: expErr }] = await Promise.all([
      supabase.from('trip_members').select('user_id').eq('trip_id', tripId),
      supabase
        .from('expenses')
        .select(
          'id, trip_id, paid_by, created_by, title, amount, created_at, expense_participants ( user_id, share_amount )',
        )
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false }),
    ])

    if (memErr) {
      setError(memErr.message)
      setLoading(false)
      return
    }
    if (expErr) {
      setError(expErr.message)
      setLoading(false)
      return
    }

    setMembers(memData || [])
    setExpenses(expData || [])

    const ids = new Set()
    for (const m of memData || []) ids.add(m.user_id)
    for (const exp of expData || []) {
      ids.add(exp.paid_by)
      if (exp.created_by) ids.add(exp.created_by)
      for (const p of exp.expense_participants || []) ids.add(p.user_id)
    }
    try {
      const map = await fetchProfilesMap(supabase, [...ids])
      setProfilesById(map)
    } catch {
      setProfilesById({})
    }

    setLoading(false)
  }, [supabase, tripId])

  useEffect(() => {
    load()
  }, [load])

  const participantsByExpenseId = useMemo(() => {
    const map = {}
    for (const exp of expenses) {
      map[exp.id] = exp.expense_participants || []
    }
    return map
  }, [expenses])

  const flatExpenses = useMemo(
    () =>
      expenses.map(({ expense_participants, ...rest }) => rest),
    [expenses],
  )

  return (
    <Layout
      title={tripName || 'Trip'}
      subtitle="Expenses for this trip"
      onBack={onBack}
      actions={
        <div className="top-bar-actions">
          <button type="button" className="btn btn-ghost" onClick={onShowItinerary}>
            Itinerary
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onBalances(tripId, tripName)}>
            Balances
          </button>
        </div>
      }
    >
      {error ? <p className="error-banner">{error}</p> : null}
      {loading ? (
        <div className="section" aria-busy="true" aria-label="Loading trip">
          <div className="section-head">
            <span className="section-eyebrow">Activity</span>
            <h2 className="section-title">Expenses</h2>
          </div>
          <ul className="skeleton-list">
            {[1, 2].map((i) => (
              <li key={i} className="card skeleton-card expense-row">
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line w-60" />
                  <div className="skeleton-line sm" />
                </div>
                <div className="skeleton-line" style={{ width: '4rem' }} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <section className="section">
            <div className="section-head">
              <span className="section-eyebrow">Activity</span>
              <h2 className="section-title">Expenses</h2>
            </div>
            <ExpenseList
              expenses={flatExpenses}
              participantsByExpenseId={participantsByExpenseId}
              session={session}
              profilesById={profilesById}
              supabase={supabase}
              onDeleted={load}
            />
          </section>
          <section className="section">
            <ExpenseForm
              key={tripId}
              tripId={tripId}
              members={members}
              session={session}
              supabase={supabase}
              profilesById={profilesById}
              onSaved={load}
            />
          </section>
        </>
      )}
    </Layout>
  )
}
