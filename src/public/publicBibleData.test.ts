import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { loadPublicBook, resetPublicDataCache } from './publicBibleData';
const manifest=await readFile('public/data/manifest.json');
const genesis=await readFile('public/data/books/Gen.json');
beforeEach(()=>{resetPublicDataCache();vi.stubGlobal('crypto',webcrypto)});
afterEach(()=>vi.unstubAllGlobals());
it('rejects tampered book bytes rather than rendering them',async()=>{
 const tampered=Buffer.from(genesis);tampered[tampered.length-2]^=1;
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>new Response(String(input).includes('manifest')?manifest:tampered));
 await expect(loadPublicBook('Gen',{fetcher})).rejects.toThrow('sha256 mismatch');
});
it('retries a failed book request and caches only a valid response',async()=>{
 let attempts=0;
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>{
  if(String(input).includes('manifest'))return new Response(manifest);
  if(++attempts===1)return new Response('unavailable',{status:503});
  return new Response(genesis);
 });
 await expect(loadPublicBook('Gen',{fetcher})).rejects.toThrow('503');
 const book=await loadPublicBook('Gen',{fetcher});
 expect(book.bookId).toBe('Gen');
 expect(await loadPublicBook('Gen',{fetcher})).toBe(book);
 expect(attempts).toBe(2);
});
it('rejects a tampered global scripture index',async()=>{
 const {loadPublicSearchIndex}=await import('./publicBibleData');
 const index=await readFile('public/data/search-index.json');
 const corrupt=Buffer.from(index);corrupt[corrupt.length-2]^=1;
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>new Response(String(input).includes('manifest')?manifest:corrupt));
 await expect(loadPublicSearchIndex({fetcher})).rejects.toThrow('search index integrity sha256 mismatch');
});
