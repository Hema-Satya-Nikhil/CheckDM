const ZERNIO_REFERRAL_BASE = "https://zernio.link/diwen";

export function zernioLink({ path = '/', placement }: { path?: string; placement: string }): string {
  if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(path)) throw new Error('Expected a Zernio destination.');
  const url = new URL(path.replace(/^\/+/, ''), `${ZERNIO_REFERRAL_BASE}/`);
  if (!['zernio.link', 'zernio.com', 'docs.zernio.com'].includes(url.hostname) || url.protocol !== 'https:') throw new Error('Expected a Zernio destination.');
  // UTM values are attribution identifiers, not branding: changing them resets
  // the sponsor's existing click/revenue history. Kept from the pre-rebrand
  // name deliberately.
  url.searchParams.set('utm_source', 'openreply');
  url.searchParams.set('utm_medium', 'sponsorship');
  url.searchParams.set('utm_campaign', 'openreply-integration');
  url.searchParams.set('utm_content', placement);
  return url.toString();
}
