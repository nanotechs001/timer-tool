/** Turn a share path (/r/slug) or full URL into an absolute URL in the browser. */
export function toAbsoluteShareUrl(shareDisplay: string): string {
  if (shareDisplay.startsWith("http://") || shareDisplay.startsWith("https://")) {
    return shareDisplay;
  }
  if (typeof window === "undefined") return shareDisplay;
  const path = shareDisplay.startsWith("/") ? shareDisplay : `/${shareDisplay}`;
  return `${window.location.origin}${path}`;
}
