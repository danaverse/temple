import type { Locale } from './lib/altar.js';

export type { Locale };

export const LOCALES: readonly Locale[] = ['en', 'vi', 'zh'];
export const LOCALE_STORAGE_KEY = 'danaverse.locale';

export interface Copy {
  siteName: string;
  tagline: string;
  manifesto: string;
  searchPlaceholder: string;
  searchSubmit: string;
  recentTitle: string;
  emptyRecent: string;
  loadError: string;
  notDana: string;
  notDanaHint: string;
  memorialKind: string;
  remintKind: string;
  genesisKind: string;
  offerings: string;
  remembrance: string;
  birth: string;
  death: string;
  birthPlace: string;
  deathPlace: string;
  funeralPlace: string;
  related: string;
  offerLotus: string;
  recorded: string;
  unconfirmed: string;
  lotusRemint: string;
  bits: string;
  tokenLabel: string;
  home: string;
  langEn: string;
  langVi: string;
  langZh: string;
  noName: string;
  originOffering: string;
  loading: string;
  fragmentNote: string;
}

export const MESSAGES: Record<Locale, Copy> = {
  vi: {
    siteName: 'Danaverse',
    tagline: 'Temple — sổ dâng Dana',
    manifesto:
      'Đốt tiền với thiện ý là hành vi lạ lùng nhất trong lịch sử loài người — một người tự nguyện giảm của cải của mình vì cộng đồng. Hành vi ấy bắt nguồn từ tấm lòng và niềm tin vào những người khác.',
    searchPlaceholder: 'Tìm theo tên tưởng nhớ…',
    searchSubmit: 'Tìm',
    recentTitle: 'Dâng gần đây',
    emptyRecent: 'Chưa có dâng hoa được ghi.',
    loadError: 'Không tải được sổ. Thử lại sau.',
    notDana:
      'Đây không phải dâng hoa hoặc lần nở sen Dana.',
    notDanaHint:
      'Temple chỉ hiện thông điệp Dana đã giải mã — không liệt kê giao dịch không liên quan.',
    memorialKind: 'Dâng hoa tưởng nhớ',
    remintKind: 'Sen nở lại',
    genesisKind: 'Gốc token',
    offerings: '{n} lần dâng',
    remembrance: 'Lời tưởng nhớ',
    birth: 'Sinh',
    death: 'Mất',
    birthPlace: 'Quê',
    deathPlace: 'Nơi mất',
    funeralPlace: 'Nơi an nghỉ',
    related: 'Liên hệ',
    offerLotus: 'Dâng sen trên W Lotus',
    recorded: 'Ghi lúc',
    unconfirmed: 'Đang ghi',
    lotusRemint: 'Một đóa sen được nở lại bằng công PoW — không phải chuyển khoản.',
    bits: 'Độ khó',
    tokenLabel: 'Hoa sen',
    home: 'Danaverse',
    langEn: 'EN',
    langVi: 'VI',
    langZh: '中文',
    noName: 'Dâng hoa',
    originOffering: 'Gốc',
    loading: 'Đang mở sổ…',
    fragmentNote: 'Lời dâng thêm',
  },
  en: {
    siteName: 'Danaverse',
    tagline: 'Temple — Dana ledger',
    manifesto:
      'To burn money with good intention is the strangest behavior in humanity’s history — an individual choosing to lessen their property for the community. That act roots in a good heart and faith in other people.',
    searchPlaceholder: 'Search a remembered name…',
    searchSubmit: 'Search',
    recentTitle: 'Recent offerings',
    emptyRecent: 'No offerings recorded yet.',
    loadError: 'Could not load the ledger. Try again shortly.',
    notDana: 'This is not a Dana offering or lotus remint.',
    notDanaHint:
      'Temple only shows decoded Dana messages — it does not list unrelated transactions.',
    memorialKind: 'Memorial offering',
    remintKind: 'Lotus remint',
    genesisKind: 'Lotus origin',
    offerings: '{n} offerings',
    remembrance: 'Remembrance',
    birth: 'Born',
    death: 'Died',
    birthPlace: 'Birthplace',
    deathPlace: 'Place of death',
    funeralPlace: 'Resting place',
    related: 'Related',
    offerLotus: 'Offer a lotus on W Lotus',
    recorded: 'Recorded',
    unconfirmed: 'Pending',
    lotusRemint:
      'A lotus was reminted by proof of work — not a payment, and not a transfer.',
    bits: 'Difficulty bits',
    tokenLabel: 'Lotus',
    home: 'Danaverse',
    langEn: 'EN',
    langVi: 'VI',
    langZh: '中文',
    noName: 'Offering',
    originOffering: 'Origin',
    loading: 'Opening the ledger…',
    fragmentNote: 'Added words',
  },
  zh: {
    siteName: 'Danaverse',
    tagline: 'Temple — 布施簿',
    manifesto:
      '怀着善意烧掉钱，是人类史上最奇特的行为——一个人自愿减损自己的财产，成全共同体。这源于善心，以及对他人的信任。',
    searchPlaceholder: '按纪念姓名搜索…',
    searchSubmit: '搜索',
    recentTitle: '近期供奉',
    emptyRecent: '尚无供奉记录。',
    loadError: '无法打开簿册，请稍后再试。',
    notDana: '这不是 Dana 供奉或莲花再铸。',
    notDanaHint: 'Temple 只展示已解码的 Dana 留言，不列出无关交易。',
    memorialKind: '纪念供奉',
    remintKind: '莲花再铸',
    genesisKind: '莲花源起',
    offerings: '{n} 次供奉',
    remembrance: '追思',
    birth: '生',
    death: '卒',
    birthPlace: '籍贯',
    deathPlace: '卒地',
    funeralPlace: '安息处',
    related: '关系',
    offerLotus: '在 W Lotus 献莲',
    recorded: '记录于',
    unconfirmed: '待确认',
    lotusRemint: '一朵莲花经工作量证明再铸——不是转账。',
    bits: '难度',
    tokenLabel: '莲花',
    home: 'Danaverse',
    langEn: 'EN',
    langVi: 'VI',
    langZh: '中文',
    noName: '供奉',
    originOffering: '本源',
    loading: '正在打开簿册…',
    fragmentNote: '附加寄语',
  },
};

