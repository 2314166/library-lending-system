/** A READY reservation whose hold window has not run out yet. */
export function holdLive(r: { status: string; holdExpiresAt: string | null }): boolean {
  return r.status === 'READY' && !!r.holdExpiresAt && new Date(r.holdExpiresAt).getTime() > Date.now();
}
/** READY in the database, but the time already passed (the server will pass it to the next member). */
export function holdLapsed(r: { status: string; holdExpiresAt: string | null }): boolean {
  return r.status === 'READY' && !holdLive(r);
}
