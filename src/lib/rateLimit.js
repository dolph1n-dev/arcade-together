// Basit IP/cihaz bazlı rate limiting (client-side).
// Brute force koruması için oda kodu deneme sayısını sınırlar.

const STORAGE_KEY = 'arcade_join_attempts'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 10 * 60 * 1000 // 10 dk kilit

function getAttempts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAttempts(attempts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts))
  } catch {}
}

/**
 * Bir deneme kaydeder. Kilitliyse { blocked: true, remainingMs } döner.
 * Aksi halde { blocked: false, attempts } döner.
 */
export function registerAttempt(identifier = 'default') {
  const attempts = getAttempts()
  const now = Date.now()
  const record = attempts[identifier] || { count: 0, firstAttempt: now, lockedUntil: 0 }

  if (record.lockedUntil && now < record.lockedUntil) {
    return { blocked: true, remainingMs: record.lockedUntil - now }
  }

  // Kilit süresi dolmuşsa sayacı sıfırla
  if (record.lockedUntil && now >= record.lockedUntil) {
    record.count = 0
    record.lockedUntil = 0
    record.firstAttempt = now
  }

  record.count += 1

  if (record.count >= MAX_ATTEMPTS && !record.lockedUntil) {
    record.lockedUntil = now + LOCKOUT_MS
    saveAttempts(attempts)
    return { blocked: true, remainingMs: LOCKOUT_MS, attempts: record.count }
  }

  attempts[identifier] = record
  saveAttempts(attempts)
  return { blocked: false, attempts: record.count }
}

export function resetAttempts(identifier = 'default') {
  try {
    const attempts = getAttempts()
    delete attempts[identifier]
    saveAttempts(attempts)
  } catch {}
}
