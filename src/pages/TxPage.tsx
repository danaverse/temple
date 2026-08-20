import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { OfferingRows } from '../components/OfferingRows.js';
import type { Copy, Locale } from '../i18n.js';
import { formatCount } from '../i18n.js';
import {
  formatAltarPersonName,
  memorialDisplayName,
  mergeAltarFields,
  parseAltarNote,
  remembranceLine,
  type AltarFields,
} from '../lib/altar.js';
import { fetchClassifiedTx, fetchTokenInfo } from '../lib/chronik.js';
import type { ClassifiedTx } from '../lib/classify.js';
import { shortTx } from '../lib/classify.js';
import { offerUrl } from '../lib/config.js';
import {
  fetchIndexMemorial,
  fetchIndexRecent,
  type IndexMemorialGroup,
} from '../lib/indexApi.js';
import { offeringPath } from '../lib/routes.js';
import { useIndexPoll } from '../lib/useIndexPoll.js';

function whenLabel(
  t: Copy,
  locale: Locale,
  iso: string | null | undefined,
  unix: number | null | undefined,
): string {
  if (iso) return `${t.recorded} ${new Date(iso).toLocaleString(locale)}`;
  if (unix) return `${t.recorded} ${new Date(unix * 1000).toLocaleString(locale)}`;
  return t.unconfirmed;
}

