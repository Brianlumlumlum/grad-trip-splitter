/** How we show someone when there is no profile row yet. */
export function fallbackLabel(userId) {
  return `User ${String(userId).slice(0, 8)}…`
}

/**
 * @param {string} userId
 * @param {{ user?: { id: string } } | null} session
 * @param {Record<string, string>} profilesById maps user id -> display_name
 */
export function userLabel(userId, session, profilesById) {
  if (session?.user?.id === userId) return 'You'
  const name = profilesById?.[userId]
  if (name && String(name).trim()) return String(name).trim()
  return fallbackLabel(userId)
}

/**
 * @param {*} supabase Supabase client
 * @param {string[]} userIds
 * @returns {Promise<Record<string, string>>}
 */
export async function fetchProfilesMap(supabase, userIds) {
  const ids = [...new Set(userIds)].filter(Boolean)
  if (ids.length === 0) return {}
  const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', ids)
  if (error) throw error
  const map = {}
  for (const row of data || []) {
    map[row.id] = row.display_name
  }
  return map
}
