/**
 * Read-only altar note packing (Unit Separator U+001F).
 * Same field order as wLotus `docs/ALTAR.md`.
 *
 * onest.pet (PAW) packs pet memorials in its own 12-slot order instead:
 * species | name | note | breed | birthDate | passingDate | location
 *   | memorialPlace | relationshipType | relatedTxid | kind | dateCalendar
 * with kind `memorial`. Parsed into the same fields below (plus species /
 * breed) so the ledger renders both.
 */

export const ALTAR_SEP = '\u001f';

export type AltarHonorific = '' | 'mr' | 'mrs';
export type AltarRelationshipType = '' | 'spouse' | 'parent' | 'child';
export type Locale = 'en' | 'vi' | 'zh';

export interface AltarRelationshipLink {
  type: Exclude<AltarRelationshipType, ''>;
  relatedTxid: string;
}

export interface AltarFields {
  title: AltarHonorific;
  name: string;
  note: string;
  birthPlace: string;
  birthYear: string;
  deathDate: string;
  deathPlace: string;
  funeralPlace: string;
  relationshipType: AltarRelationshipType;
  relatedTxid: string;
  relationships: AltarRelationshipLink[];
  /** onest.pet only: dog | cat | bird | rabbit | horse | other. */
  species: string;
  /** onest.pet only: free-text breed / description. */
  breed: string;
}

export function emptyAltarFields(): AltarFields {
  return {
    title: '',
    name: '',
    note: '',
    birthPlace: '',
    birthYear: '',
    deathDate: '',
    deathPlace: '',
    funeralPlace: '',
    relationshipType: '',
    relatedTxid: '',
    relationships: [],
    species: '',
    breed: '',
  };
}

export function isAltarPackedNote(raw: string): boolean {
  return raw.includes(ALTAR_SEP);
}

export function normalizeAltarHonorific(
  raw: string | null | undefined,
): AltarHonorific {
  const t = (raw || '').trim().toLowerCase();
  if (t === 'mr' || t === 'mrs') return t;
  return '';
}

export function normalizeAltarRelationshipType(
  raw: string | null | undefined,
): AltarRelationshipType {
  const t = (raw || '').trim().toLowerCase();
  if (t === 'spouse' || t === 's') return 'spouse';
  if (t === 'parent' || t === 'p') return 'parent';
  if (t === 'child' || t === 'c') return 'child';
  return '';
}

