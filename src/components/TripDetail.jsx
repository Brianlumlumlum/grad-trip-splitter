import { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from './Layout.jsx'
import ExpenseList from './ExpenseList.jsx'
import ExpenseForm from './ExpenseForm.jsx'
import { fetchProfilesMap } from '../utils/userDisplay.js'
import { useToast } from '../context/ToastContext.jsx'

export default function TripDetail({
  supabase,
  session,
  tripId,
  tripName,
  onBack,
  onBalances,
  onShowItinerary,
}) {
  const { showToast } = useToast()
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

  const exportRows = useMemo(
    () =>
      expenses.map((exp) => {
        const participants = exp.expense_participants || []
        const participantsPretty = participants
          .map((p) => {
            const name = profilesById[p.user_id] || p.user_id || ''
            return `${name} (${p.share_amount})`
          })
          .join(' | ')
        return {
          trip_id: exp.trip_id || tripId,
          trip_name: tripName || '',
          expense_id: exp.id || '',
          title: exp.title || '',
          amount: exp.amount ?? '',
          paid_by_id: exp.paid_by || '',
          paid_by_name: profilesById[exp.paid_by] || exp.paid_by || '',
          created_by_id: exp.created_by || '',
          created_by_name: profilesById[exp.created_by] || exp.created_by || '',
          created_at_iso: exp.created_at || '',
          participant_count: participants.length,
          participant_shares: participantsPretty,
        }
      }),
    [expenses, profilesById, tripId, tripName],
  )

  function csvCell(value) {
    const s = String(value ?? '')
    const escaped = s.replaceAll('"', '""')
    return `"${escaped}"`
  }

  function downloadBlob(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function exportExpenses() {
    if (!exportRows.length) {
      showToast('No expenses to export', { type: 'error' })
      return
    }
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-')
    const base = (tripName || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const csvHeaders = Object.keys(exportRows[0])
    const csvLines = [
      csvHeaders.map(csvCell).join(','),
      ...exportRows.map((row) => csvHeaders.map((h) => csvCell(row[h])).join(',')),
    ]
    const csv = csvLines.join('\n')
    const csvFilename = `${base}-expenses-${stamp}.csv`

    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function'

    if (canShareFiles) {
      const file = new File([csv], csvFilename, { type: 'text/csv' })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `${tripName || 'Trip'} expenses export`,
            text: 'Expense export CSV',
            files: [file],
          })
          showToast('Export shared')
          return
        } catch {
          // fallback to local file download if user cancels or share fails
        }
      }
    }

    downloadBlob(csvFilename, csv, 'text/csv;charset=utf-8')
    showToast('Expense export downloaded')
  }

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
          <button type="button" className="btn btn-ghost" onClick={exportExpenses}>
            Export
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
