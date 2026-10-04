import { afterEach, describe, expect, it } from 'vitest';
import { isAllowedRequestOrigin } from '@/lib/zernio/request-origin';

const TUNNEL = 'https://tunnel.example';
const LOCAL = 'http://localhost:3000/api/zernio/settings';

afterEach(() => {
  delete process.env.NEXTAUTH_URL;
});

describe('Zernio mutation origin check', () => {
  it('allows the configured tunnel origin while the request URL is the local listener', () => {
    process.env.NEXTAUTH_URL = TUNNEL;
    expect(isAllowedRequestOrigin(TUNNEL, LOCAL)).toBe(true);
  });

  it('allows same-origin requests without any configured base URL', () => {
    expect(isAllowedRequestOrigin('http://localhost:3000', LOCAL)).toBe(true);
  });

  it('rejects origins that are neither the request nor NEXTAUTH_URL', () => {
    process.env.NEXTAUTH_URL = TUNNEL;
    expect(isAllowedRequestOrigin('https://evil.example', LOCAL)).toBe(false);
    expect(isAllowedRequestOrigin('http://tunnel.example', LOCAL)).toBe(false);
  });

  it('rejects malformed origins', () => {
    process.env.NEXTAUTH_URL = TUNNEL;
    expect(isAllowedRequestOrigin('null', LOCAL)).toBe(false);
    expect(isAllowedRequestOrigin('not a url', LOCAL)).toBe(false);
  });

  it('rejects the tunnel origin when NEXTAUTH_URL does not configure it', () => {
    expect(isAllowedRequestOrigin(TUNNEL, LOCAL)).toBe(false);
  });
});
