import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import AuthScreen from './components/AuthScreen.jsx'
import TripDashboard from './components/TripDashboard.jsx'
import TripDetail from './components/TripDetail.jsx'
import BalanceScreen from './components/BalanceScreen.jsx'
import TripPet from './components/TripPet.jsx'
import ItineraryScreen from './components/ItineraryScreen.jsx'
import { PetProvider } from './context/PetContext.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState({ name: 'dashboard' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) setView({ name: 'dashboard' })
  }, [session])

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return (
      <div className="auth-screen">
        <div className="card auth-card">
          <p className="auth-badge">Setup</p>
          <h1 className="app-title">Configuration needed</h1>
          <p className="muted">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your{' '}
            <code>.env</code> file, then restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <AuthScreen supabase={supabase} />
  }

  const uid = session.user.id

  let body = null
  if (view.name === 'trip') {
    body = (
      <TripDetail
        supabase={supabase}
        session={session}
        tripId={view.tripId}
        tripName={view.tripName}
        onBack={() => setView({ name: 'dashboard' })}
        onBalances={(tripId, tripName) => setView({ name: 'balance', tripId, tripName })}
        onShowItinerary={() => setView({ name: 'itinerary' })}
      />
    )
  } else if (view.name === 'balance') {
    body = (
      <BalanceScreen
        supabase={supabase}
        session={session}
        tripId={view.tripId}
        tripName={view.tripName}
        onBack={() =>
          setView({ name: 'trip', tripId: view.tripId, tripName: view.tripName })
        }
        onShowItinerary={() => setView({ name: 'itinerary' })}
      />
    )
  } else if (view.name === 'itinerary') {
    body = <ItineraryScreen onBack={() => setView({ name: 'dashboard' })} />
  } else {
    body = (
      <TripDashboard
        supabase={supabase}
        session={session}
        onOpenTrip={(tripId, tripName) => setView({ name: 'trip', tripId, tripName })}
        onShowItinerary={() => setView({ name: 'itinerary' })}
        onSignOut={() => supabase.auth.signOut()}
      />
    )
  }

  return (
    <PetProvider userId={uid}>
      {body}
      <TripPet />
    </PetProvider>
  )
}
