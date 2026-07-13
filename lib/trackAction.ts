export async function trackAction(email: string, actionType: string, metadata: Record<string, any> = {}) {
  try {
    // We don't await this if we want it to run entirely in the background without blocking the UI
    fetch('/api/track-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, actionType, metadata }),
      keepalive: true, // ensure it fires even if the page unloads
    }).catch(err => console.error('Failed to track action in background', err));
  } catch (err) {
    console.error('Error initiating action track', err);
  }
}