export function normalizeAltarRelatedTxid(
  raw: string | null | undefined,
): string {
  const t = (raw || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(t) ? t : '';
}

function linksFromSingular(
  relationshipType: string | null | undefined,
  relatedTxid: string | null | undefined,
): AltarRelationshipLink[] {
  const type = normalizeAltarRelationshipType(relationshipType);
  const txid = normalizeAltarRelatedTxid(relatedTxid);
  if (!type || !txid) return [];
  return [{ type, relatedTxid: txid }];
}

function isTitleFirstWire(parts: string[]): boolean {
  const raw0 = parts[0] ?? '';
  const first = raw0.trim().toLowerCase();
  if (first === 'mr' || first === 'mrs') return true;
  return raw0 === '' && parts.length >= 2;
}

/** onest.pet kind slot for a pet memorial profile (wLotus never writes it). */
function isPetKindWire(parts: string[]): boolean {
  return (parts[10] ?? '').trim().toLowerCase() === 'memorial';
}

export type PetSpecies = '' | 'dog' | 'cat' | 'bird' | 'rabbit' | 'horse' | 'other';

export function normalizePetSpecies(
  raw: string | null | undefined,
): PetSpecies {
  const t = (raw || '').trim().toLowerCase();
  if (
    t === 'dog' ||
    t === 'cat' ||
    t === 'bird' ||
    t === 'rabbit' ||
    t === 'horse' ||
    t === 'other'
  ) {
    return t;
  }
  return '';
}

const PET_SPECIES_EMOJI: Record<Exclude<PetSpecies, ''>, string> = {
  dog: '🐕',
  cat: '🐈',
  bird: '🦜',
  rabbit: '🐇',
  horse: '🐴',
  other: '🐾',
};

/** Localized species with its paw mark — unknown codes show as written. */
export function petSpeciesLabel(
  raw: string | null | undefined,
  locale: Locale = 'vi',
): string {
  const t = (raw || '').trim();
  if (!t) return '';
  const key = normalizePetSpecies(t);
  const emoji = key ? PET_SPECIES_EMOJI[key] : '🐾';
  const name = !key
    ? t
    : locale === 'en'
      ? { dog: 'Dog', cat: 'Cat', bird: 'Bird', rabbit: 'Rabbit', horse: 'Horse', other: 'Other' }[key]
      : locale === 'zh'
        ? { dog: '狗', cat: '猫', bird: '鸟', rabbit: '兔子', horse: '马', other: '其他' }[key]
        : { dog: 'Chó', cat: 'Mèo', bird: 'Chim', rabbit: 'Thỏ', horse: 'Ngựa', other: 'Khác' }[key];
  return `${emoji} ${name}`;
}

export function parseAltarNote(raw: string): AltarFields | null {
  if (!isAltarPackedNote(raw)) return null;
  const parts = raw.split(ALTAR_SEP);
  let fields: AltarFields;
  if (isPetKindWire(parts)) {
    fields = {
      title: '',
      species: (parts[0] ?? '').trim(),
      name: (parts[1] ?? '').trim(),
      note: (parts[2] ?? '').trim(),
      breed: (parts[3] ?? '').trim(),
      birthYear: (parts[4] ?? '').trim(),
      deathDate: (parts[5] ?? '').trim(),
      birthPlace: (parts[6] ?? '').trim(),
      deathPlace: '',
      funeralPlace: (parts[7] ?? '').trim(),
      relationshipType: normalizeAltarRelationshipType(parts[8]),
      relatedTxid: normalizeAltarRelatedTxid(parts[9]),
      relationships: [],
    };
  } else if (isTitleFirstWire(parts)) {
    fields = {
      title: normalizeAltarHonorific(parts[0]),
      name: (parts[1] ?? '').trim(),
      note: (parts[2] ?? '').trim(),
      birthPlace: (parts[3] ?? '').trim(),
      birthYear: (parts[4] ?? '').trim(),
      deathDate: (parts[5] ?? '').trim(),
      deathPlace: (parts[6] ?? '').trim(),
      funeralPlace: (parts[7] ?? '').trim(),
      relationshipType: normalizeAltarRelationshipType(parts[8]),
      relatedTxid: normalizeAltarRelatedTxid(parts[9]),
      relationships: [],
      species: '',
      breed: '',
    };
  } else {
    fields = {
      title: '',
      name: (parts[0] ?? '').trim(),
      note: (parts[1] ?? '').trim(),
      birthPlace: (parts[2] ?? '').trim(),
      birthYear: (parts[3] ?? '').trim(),
      deathDate: (parts[4] ?? '').trim(),
      deathPlace: (parts[5] ?? '').trim(),
      funeralPlace: (parts[6] ?? '').trim(),
      relationshipType: normalizeAltarRelationshipType(parts[7]),
      relatedTxid: normalizeAltarRelatedTxid(parts[8]),
      relationships: [],
      species: '',
      breed: '',
    };
  }
  fields.relationships = linksFromSingular(
    fields.relationshipType,
    fields.relatedTxid,
  );
  return fields;
}

export function altarHonorificLabel(
  title: string | null | undefined,
  locale: Locale = 'vi',
): string {
  const h = normalizeAltarHonorific(title);
  if (!h) return '';
  switch (locale) {
    case 'en':
      return h === 'mrs' ? 'Mrs.' : 'Mr.';
    case 'zh':
      return h === 'mrs' ? '女士' : '先生';
    default:
      return h === 'mrs' ? 'Bà' : 'Ông';
  }
}

export function formatAltarPersonName(
  fields: Pick<AltarFields, 'title' | 'name' | 'note'>,
  locale: Locale = 'vi',
): string {
  const name = (fields.name || fields.note || '').trim();
  if (!name) return '';
  const prefix = altarHonorificLabel(fields.title, locale);
  return prefix ? `${prefix} ${name}` : name;
}

export function memorialDisplayName(
  raw: string,
  locale: Locale = 'vi',
): string {
  const t = raw.trim();
  if (!t) return '';
  const altar = parseAltarNote(t);
  if (!altar) return t;
  return formatAltarPersonName(altar, locale);
}

export function altarBareNameFromNote(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const altar = parseAltarNote(t);
  if (altar) return (altar.name || altar.note || '').trim();
  return t;
}

export function normalizeAltarSearchText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

const SEARCH_HONORIFIC_TOKENS = new Set([
  'ong',
  'ba',
  'mr',
  'mrs',
  'mister',
  'missus',
  '先生',
  '女士',
]);

export function altarSearchTokens(raw: string): string[] {
  return normalizeAltarSearchText(raw)
    .replace(/[.]/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .map(t => t.trim())
    .filter(t => t.length > 0 && !SEARCH_HONORIFIC_TOKENS.has(t));
}

function tokenSubsequenceScore(
  nameTokens: string[],
  queryTokens: string[],
): number {
  if (!queryTokens.length || !nameTokens.length) return 0;
  let i = 0;
  const at: number[] = [];
  for (const qt of queryTokens) {
    let found = -1;
    for (let j = i; j < nameTokens.length; j++) {
      if (nameTokens[j]!.startsWith(qt)) {
        found = j;
        break;
      }
    }
    if (found < 0) return 0;
    at.push(found);
    i = found + 1;
  }
  if (
    queryTokens.length === nameTokens.length &&
    queryTokens.every((t, idx) => nameTokens[idx] === t)
  ) {
    return 3;
  }
  if (at[0] === 0) return 2;
  return 1;
}

/** Exact 3 / prefix 2 / contains-or-skipped-middle 1 / none 0. */
export function altarSearchRelevance(
  name: string,
  query: string,
  bareName?: string,
): number {
  const queryTokens = altarSearchTokens(query);
  if (!queryTokens.length) return 0;
  const qHay = queryTokens.join(' ');

  const score = (raw: string): number => {
    const nameTokens = altarSearchTokens(raw);
    if (!nameTokens.length) return 0;
    const nHay = nameTokens.join(' ');
    let best = 0;
    if (nHay === qHay) best = 3;
    else if (nHay.startsWith(qHay)) best = 2;
    else if (nHay.includes(qHay)) best = 1;
    return Math.max(best, tokenSubsequenceScore(nameTokens, queryTokens));
  };

  let best = score(name);
  const bare = bareName?.trim();
  if (bare) best = Math.max(best, score(bare));
  return best;
}

export function mergeAltarFields(notes: Iterable<string>): AltarFields | null {
  const list = [...notes];
  let merged: AltarFields | null = null;
  for (const raw of list) {
    const parsed = parseAltarNote(raw);
    if (!parsed) continue;
    if (!merged) {
      merged = {
        ...parsed,
        relationships: [],
        relationshipType: '',
        relatedTxid: '',
      };
      continue;
    }
    merged = {
      title: merged.title || parsed.title,
      name: merged.name || parsed.name,
      note: merged.note || parsed.note,
      birthPlace: merged.birthPlace || parsed.birthPlace,
      birthYear: merged.birthYear || parsed.birthYear,
      deathDate: merged.deathDate || parsed.deathDate,
      deathPlace: merged.deathPlace || parsed.deathPlace,
      funeralPlace: merged.funeralPlace || parsed.funeralPlace,
      relationshipType: '',
      relatedTxid: '',
      relationships: [],
      species: merged.species || parsed.species,
      breed: merged.breed || parsed.breed,
    };
  }
  if (!merged) return null;

  const relationships: AltarRelationshipLink[] = [];
  const seen = new Set<string>();
  for (const raw of [...list].reverse()) {
    const parsed = parseAltarNote(raw);
    if (!parsed) continue;
    for (const link of parsed.relationships) {
      const key = `${link.type}:${link.relatedTxid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      relationships.push(link);
    }
  }
  const first = relationships[0];
  return {
    ...merged,
    relationships,
    relationshipType: first?.type ?? '',
    relatedTxid: first?.relatedTxid ?? '',
  };
}

export function remembranceLine(raw: string | null | undefined): string {
  if (!raw) return '';
  const t = raw.trim();
  if (!t) return '';
  const altar = parseAltarNote(t);
  if (altar) return altar.note.trim();
  return t;
}

/** Newest non-empty remembrance among latestNote, burns (newest first), then root. */
export function latestOfferingMessage(group: {
  latestNote?: string | null;
  originalNote?: string | null;
  burns?: Array<{ note?: string | null }>;
}): string {
  const notes = [
    group.latestNote,
    ...(group.burns ?? []).map(b => b.note),
    group.originalNote,
  ];
  for (const raw of notes) {
    const msg = remembranceLine(raw);
    if (msg) return msg;
  }
  return '';
}
