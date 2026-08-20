/**
 * Read-only altar note packing (Unit Separator U+001F).
 * Same field order as wLotus `docs/ALTAR.md`.
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

export function parseAltarNote(raw: string): AltarFields | null {
  if (!isAltarPackedNote(raw)) return null;
  const parts = raw.split(ALTAR_SEP);
  let fields: AltarFields;
  if (isTitleFirstWire(parts)) {
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
  const altar = parseAltarNote(raw);
  if (altar) return altar.note.trim();
  return '';
}
