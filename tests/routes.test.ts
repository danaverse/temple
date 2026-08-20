import { describe, expect, it } from 'vitest';
import {
  canonicalPath,
  offeringPath,
  parseRoute,
} from '../src/lib/routes.js';

const ID = '154d229bab3cf228a2d40b507e1fc5f21a09542ec66776d3e797b455ab77a091';

describe('routes', () => {
  it('uses /offering/:id as the public path, not /tx/', () => {
    expect(offeringPath(ID)).toBe(`/offering/${ID}`);
    expect(parseRoute(`/offering/${ID}`)).toEqual({
      page: 'offering',
      txid: ID,
    });
    expect(canonicalPath({ page: 'offering', txid: ID })).toBe(
      `/offering/${ID}`,
    );
  });

  it('still opens /tx/:id and bare /:id as the same offering', () => {
    expect(parseRoute(`/tx/${ID}`)).toEqual({ page: 'offering', txid: ID });
    expect(parseRoute(`/${ID}`)).toEqual({ page: 'offering', txid: ID });
    expect(canonicalPath(parseRoute(`/tx/${ID}`))).toBe(`/offering/${ID}`);
  });

  it('keeps search on the home ledger, not a block list', () => {
    expect(parseRoute('/', '?q=Quả')).toEqual({ page: 'home', query: 'Quả' });
    expect(parseRoute('/address/ecash:qxyz')).toEqual({ page: 'home', query: '' });
  });
});
