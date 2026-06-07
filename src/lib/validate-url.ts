// Minimal URL validation. The full sanitizer (`lib/clean-url.ts`, which also strips
// dangerous schemes for event links) is a Session 6 deliverable; until then this
// covers the only Session 3 need: `User.messengerUrl` is **https:// only**
// (see docs/data-model-invariants.md → Privacy invariants).
export function isHttpsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:";
}
