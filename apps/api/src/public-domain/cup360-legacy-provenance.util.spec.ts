import {
  CUP360_LEGACY_PROVENANCE_HEADER,
  CUP360_LEGACY_PROVENANCE_NGINX_V1,
  isCup360LegacyProvenanceTrusted,
} from './cup360-legacy-provenance.util';

describe('cup360-legacy-provenance', () => {
  it('aceita apenas nginx-v1', () => {
    expect(
      isCup360LegacyProvenanceTrusted({
        [CUP360_LEGACY_PROVENANCE_HEADER]: CUP360_LEGACY_PROVENANCE_NGINX_V1,
      }),
    ).toBe(true);
    expect(
      isCup360LegacyProvenanceTrusted({
        [CUP360_LEGACY_PROVENANCE_HEADER]: 'forged',
      }),
    ).toBe(false);
  });
});