function AltarDl(props: { t: Copy; altar: AltarFields }) {
  const { t, altar } = props;
  const rows: Array<[string, string]> = [];
  if (altar.note) rows.push([t.remembrance, altar.note]);
  if (altar.birthYear) rows.push([t.birth, altar.birthYear]);
  if (altar.birthPlace) rows.push([t.birthPlace, altar.birthPlace]);
  if (altar.deathDate) rows.push([t.death, altar.deathDate]);
  if (altar.deathPlace) rows.push([t.deathPlace, altar.deathPlace]);
  if (altar.funeralPlace) rows.push([t.funeralPlace, altar.funeralPlace]);
  if (rows.length === 0) return null;
  return (
    <dl className="dl">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

async function loadOffering(txid: string): Promise<{
  classified: ClassifiedTx;
  group: IndexMemorialGroup | null;
  recent: IndexMemorialGroup[];
  tokenMeta: { ticker: string; name: string } | null;
}> {
  const [tx, indexed] = await Promise.all([
    fetchClassifiedTx(txid),
    fetchIndexMemorial(txid).catch(() => null),
  ]);
  let tokenMeta: { ticker: string; name: string } | null = null;
  let recent: IndexMemorialGroup[] = [];
  if (tx.kind === 'genesis' && tx.tokenId) {
    const [meta, rec] = await Promise.all([
      fetchTokenInfo(tx.tokenId),
      fetchIndexRecent(40).catch(() => [] as IndexMemorialGroup[]),
    ]);
    if (meta) tokenMeta = { ticker: meta.ticker, name: meta.name };
    recent = rec.filter(g => g.burns.some(b => b.tokenId === tx.tokenId));
  } else if (tx.kind === 'remint' && tx.tokenId) {
    const meta = await fetchTokenInfo(tx.tokenId);
    if (meta) tokenMeta = { ticker: meta.ticker, name: meta.name };
  }
  return { classified: tx, group: indexed, recent, tokenMeta };
}

export function TxPage(props: {
  t: Copy;
  locale: Locale;
  txid: string;
  onOpen: (path: string) => void;
}) {
  const { t, locale, txid, onOpen } = props;
  const [classified, setClassified] = useState<ClassifiedTx | null>(null);
  const [group, setGroup] = useState<IndexMemorialGroup | null>(null);
  const [recent, setRecent] = useState<IndexMemorialGroup[]>([]);
  const [tokenMeta, setTokenMeta] = useState<{
    ticker: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setGroup(null);
      setRecent([]);
      setTokenMeta(null);
      try {
        const next = await loadOffering(txid);
        if (cancelled) return;
        setClassified(next.classified);
        setGroup(next.group);
        setRecent(next.recent);
        setTokenMeta(next.tokenMeta);
      } catch {
        if (!cancelled) setError(t.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [txid, t.loadError]);

  const silentRefresh = useCallback(async () => {
    try {
      const next = await loadOffering(txid);
      setClassified(next.classified);
      setGroup(next.group);
      setRecent(next.recent);
      setTokenMeta(next.tokenMeta);
      setError(null);
    } catch {
      /* keep the last good page */
    }
  }, [txid]);

  useIndexPoll(silentRefresh, true);

  const altar = useMemo(() => {
    const notes: string[] = [];
    if (group) {
      for (const b of group.burns) {
        if (b.note) notes.push(b.note);
      }
      if (group.originalNote) notes.unshift(group.originalNote);
    } else if (classified?.memorial?.note) {
      notes.push(classified.memorial.note);
    }
    return mergeAltarFields(notes);
  }, [group, classified]);

  const titleName = useMemo(() => {
    if (altar) return formatAltarPersonName(altar, locale) || altar.name;
    const raw = group?.originalNote || classified?.memorial?.note || '';
    return memorialDisplayName(raw, locale);
  }, [altar, group, classified, locale]);

  if (loading) return <p className="status">{t.loading}</p>;
  if (error) return <p className="error">{error}</p>;
  if (!classified) return <p className="error">{t.loadError}</p>;

  if (classified.kind === 'other') {
    return (
      <main>
        <div className="kind">{t.siteName}</div>
        <h1 className="hero-name">{t.notDana}</h1>
        <p className="hint">{t.notDanaHint}</p>
        <p className="txid">{shortTx(txid)}</p>
        <div className="actions">
          <a className="btn" href={offerUrl()}>
            {t.offerLotus}
          </a>
        </div>
      </main>
    );
  }

  if (classified.kind === 'remint') {
    return (
      <main>
        <div className="kind">{t.remintKind}</div>
        <h1 className="hero-name">
          {tokenMeta?.name || tokenMeta?.ticker || t.tokenLabel}
        </h1>
        <p className="hint">{t.lotusRemint}</p>
        {classified.tip ? (
          <dl className="dl">
            <dt>{t.bits}</dt>
            <dd>{classified.tip.bits}</dd>
          </dl>
        ) : null}
        <p className="row-meta">
          {whenLabel(t, locale, null, classified.blockTimestamp)}
        </p>
        {classified.tokenId ? (
          <p>
            <a
              href={offeringPath(classified.tokenId)}
              onClick={e => {
                e.preventDefault();
                onOpen(offeringPath(classified.tokenId!));
              }}
            >
              {tokenMeta?.ticker || t.tokenLabel} {shortTx(classified.tokenId)}
            </a>
          </p>
        ) : null}
        <p className="txid">{txid}</p>
        <div className="actions">
          <a className="btn" href={offerUrl()}>
            {t.offerLotus}
          </a>
        </div>
      </main>
    );
  }

  if (classified.kind === 'genesis') {
    return (
      <main>
        <div className="kind">{t.genesisKind}</div>
        <h1 className="hero-name">
          {tokenMeta?.name || classified.tokenName || t.tokenLabel}
        </h1>
        <p className="hint">
          {tokenMeta?.ticker || classified.tokenTicker || ''}
        </p>
        <p className="hint">{t.notDanaHint}</p>
        <h2>{t.recentTitle}</h2>
        {recent.length === 0 ? <p className="status">{t.emptyRecent}</p> : null}
        <OfferingRows items={recent} locale={locale} t={t} onOpen={onOpen} />
        <p className="txid">{txid}</p>
      </main>
    );
  }

  const packed = altar || (classified.memorial?.note
    ? parseAltarNote(classified.memorial.note)
    : null);
  const starId =
    group?.originalBurnTxid ||
    classified.memorial?.parentBurnTxid ||
    classified.txid;
  const burns = group?.burns ?? [];

  return (
    <main>
      <div className="kind">{t.memorialKind}</div>
      <h1 className="hero-name">{titleName || t.noName}</h1>
      {packed ? <AltarDl t={t} altar={packed} /> : null}
      {!packed && classified.memorial?.note ? (
        <p className="hint">{remembranceLine(classified.memorial.note) || classified.memorial.note}</p>
      ) : null}
      <p className="row-meta">
        {formatCount(t.offerings, group?.totalBurns || burns.length || 1)}
        {' · '}
        {whenLabel(
          t,
          locale,
          group?.at,
          classified.blockTimestamp,
        )}
      </p>
      <div className="actions">
        <a className="btn" href={offerUrl(starId)}>
          {t.offerLotus}
        </a>
      </div>
      {burns.length > 0 ? (
        <>
          <h2>{t.recentTitle}</h2>
          <ul className="list" aria-live="polite">
            {burns.map(b => {
              const extra = (b.note || '').trim();
              const label = extra
                ? memorialDisplayName(extra, locale) || extra
                : b.parentBurnTxid
                  ? t.fragmentNote
                  : t.originOffering;
              return (
                <li key={b.burnTxid}>
                  <div className="card">
                    <div className="row-title">{label}</div>
                    <div className="row-meta">
                      {!b.parentBurnTxid ? `${t.originOffering} · ` : ''}
                      {whenLabel(t, locale, b.timeFirstSeen, b.blockTimestamp)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      <p className="txid">{txid}</p>
    </main>
  );
}
