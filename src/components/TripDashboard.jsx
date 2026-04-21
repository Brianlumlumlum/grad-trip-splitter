import { useState, useEffect, useCallback } from 'react'
import Layout from './Layout.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function TripDashboard({
  supabase,
  session,
  onOpenTrip,
  onShowItinerary,
  onSignOut,
}) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileHint, setProfileHint] = useState('')
  const [profileHintOk, setProfileHintOk] = useState(false)

  const { showToast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('trips')
      .select('id, name, created_at, created_by, trip_members ( user_id )')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setTrips([])
    } else {
      setTrips(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const uid = session?.user?.id

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    ;(async () => {
      setProfileHint('')
      setProfileHintOk(false)
      const { data, error } = await supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle()
      if (cancelled) return
      if (error) {
        setProfileHintOk(false)
        const msg = error.message || ''
        setProfileHint(
          /profiles/i.test(msg) || msg.includes('schema cache') || error.code === '42P01'
            ? 'Run supabase/profiles.sql in the Supabase SQL Editor, then reload this page.'
            : msg,
        )
        setDisplayName('')
      } else if (data?.display_name) {
        setDisplayName(data.display_name)
      } else {
        setDisplayName('')
      }
      setProfileLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [uid, supabase])

  async function saveDisplayName(e) {
    e.preventDefault()
    if (!uid || !displayName.trim()) return
    setProfileSaving(true)
    setProfileHint('')
    const { error } = await supabase.from('profiles').upsert(
      {
        id: uid,
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    setProfileSaving(false)
    if (error) {
      setProfileHintOk(false)
      setProfileHint(error.message)
    } else {
      setProfileHintOk(true)
      setProfileHint('Saved — friends will see this name on splits and balances.')
      showToast('Display name saved')
    }
  }

  async function createTrip(e) {
    e.preventDefault()
    if (!name.trim() || !uid) return
    const tripLabel = name.trim()
    setCreating(true)
    setError('')
    const { data: tripRows, error: tripErr } = await supabase
      .from('trips')
      .insert({ name: name.trim(), created_by: uid })
      .select('id')
      .single()

    if (tripErr) {
      setError(tripErr.message)
      setCreating(false)
      return
    }

    const { error: memErr } = await supabase.from('trip_members').insert({
      trip_id: tripRows.id,
      user_id: uid,
    })

    if (memErr) {
      setError(memErr.message)
      setCreating(false)
      return
    }

    setName('')
    setCreating(false)
    await load()
    showToast(`Trip “${tripLabel}” created`)
  }

  async function joinTrip(trip) {
    setError('')
    const { error: err } = await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: uid,
    })
    if (err) setError(err.message)
    else {
      await load()
      showToast(`Joined “${trip.name}”`)
    }
  }

  async function deleteTrip(trip) {
    if (trip.created_by !== uid) return
    const ok = window.confirm(
      `Delete “${trip.name}”? This removes the trip, expenses, and balances for everyone. This cannot be undone.`,
    )
    if (!ok) return
    setError('')
    const { error: err } = await supabase.from('trips').delete().eq('id', trip.id)
    if (err) setError(err.message)
    else {
      await load()
      showToast('Trip deleted')
    }
  }

  function isMember(trip) {
    return (trip.trip_members || []).some((m) => m.user_id === uid)
  }

  return (
    <Layout
      title="Your trips"
      subtitle="Browse trips from everyone on the app, join, or start a new one."
      actions={
        <div className="top-bar-actions">
          <button type="button" className="btn btn-secondary" onClick={onShowItinerary}>
            Itinerary
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      }
    >
      {session?.user?.email ? (
        <p className="signed-in muted">
          Signed in as <strong>{session.user.email}</strong>
        </p>
      ) : null}

      <section className="section">
        <div className="section-head">
          <span className="section-eyebrow">Profile</span>
          <h2 className="section-title">Your display name</h2>
        </div>
        <p className="muted small">
          This is how friends see you when splitting expenses (not your email).
        </p>
        {profileLoaded ? (
          <form className="form inline-form profile-name-form" onSubmit={saveDisplayName}>
            <input
              className="input"
              placeholder="e.g. Brian"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
            />
            <button className="btn btn-secondary" type="submit" disabled={profileSaving || !displayName.trim()}>
              {profileSaving ? 'Saving…' : 'Save name'}
            </button>
          </form>
        ) : (
          <p className="muted small loading-inline">
            <span className="loading-dot" aria-hidden="true" />
            Loading profile…
          </p>
        )}
        {profileHint ? (
          <p className={`form-message profile-hint${profileHintOk ? ' success-hint' : ''}`}>{profileHint}</p>
        ) : null}
      </section>

      <section className="section">
        <div className="section-head">
          <span className="section-eyebrow">New</span>
          <h2 className="section-title">Create a trip</h2>
        </div>
        <form className="form inline-form" onSubmit={createTrip}>
          <input
            className="input"
            placeholder="Trip name (e.g. Costa Rica 2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={creating || !name.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <section className="section">
        <div className="section-head">
          <span className="section-eyebrow">Trips</span>
          <h2 className="section-title">All trips</h2>
        </div>
        {loading ? (
          <ul className="skeleton-list" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <li key={i} className="card skeleton-card">
                <div className="skeleton-line w-60" />
                <div className="skeleton-line sm" />
              </li>
            ))}
          </ul>
        ) : trips.length === 0 ? (
          <div className="card empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true" />
            <p className="empty-state-title">No trips yet</p>
            <p className="muted small">Create one above and have friends join the same list.</p>
          </div>
        ) : (
          <ul className="trip-list">
            {trips.map((t) => {
              const member = isMember(t)
              const count = (t.trip_members || []).length
              return (
                <li key={t.id} className="card trip-card card-interactive">
                  <div className="trip-card-body">
                    <span className="trip-card-icon" aria-hidden="true">
                      ✈
                    </span>
                    <div>
                      <h3 className="trip-name">{t.name}</h3>
                      <p className="muted small">
                        {count} member{count === 1 ? '' : 's'}
                        {member ? ' · You’re in this trip' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="trip-card-actions">
                    {member ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => onOpenTrip(t.id, t.name)}
                        >
                          Open
                        </button>
                        {t.created_by === uid ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-small trip-delete"
                            onClick={() => deleteTrip(t)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <button type="button" className="btn btn-secondary" onClick={() => joinTrip(t)}>
                        Join trip
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </Layout>
  )
}
