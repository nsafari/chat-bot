export function loadApiConfig(): () => Promise<void> {
  return () => {
    const base = document.querySelector('base')?.href ?? '/';
    const configUrl = `${base}config.json`;
    return fetch(configUrl)
      .then((r) => (r.ok ? r.json() : {}))
      .then((c: { apiUrl?: string }) => {
        if (typeof c?.apiUrl === 'string') {
          (window as unknown as { __apiBase?: string }).__apiBase = c.apiUrl;
        }
      })
      .catch(() => undefined);
  };
}
