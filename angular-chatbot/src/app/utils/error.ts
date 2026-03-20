/** Extract user-friendly error message from API error response */
export function getErrorMessage(err: { error?: { detail?: unknown } }): string {
  const detail = err?.error?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first?.msg) return first.msg;
    if (typeof first === 'string') return first;
  }
  return 'An error occurred. Please try again.';
}
