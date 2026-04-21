import { useEffect, useRef, useState, useId } from 'react'
import { usePet } from '../context/PetContext.jsx'

const STAGE_LABELS = ['Sleepy loaf', 'Lil’ bro', 'Fluffy pal', 'Star kitty']

function CuteCat({ stage, blep }) {
  const id = useId().replace(/:/g, '')
  const showTail = stage >= 2
  const showCrown = stage >= 3
  const bigBody = stage >= 1

  return (
    <svg
      className="cute-cat-svg"
      viewBox="0 0 120 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-fur`} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#fefefe" />
          <stop offset="45%" stopColor="#f3f0f7" />
          <stop offset="100%" stopColor="#e8e2ef" />
        </linearGradient>
        <linearGradient id={`${id}-stripe`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c4bcc8" />
          <stop offset="50%" stopColor="#9d94a8" />
          <stop offset="100%" stopColor="#c4bcc8" />
        </linearGradient>
        <linearGradient id={`${id}-pink`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffc8d8" />
          <stop offset="100%" stopColor="#f9a8c6" />
        </linearGradient>
      </defs>

      {showTail && (
        <g className="cute-cat-tail-group">
          <path
            d="M 92 78 Q 108 62 112 82 Q 108 98 94 88"
            stroke={`url(#${id}-stripe)`}
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 92 78 Q 108 62 112 82 Q 108 98 94 88"
            stroke="#f5f2f8"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
        </g>
      )}

      {stage === 0 ? (
        <g className="cute-cat-loaf">
          <g className="cute-cat-ears">
            <path
              d="M 52 29 L 45 42 L 59 40 Z"
              fill={`url(#${id}-fur)`}
              stroke="#3d3550"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 52 33 L 47 39.5 L 57 38.5 Z"
              fill={`url(#${id}-pink)`}
              stroke="#3d3550"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <path
              d="M 68 29 L 61 40 L 75 42 Z"
              fill={`url(#${id}-fur)`}
              stroke="#3d3550"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M 68 33 L 63 38.5 L 73 39.5 Z"
              fill={`url(#${id}-pink)`}
              stroke="#3d3550"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
          </g>
          <ellipse cx="60" cy="72" rx="38" ry="32" fill={`url(#${id}-fur)`} stroke="#3d3550" strokeWidth="2.2" />
          <ellipse cx="60" cy="64" rx="22" ry="18" fill="#f8f6fa" opacity="0.7" />
          <path
            d="M 48 62 Q 54 58 60 62 Q 66 58 72 62"
            stroke="#3d3550"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="52" cy="70" r="4" fill="#fda4af" opacity="0.65" />
          <circle cx="68" cy="70" r="4" fill="#fda4af" opacity="0.65" />
        </g>
      ) : (
        <g className="cute-cat-body">
          {/* Pear-shaped torso (reads as one critter, not stacked orbs) */}
          <ellipse
            cx="60"
            cy="80"
            rx="30"
            ry="24"
            fill={`url(#${id}-fur)`}
            stroke="#3d3550"
            strokeWidth="2.2"
          />
          {/* Ears behind head: tight to crown, tips nearly vertical, bases follow top arc */}
          <g className="cute-cat-ears">
            <path
              d="M 47 5.5 L 37 21 L 55 19.5 Z"
              fill={`url(#${id}-fur)`}
              stroke="#3d3550"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M 47 10 L 41 18.5 L 52 17.5 Z"
              fill={`url(#${id}-pink)`}
              stroke="#3d3550"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M 73 5.5 L 65 19.5 L 83 21 Z"
              fill={`url(#${id}-fur)`}
              stroke="#3d3550"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M 73 10 L 68 17.5 L 79 18.5 Z"
              fill={`url(#${id}-pink)`}
              stroke="#3d3550"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>
          <ellipse cx="60" cy="46" rx="33" ry="29" fill={`url(#${id}-fur)`} stroke="#3d3550" strokeWidth="2.2" />
          <ellipse cx="60" cy="42" rx="12" ry="5" fill={`url(#${id}-stripe)`} opacity="0.32" />
          {blep ? (
            <>
              <circle cx="49" cy="48" r="9.5" fill="#fff" stroke="#3d3550" strokeWidth="1.8" />
              <circle cx="71" cy="48" r="9.5" fill="#fff" stroke="#3d3550" strokeWidth="1.8" />
              <circle cx="50.5" cy="49" r="5" fill="#3d2d4a" />
              <circle cx="69.5" cy="49" r="5" fill="#3d2d4a" />
              <circle cx="52.5" cy="46.5" r="2.2" fill="#fff" opacity="0.95" />
              <circle cx="71.5" cy="46.5" r="2.2" fill="#fff" opacity="0.95" />
              <circle cx="47.5" cy="50" r="1.2" fill="#fff" opacity="0.5" />
              <path
                d="M 57 57.5 L 63 57.5 L 60 61 Z"
                fill={`url(#${id}-pink)`}
                stroke="#3d3550"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M 56 62.5 Q 60 64.2 64 62.5"
                stroke="#3d3550"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <ellipse cx="60" cy="67" rx="3" ry="2" fill="#f9a8c6" stroke="#3d3550" strokeWidth="1" />
            </>
          ) : (
            <>
              <path
                d="M 42 48 Q 49 42 56 48"
                stroke="#3d3550"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 64 48 Q 71 42 78 48"
                stroke="#3d3550"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="48" cy="54" r="4.5" fill="#fda4af" opacity="0.5" />
              <circle cx="72" cy="54" r="4.5" fill="#fda4af" opacity="0.5" />
              <path
                d="M 57 57.5 L 63 57.5 L 60 61 Z"
                fill={`url(#${id}-pink)`}
                stroke="#3d3550"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M 50 58 L 40 56.5 M 50 60 L 38 60 M 50 62 L 40 63.5 M 70 58 L 80 56.5 M 70 60 L 82 60 M 70 62 L 80 63.5"
                stroke="#3d3550"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M 54 62 Q 60 68 66 62"
                stroke="#3d3550"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
          {bigBody && (
            <>
              <ellipse cx="48" cy="96" rx="7" ry="5" fill="#f0ecf5" stroke="#3d3550" strokeWidth="1.5" />
              <ellipse cx="72" cy="96" rx="7" ry="5" fill="#f0ecf5" stroke="#3d3550" strokeWidth="1.5" />
            </>
          )}
        </g>
      )}

      {showCrown && (
        <g className="cute-cat-crown">
          <path
            d="M 42 12 L 48 4 L 54 14 L 60 2 L 66 14 L 72 4 L 78 12 L 76 22 L 44 22 Z"
            fill={`url(#${id}-pink)`}
            stroke="#a16207"
            strokeWidth="1.2"
          />
          <circle cx="48" cy="6" r="2" fill="#fde047" opacity="0.9" />
          <circle cx="72" cy="6" r="2" fill="#fde047" opacity="0.9" />
        </g>
      )}

      {showCrown && (
        <g className="cute-cat-sparkles" opacity="0.85">
          <path d="M 28 18 L 30 24 L 36 22 L 30 26 L 28 32 L 26 26 L 20 22 L 26 24 Z" fill="#fde047" />
          <path d="M 88 20 L 90 26 L 96 24 L 90 28 L 88 34 L 86 28 L 80 24 L 86 26 Z" fill="#7dd3c0" />
        </g>
      )}
    </svg>
  )
}

export default function TripPet() {
  const { count, stage } = usePet()
  const [evolving, setEvolving] = useState(false)
  const [treatHop, setTreatHop] = useState(false)
  const [blep, setBlep] = useState(false)
  const prevStage = useRef(null)
  const prevCount = useRef(count)

  useEffect(() => {
    if (prevStage.current === null) {
      prevStage.current = stage
      return
    }
    if (prevStage.current !== stage) {
      setEvolving(true)
      const t = window.setTimeout(() => setEvolving(false), 1000)
      prevStage.current = stage
      return () => window.clearTimeout(t)
    }
  }, [stage])

  const treatReady = useRef(false)
  useEffect(() => {
    if (!treatReady.current) {
      treatReady.current = true
      prevCount.current = count
      return
    }
    if (count > prevCount.current) {
      setTreatHop(true)
      const t = window.setTimeout(() => setTreatHop(false), 700)
      prevCount.current = count
      return () => window.clearTimeout(t)
    }
    prevCount.current = count
  }, [count])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return undefined
    const timer = window.setInterval(() => setBlep((b) => !b), 2200)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div
      className={`trip-pet-root${evolving ? ' trip-pet-evolving' : ''}${treatHop ? ' trip-pet-treat' : ''}`}
      aria-hidden="true"
    >
      <div className="trip-pet-glow" />
      <div className="trip-pet-stage trip-pet-idle cute-cat-wrap">
        <CuteCat stage={stage} blep={blep && stage >= 1} />
      </div>
      <p className="trip-pet-caption">
        <span className="trip-pet-name">{STAGE_LABELS[stage]}</span>
        <span className="trip-pet-stats muted small">
          {count} expense{count === 1 ? '' : 's'} logged
        </span>
      </p>
    </div>
  )
}
