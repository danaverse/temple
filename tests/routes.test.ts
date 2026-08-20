import { describe, expect, it } from 'vitest';
import { parseRoute, txPath } from '../src/lib/routes.js';

const ID = '154d229bab3cf228a2d40b507e1fc5f21a09542ec66776d3e797b455ab77a091';

describe('routes', () => {
  it('accepts explorer.e.cash-style /tx/:txid links', () => {
    expect(parseRoute(`/tx/${ID}`)).toEqual({ page: 'tx', txid: ID });
    expect(parseRoute(`/${ID}`)).toEqual({ page: 'tx', txid: ID });
    expect(txPath(ID)).toBe(`/tx/${ID}`);
  });

  it('keeps search on the home ledger, not a block list', () => {
    expect(parseRoute('/', '?q=Quả')).toEqual({ page: 'home', query: 'Quả' });
    expect(parseRoute('/address/ecash:qxyz')).toEqual({ page: 'home', query: '' });
  });
});
