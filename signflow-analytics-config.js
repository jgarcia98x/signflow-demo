/*! SignFlow Demo Analytics — configuration
 *
 *  Analytics are INERT until `key` below is a real PostHog project key.
 *  With key empty: nothing loads, nothing is transmitted, no requests.
 *
 *  To activate (after Gatehouse approval + account creation):
 *    1. key  = the PostHog project API key (starts with 'phc_')
 *    2. host = 'https://eu.i.posthog.com'  (EU cloud)
 *          or 'https://us.i.posthog.com'  (US cloud)
 *       This MUST match the region the account was created in, or
 *       events are silently dropped.
 *    3. Bump the ?v= cache-buster on the script tags (bump-cache.sh).
 *
 *  The project API key is designed to be public — it is write-only
 *  ingestion and cannot read your data. It is still worth keeping this
 *  in one file so it is obvious what is live.
 *
 *  replay: set to false to disable session recording entirely while
 *  keeping pageview/tab events. Inputs are masked either way.
 */
window.SF_ANALYTICS = {
  key:  '',                            // '' = disabled (current state)
  host: 'https://eu.i.posthog.com',
  replay: true,
};
