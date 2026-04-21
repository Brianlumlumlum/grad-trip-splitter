import { roundMoney } from './money.js'

const EPS = 0.005

/** Expense-only totals: how much each person paid vs their split shares. */
export function computePaidAndOwed(memberIds, expenses, participantsByExpenseId) {
  const paid = Object.fromEntries(memberIds.map((id) => [id, 0]))
  const owed = Object.fromEntries(memberIds.map((id) => [id, 0]))
  for (const exp of expenses) {
    paid[exp.paid_by] = roundMoney((paid[exp.paid_by] || 0) + Number(exp.amount))
    for (const row of participantsByExpenseId[exp.id] || []) {
      owed[row.user_id] = roundMoney((owed[row.user_id] || 0) + Number(row.share_amount))
    }
  }
  return { paid, owed }
}

/**
 * Build per-user nets from expenses and settlements.
 * Convention: positive net = the group owes you (you paid more than your share).
 */
export function computeUserNets(memberIds, expenses, participantsByExpenseId, settlements) {
  const net = Object.fromEntries(memberIds.map((id) => [id, 0]))

  for (const exp of expenses) {
    const paid = Number(exp.amount)
    net[exp.paid_by] = roundMoney((net[exp.paid_by] || 0) + paid)
    const parts = participantsByExpenseId[exp.id] || []
    for (const row of parts) {
      const share = Number(row.share_amount)
      net[row.user_id] = roundMoney((net[row.user_id] || 0) - share)
    }
  }

  for (const s of settlements) {
    const amt = Number(s.amount)
    net[s.from_user] = roundMoney((net[s.from_user] || 0) + amt)
    net[s.to_user] = roundMoney((net[s.to_user] || 0) - amt)
  }

  return net
}

/**
 * Greedy minimum-transfer settlement (standard Splitwise-style simplification).
 * At most (n-1) payments for n people with zero-sum nets.
 */
export function simplifyDebts(netByUserId) {
  const entries = Object.entries(netByUserId).map(([userId, n]) => ({
    userId,
    net: roundMoney(Number(n)),
  }))

  const creditors = entries
    .filter((e) => e.net > EPS)
    .sort((a, b) => b.net - a.net)
  const debtors = entries
    .filter((e) => e.net < -EPS)
    .map((e) => ({ userId: e.userId, owed: -e.net }))
    .sort((a, b) => b.owed - a.owed)

  const transfers = []
  let i = 0
  let j = 0
  while (i < creditors.length && j < debtors.length) {
    const c = creditors[i]
    const d = debtors[j]
    const pay = roundMoney(Math.min(c.net, d.owed))
    if (pay <= EPS) break
    transfers.push({ fromUserId: d.userId, toUserId: c.userId, amount: pay })
    c.net = roundMoney(c.net - pay)
    d.owed = roundMoney(d.owed - pay)
    if (c.net <= EPS) i += 1
    if (d.owed <= EPS) j += 1
  }

  return transfers
}
