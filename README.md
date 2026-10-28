# evive Cookie Banner (WordPress plugin)

A small consent banner of the evive family, for our own and our customers' WordPress sites. Free, no external
service.

- **Nothing non-essential before consent.** Google Tag Manager is only loaded after the visitor accepts analytics.
  Google Consent Mode v2 starts as "denied". YouTube/Vimeo iframes are sent with `src="about:blank"`, and the real
  address loads only after consent or a click on "Load video" (YouTube then via youtube-nocookie.com). DNS/preconnect
  hints to those hosts are removed.
- **Without video embeds** (setting "Video embeds" off) the banner leaves out the External media category and the sentence about videos.
- **Fair choice.** "Accept all" and "Reject all" look the same. Neither scrolling nor clicking elsewhere counts as
  consent. "Settings" offers per-category toggles: Necessary (always on), Analytics, External media.
- **Changeable.** Any link to `#cookie-settings`, or the shortcode `[evive_cookie_settings]`, reopens the banner.
  Withdrawing analytics removes the `_ga*`, `_gid` and `_gat*` cookies and sets consent back to denied.
- **Choice storage:** the first-party cookie `evive_consent` (necessary, 180 days). Raising the "Consent revision"
  setting asks every visitor again.
- **Languages:** English, Dutch, or the browser language.
- **For other code:** `window.eviveConsent.get('analytics'|'media')`, `.open()`, `.set({...})`, and the event
  `evive:consent` on `document`. `window.invaiseCheckoutAnalyticsConsent` follows the analytics choice for the
  invAIse Checkout plugin.

## Settings → evive Cookie Banner
- **Mode:**
  - Off.
  - Preview: only for a tester who opened a page with `?evive_cb_preview=1`; `=0` stops it.
  - Live: every visitor.
- **Language**, **Google Tag Manager ID**, **Privacy policy URL**, **Video embeds** (hold back yes/no),
  **Consent revision**.

Don't let another plugin insert the same GTM container as well (for example Site Kit's Tag Manager module).

## Updates and releases
Sites get new versions through WordPress itself ("Update available"), via the bundled Plugin Update Checker in GitHub
mode: every GitHub Release of github.com/evive-works/evive-cookie-banner with the asset `evive-cookie-banner.zip`
(folder `evive-cookie-banner/` inside). The process is the same as for the evive Connector (on evive, as root):
1. Commit in `/var/www/modules-dev/github-evive-cookie-banner`.
2. `/var/www/modules-dev/release-wp-plugin.sh evive-cookie-banner X.Y.Z` (bumps the version, tags it, builds `/tmp/evive-cookie-banner.zip`).
3. `/var/www/modules-dev/publish-wp-plugin.sh evive-cookie-banner X.Y.Z "<notes>"` (pushes and creates the GitHub Release).
