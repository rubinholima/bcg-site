import { detectShortcutConflicts } from './analysis-tag-shortcut.util';

describe('analysis-tag-shortcut', () => {
  const tags = [
    { id: 'a', shortcutKey: 'p' },
    { id: 'b', shortcutKey: '1' },
  ];

  it('detecta duplicata', () => {
    expect(detectShortcutConflicts(tags, { id: 'c', shortcutKey: 'p' })).toContain('p');
  });

  it('ignora a própria tag ao editar', () => {
    expect(detectShortcutConflicts(tags, { id: 'a', shortcutKey: 'p' })).toEqual([]);
  });
});
