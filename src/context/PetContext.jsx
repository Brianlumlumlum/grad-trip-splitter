import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const PetContext = createContext(null)

function storageKey(userId) {
  return `grad-trip-pet-expenses-${userId}`
}

function readStoredCount(userId) {
  if (!userId || typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const n = raw != null ? parseInt(raw, 10) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

/** 0 = egg, 1 = hatchling, 2 = traveler, 3 = star */
export function stageFromCount(count) {
  if (count < 5) return 0
  if (count < 15) return 1
  if (count < 30) return 2
  return 3
}

export function PetProvider({ userId, children }) {
  const [count, setCount] = useState(() => readStoredCount(userId))

  useEffect(() => {
    setCount(readStoredCount(userId))
  }, [userId])

  const registerExpenseCreated = useCallback(() => {
    if (!userId) return
    setCount((c) => {
      const next = c + 1
      try {
        localStorage.setItem(storageKey(userId), String(next))
      } catch {
        /* ignore quota */
      }
      return next
    })
  }, [userId])

  const stage = useMemo(() => stageFromCount(count), [count])

  const value = useMemo(
    () => ({ count, stage, registerExpenseCreated }),
    [count, stage, registerExpenseCreated],
  )

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>
}

export function usePet() {
  const ctx = useContext(PetContext)
  if (!ctx) {
    return { count: 0, stage: 0, registerExpenseCreated: () => {} }
  }
  return ctx
}
