// Only use this for reads during startup. Booking creation and holds must never
// be replayed here: their request IDs and receipts govern recovery.
export async function loadBookingRead(read, {isDisposed = () => false, wait = ms => new Promise(resolve => setTimeout(resolve, ms))} = {}) {
 for (let attempt = 0; ; attempt++) {
  try { return await read(); }
  catch (error) {
   const transient = ['AbortError', 'TimeoutError', 'NavigatorLockAcquireTimeoutError'].includes(error?.name)
    || [502, 503, 504].includes(Number(error?.status))
    || /(?:AbortError|TimeoutError):|failed to fetch|fetch failed|networkerror|network request failed|load failed|lock.*(?:timed out|aborted)/i.test(error?.message || '');
   if (attempt >= 1 || !transient || error?.uncertain || isDisposed()) throw error;
   await wait(300);
   if (isDisposed()) throw error;
  }
 }
}
