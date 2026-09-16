import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {PublicApp,resourcesForBook,type PublicAppLoaders} from './PublicApp';
import type {PublicBookPayload,PublicDataManifest} from './publicData';
vi.mock('../core/components/ReaderView',()=>({ReaderView:({resources,onRequestBook}:any)=><div>
 <output>{resources.map((r:any)=>r.title).join(',')}</output>
 <button onClick={()=>void onRequestBook('John').catch(()=>{})}>Load John</button>
 <button onClick={()=>void onRequestBook('Rev').catch(()=>{})}>Load Rev</button>
 </div>}));
function book(id:string):PublicBookPayload{return {schemaVersion:2,bookId:id,cuvVerses:[],kjvVerses:[],imageCards:[],textCards:[{id:`${id}-card`,type:'commentary',title:`${id} card`,body:'Text',verses:[`${id}.1.1`],primaryAnchor:`${id}.1.1`,summary:'Summary',bookIntro:id,page:7,sourceLabel:'Source'}]}}
const manifest={schemaVersion:2,releaseVersion:'0.3.0',books:['Gen','John','Rev'].map(id=>({id}))} as PublicDataManifest;
const defaults=():PublicAppLoaders=>({loadManifest:vi.fn(async()=>manifest),loadSearchIndex:vi.fn(async()=>[]),loadBook:vi.fn(async id=>book(id))});
beforeEach(()=>localStorage.clear());afterEach(()=>cleanup());
describe('public navigation integration',()=>{
 it('preserves the source fields needed by intro and linked card rendering',()=>{
  expect(resourcesForBook(book('Gen'))[0]).toMatchObject({primaryAnchor:'Gen.1.1',summary:'Summary',bookIntro:'Gen',debugMeta:{page:7},source:'Source'});
 });
 it('retains current content after load failure and recovers on retry',async()=>{
  const loaders=defaults();let johnAttempts=0;
  loaders.loadBook=vi.fn(async id=>{if(id==='John'&&++johnAttempts===1)throw new Error('network unavailable');return book(id)});
  render(<PublicApp loaders={loaders}/>);await screen.findByText('Gen card');
  fireEvent.click(screen.getByText('Load John'));
  expect(await screen.findByRole('alert')).toHaveTextContent('network unavailable');
  expect(screen.getByText('Gen card')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'重试加载 John'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Gen card,John card'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 });
 it('ignores an older response after a newer book request succeeds',async()=>{
  const loaders=defaults();let resolveJohn!:(b:PublicBookPayload)=>void;let resolveRev!:(b:PublicBookPayload)=>void;
  loaders.loadBook=vi.fn(id=>id==='Gen'?Promise.resolve(book(id)):new Promise(resolve=>{if(id==='John')resolveJohn=resolve;else resolveRev=resolve}));
  render(<PublicApp loaders={loaders}/>);await screen.findByText('Gen card');
  fireEvent.click(screen.getByText('Load John'));fireEvent.click(screen.getByText('Load Rev'));
  await act(async()=>resolveRev(book('Rev')));
  expect(screen.getByText('Gen card,Rev card')).toBeInTheDocument();
  await act(async()=>resolveJohn(book('John')));
  expect(screen.getByText('Gen card,Rev card')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 });
});