export function detectLocale(
  languages: readonly string[] = [],
): Locale {
  for (const raw of languages) {
    const tag = (raw || '').toLowerCase();
    if (tag.startsWith('vi')) return 'vi';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('en')) return 'en';
  }
  return 'vi';
}

/** Same `?lang=` W Lotus puts on share URLs. Also accepts `locale`. */
export function localeFromSearch(search: string): Locale | null {
  const params = new URLSearchParams(
    search.startsWith('?') ? search : `?${search}`,
  );
  const raw = (params.get('lang') || params.get('locale') || '')
    .trim()
    .toLowerCase();
  const primary = raw.split(/[,;_-]/)[0]?.trim() ?? '';
  if (primary === 'en' || primary === 'vi' || primary === 'zh') return primary;
  return null;
}

export function withLangQuery(path: string, locale: Locale): string {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const qIndex = withoutHash.indexOf('?');
  const pathname = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const search = qIndex >= 0 ? withoutHash.slice(qIndex + 1) : '';
  const params = new URLSearchParams(search);
  params.set('lang', locale);
  return `${pathname}?${params.toString()}${hash}`;
}

export function bootLocale(
  search = '',
  languages: readonly string[] = [],
): Locale {
  return (
    localeFromSearch(search) ||
    readStoredLocale() ||
    detectLocale(languages)
  );
}

export function readStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)?.trim().toLowerCase();
    if (raw === 'en' || raw === 'vi' || raw === 'zh') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function formatCount(template: string, n: number): string {
  return template.replace('{n}', String(n));
}
