/*! SignFlow Demo Analytics — configuration
 *
 *  Analytics are INERT until `key` below is a real PostHog project key.
 *  With key empty: nothing loads, nothing is transmitted, no requests.
 *
 *  ACTIVE since 2026-08-22 (US cloud).
 *
 *  host MUST match the region the account was created in, or events are
 *  silently dropped — no error, no 4xx in the console, just nothing
 *  arriving. This account is US cloud, so the default EU host would have
 *  failed silently.
 *
 *  After changing anything here, bump the ?v= cache-buster on the script
 *  tags (bump-cache.sh) or GitHub Pages will keep serving the old file.
 *
 *  The project API key is designed to be public — it is write-only
 *  ingestion and cannot read your data. It is still worth keeping this
 *  in one file so it is obvious what is live.
 *
 *  replay: set to false to disable session recording entirely while
 *  keeping pageview/tab events. Inputs are masked either way.
 */
window.SF_ANALYTICS = {
  // Publishable project key (phc_): write-only ingestion, cannot read
  // data. Safe in client source. Never put a personal/private key
  // (phx_) here — those can read the whole project.
  key:  'phc_nVtCsCCJQsasPb3oXZZga5nExfBFkFYpwJ4DLK4PBXFV',
  host: 'https://us.i.posthog.com',    // US cloud — must match the account region
  replay: true,
};
