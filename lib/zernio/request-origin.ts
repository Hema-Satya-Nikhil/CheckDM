import { getBaseUrl } from '@/lib/env';

/**
 * Whether an Origin header may perform a state-changing request to a Zernio
 * management route. Two origins are allowed: the origin of the request URL
 * itself (direct access, e.g. http://localhost:3000) and the configured public
 * base URL from NEXTAUTH_URL (access through the tunnel). Behind ngrok the
 * request URL is resolved from the local listener origin while the browser
 * sends the tunnel origin, so neither source alone covers both cases. Every
 * other origin — including a malformed one — is rejected; there is no wildcard.
 */
export function isAllowedRequestOrigin(origin: string, requestUrl: string): boolean {
  let parsedOrigin: string;
  try {
    parsedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }
  try {
    if (parsedOrigin === new URL(requestUrl).origin) return true;
  } catch {
    /* fall through to the configured base URL */
  }
  try {
    return parsedOrigin === new URL(getBaseUrl()).origin;
  } catch {
    return false;
  }
}
