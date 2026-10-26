/** Escape data before interpolating it into HTML text or quoted attributes. */
export const escapeMarkup = (value: unknown): string => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));
