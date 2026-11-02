// HTML escaping to prevent XSS (Cross-Site Scripting)
// Kullanıcı üretilen içerikler (nickname, chat mesajı) render etmeden önce temizlenir.

const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * HTML special karakterleri escape eder. XSS koruması için kullanıcı girdisi
 * render etmeden önce bu fonksiyon ile geçirilmelidir.
 */
export function escapeHtml(text) {
  if (text == null) return ''
  return String(text).replace(/[&<>"'`/=]/g, (s) => entityMap[s])
}

/**
 * Nickname için güvenli bir temizleme yapar: HTML escape + uzunluk kısıtlaması.
 */
export function sanitizeNickname(text) {
  if (text == null) return ''
  const cleaned = String(text).trim().slice(0, 16)
  return escapeHtml(cleaned)
}

/**
 * Chat mesajı için güvenli temizleme.
 */
export function sanitizeMessage(text) {
  if (text == null) return ''
  return escapeHtml(String(text).trim())
}
