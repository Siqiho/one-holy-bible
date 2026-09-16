import {readFile} from 'node:fs/promises';
import {describe,it,expect} from 'vitest';
import {validateDoreArtwork} from './validatePublicData.mjs';
const original=JSON.parse(await readFile('public/data/dore-artwork.json','utf8'));
describe('chapter artwork release boundary',()=>{
 it('accepts the selected chapter mapping',()=>expect(validateDoreArtwork(original)).toBe(178));
 for(const [label,change] of [
  ['moving asset reference',v=>{v.entries[0].assetPath=v.entries[0].assetPath.replace(/[a-f0-9]{40}\//,'main/')}],
  ['digest mismatch',v=>{v.entries[0].sha256='0'.repeat(64)}],
  ['private field',v=>{v.entries[0].sourcePdfPath='private-input'}],
  ['impossible chapter',v=>{v.entries[0].chapter=999}],
  ['duplicate chapter',v=>{v.entries.push(v.entries[0])}],
 ])it(`rejects ${label}`,()=>{const v=structuredClone(original);change(v);expect(()=>validateDoreArtwork(v)).toThrow();});
});
