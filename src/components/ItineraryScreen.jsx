import { useState } from 'react'
import Layout from './Layout.jsx'
import { KOREA, JAPAN, CHINA } from '../data/gradTripItinerary.js'

const COUNTRIES = [
  { id: 'korea', label: 'Korea', data: KOREA },
  { id: 'japan', label: 'Japan', data: JAPAN },
  { id: 'china', label: 'China', data: CHINA },
]

const FLIGHT_COLS = [
  'Departure date',
  'From',
  'Departure time',
  'Arrival date',
  'To',
  'Arrival time',
]

const AIRBNB_COLS = [
  'Check in',
  'Check out',
  'Stay',
  'Check in time',
  'Check out time',
  'Address',
  'Phone number',
]

function FlightTable({ rows }) {
  return (
    <div className="itinerary-table-wrap">
      <table className="itinerary-table">
        <thead>
          <tr>
            {FLIGHT_COLS.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AirbnbTable({ rows }) {
  const hasPhone = rows.some((r) => r[6])
  const cols = hasPhone ? AIRBNB_COLS : AIRBNB_COLS.slice(0, -1)
  const safeRows = rows.length ? rows : [Array.from({ length: cols.length }, () => '')]
  return (
    <div className="itinerary-table-wrap">
      <table className="itinerary-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => (
            <tr key={i}>
              {cols.map((_, j) => (
                <td key={j}>{r[j] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DaysTable({ days }) {
  return (
    <div className="itinerary-table-wrap itinerary-table-wrap--wide">
      <table className="itinerary-table itinerary-table--overview">
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>Activity</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={i} className={`itinerary-row itinerary-row--${d.tone}`}>
              <td>{d.date}</td>
              <td>{d.day}</td>
              <td>{d.activity}</td>
              <td>{d.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ItineraryScreen({ onBack }) {
  const [country, setCountry] = useState('korea')
  const block = COUNTRIES.find((c) => c.id === country)?.data

  return (
    <Layout
      title="Grad trip itinerary"
      subtitle="Korea → Japan → China"
      onBack={onBack}
    >
      <div className="itinerary-screen">
        <div className="itinerary-country-tabs" role="tablist" aria-label="Country">
          {COUNTRIES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={country === id}
              className={`itinerary-tab${country === id ? ' itinerary-tab--active' : ''}`}
              onClick={() => setCountry(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {block ? (
          <>
            <header className="itinerary-banner">
              <h2 className="itinerary-banner-title">{block.title}</h2>
              <p className="itinerary-banner-sub">{block.subtitle}</p>
            </header>

            <section className="itinerary-section">
              <h3 className="itinerary-section-head">Flight / train information</h3>
              <FlightTable rows={block.flights} />
            </section>

            <section className="itinerary-section">
              <h3 className="itinerary-section-head">Airbnb / hotel information</h3>
              <AirbnbTable rows={block.airbnb} />
            </section>

            <section className="itinerary-section">
              <h3 className="itinerary-section-head">Travel overview</h3>
              <DaysTable days={block.days} />
            </section>
          </>
        ) : null}
      </div>
    </Layout>
  )
}
