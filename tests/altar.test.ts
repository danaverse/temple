import { describe, expect, it } from 'vitest';
import { ALTAR_SEP, memorialDisplayName, parseAltarNote } from '../src/lib/altar.js';

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
});
