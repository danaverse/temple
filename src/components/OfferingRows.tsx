import type { Copy, Locale } from '../i18n.js';
import { formatCount } from '../i18n.js';
import { latestOfferingMessage, memorialDisplayName } from '../lib/altar.js';
import type { IndexMemorialGroup } from '../lib/indexApi.js';
import { offeringPath } from '../lib/routes.js';

export function OfferingRows(props: {
  items: IndexMemorialGroup[];
  locale: Locale;
  t: Copy;
  onOpen: (path: string) => void;
  showTime?: boolean;
}) {
  const { items, locale, t, onOpen, showTime } = props;
  return (
    <ul className="list" aria-live="polite">
      {items.map(g => {
        const name = memorialDisplayName(g.originalNote, locale) || t.noName;
        const lastMessage = latestOfferingMessage(g);
        const showMessage = Boolean(lastMessage) && lastMessage !== name;
        return (
          <li key={g.originalBurnTxid}>
            <a
              className="row"
              href={offeringPath(g.originalBurnTxid)}
              onClick={e => {
                e.preventDefault();
                onOpen(offeringPath(g.originalBurnTxid));
              }}
            >
              <div className="row-title">{name}</div>
              {showMessage ? <div className="row-note">{lastMessage}</div> : null}
              <div className="row-meta">
                {formatCount(t.offerings, g.totalBurns)}
                {showTime && g.at
                  ? ` · ${new Date(g.at).toLocaleString(locale)}`
                  : ''}
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
