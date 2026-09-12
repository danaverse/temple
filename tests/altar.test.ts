import { describe, expect, it } from 'vitest';
import { ALTAR_SEP, altarSearchRelevance, latestOfferingMessage, memorialDisplayName, mergeAltarFields, normalizePetSpecies, parseAltarNote, petSpeciesLabel, remembranceLine } from '../src/lib/altar.js';

describe('altar note decode', () => {
  it('reads packed title-first wire (explorer.e.cash would show raw bytes)', () => {
    const note = [
      '',
      'Cô Hồn',
      'Cúng Cô Hồn',
      '',
      '',
      '2026-08-27',
    ].join(ALTAR_SEP);
    const altar = parseAltarNote(note);
    expect(altar?.name).toBe('Cô Hồn');
    expect(altar?.note).toBe('Cúng Cô Hồn');
    expect(altar?.deathDate).toBe('2026-08-27');
    expect(memorialDisplayName(note, 'vi')).toBe('Cô Hồn');
  });

  it('keeps a plain memorial sentence as the display name', () => {
    expect(memorialDisplayName('Cầu nguyện', 'vi')).toBe('Cầu nguyện');
    expect(parseAltarNote('Cầu nguyện')).toBeNull();
  });

  it('picks the latest non-empty offering message for recent tiles', () => {
    const packed = ['', 'Cô Hồn', 'Cúng Cô Hồn', '', '', '2026-08-27'].join(
      ALTAR_SEP,
    );
    expect(
      latestOfferingMessage({
        latestNote: '',
        originalNote: packed,
        burns: [{ note: '' }, { note: 'Cầu nguyện' }, { note: packed }],
      }),
    ).toBe('Cầu nguyện');
    expect(remembranceLine(packed)).toBe('Cúng Cô Hồn');
    expect(
      latestOfferingMessage({
        latestNote: packed,
        originalNote: packed,
        burns: [{ note: packed }],
      }),
    ).toBe('Cúng Cô Hồn');
  });

  it('matches family + given when a middle name is skipped', () => {
    expect(altarSearchRelevance('Cao Lâm Quả', 'Cao Quả')).toBe(2);
    expect(altarSearchRelevance('Ông Cao Lâm Quả', 'cao qua')).toBe(2);
    expect(altarSearchRelevance('Nguyễn Thị Mân', 'nguyen man')).toBe(2);
    expect(altarSearchRelevance('Ông Cao Lâm Quả', 'ông')).toBe(0);
  });

  it('reads an onest.pet memorial into the pet slots (Laika)', () => {
    const note = [
      'dog',
      'Laika',
      'Laika forever.',
      '',
      '2010-02-01',
      '',
      '',
      '',
      '',
      '',
      'memorial',
      '',
    ].join(ALTAR_SEP);
    const altar = parseAltarNote(note);
    expect(altar?.species).toBe('dog');
    expect(altar?.name).toBe('Laika');
    expect(altar?.note).toBe('Laika forever.');
    expect(altar?.birthYear).toBe('2010-02-01');
    expect(altar?.deathDate).toBe('');
    expect(memorialDisplayName(note, 'vi')).toBe('Laika');
    expect(remembranceLine(note)).toBe('Laika forever.');
    expect(normalizePetSpecies('dog')).toBe('dog');
    expect(normalizePetSpecies('Ông')).toBe('');
    expect(petSpeciesLabel('dog', 'vi')).toBe('🐕 Chó');
    expect(petSpeciesLabel('dog', 'en')).toBe('🐕 Dog');
    expect(petSpeciesLabel('dog', 'zh')).toBe('🐕 狗');
    const merged = mergeAltarFields([note]);
    expect(merged?.species).toBe('dog');
    expect(merged?.name).toBe('Laika');
  });
});
