export type NewsletterLink = { token: string; isCurrent: () => boolean };

type FragmentBrowser = Pick<Window, "location" | "history" | "addEventListener" | "removeEventListener">;

// Each same-document link replaces the previous action, including responses
// still in flight. Keep the bearer in memory only and preserve Next's history.
export function subscribeNewsletterFragment(browser: FragmentBrowser, onLink: (link: NewsletterLink) => void, initialToken = ""): () => void {
  let revision = 0;
  const consume = (fallback = "") => {
    const currentRevision = ++revision;
    const value = browser.location.hash ? new URLSearchParams(browser.location.hash.slice(1)).get("token") || "" : fallback;
    const token = /^[A-Za-z0-9_-]{43}$/.test(value) ? value : "";
    if (browser.location.hash || browser.location.search) {
      browser.history.replaceState(browser.history.state, "", browser.location.pathname);
    }
    onLink({ token, isCurrent: () => revision === currentRevision });
  };
  const onHashChange = () => consume();
  browser.addEventListener("hashchange", onHashChange);
  // React's development effect replay may have already removed this fragment.
  // A retained token is eligible only on setup, never on a hashchange event.
  consume(initialToken);
  return () => {
    revision++;
    browser.removeEventListener("hashchange", onHashChange);
  };
}
