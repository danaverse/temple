import { describe, expect, it } from 'vitest';
import { danaTipV4Pushdata, memorialPushdata } from '../src/lib/dana.js';
import { emppScriptHex } from '../src/lib/empp.js';
import {
  classifyTx,
  visibleCompanionTxids,
  type ExplorerTx,
} from '../src/lib/classify.js';

const TX = 'd0efd170f98973f03c7bb0ad7457192c8e6a9f63eeca37f162ad4417de77f23b';
const OTHER = '1111111111111111111111111111111111111111111111111111111111111111';
const TOKEN = '154d229bab3cf228a2d40b507e1fc5f21a09542ec66776d3e797b455ab77a091';

function tx(partial: Partial<ExplorerTx> & Pick<ExplorerTx, 'txid'>): ExplorerTx {
  return partial;
}

describe('classifyTx', () => {
  it('treats DANA memorial burns as memorials and lists only star companions', () => {
    const classified = classifyTx(
      tx({
        txid: TX,
        outputs: [{ outputScript: emppScriptHex([memorialPushdata('hi')]) }],
        tokenEntries: [{ tokenId: TOKEN, txType: 'BURN' }],
      }),
    );
    expect(classified.kind).toBe('memorial');
    expect(classified.memorial?.note).toBe('hi');
    expect(visibleCompanionTxids(classified, [TX, OTHER])).toEqual([OTHER]);
  });

  it('treats DANA tip v4 as a remint, not a payment list', () => {
    const classified = classifyTx(
      tx({
        txid: TX,
        outputs: [
          {
            outputScript: emppScriptHex([
              danaTipV4Pushdata({ bits: 3, extraBits: 0, locktime: 1 }),
            ]),
          },
        ],
        tokenEntries: [{ tokenId: TOKEN, txType: 'MINT' }],
      }),
    );
    expect(classified.kind).toBe('remint');
    expect(classified.tip?.bits).toBe(3);
    expect(visibleCompanionTxids(classified, [OTHER])).toEqual([]);
  });

  it('does not invent related txs for ordinary eCash payments', () => {
    const classified = classifyTx(
      tx({
        txid: TX,
        outputs: [{ outputScript: '76a91400ac' }],
        tokenEntries: [{ tokenId: TOKEN, txType: 'NONE' }],
      }),
    );
    expect(classified.kind).toBe('other');
    expect(visibleCompanionTxids(classified, [OTHER, TOKEN])).toEqual([]);
  });
});
