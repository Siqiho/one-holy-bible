import { render,screen,cleanup } from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import {Workbench} from '../core/components/Workbench';
import {defaultWorkbenchLayout} from '../core/domain/layout';
import type {StudyResource} from '../core/domain/resources';
const resource:StudyResource={id:'public-test-card',title:'Original public card',body:'Original body',source:'圣经综合解读',type:'commentary',verses:['Gen.1.1']};
const versions=[{id:'cuv',label:'和合本',language:'zh',verses:[{id:'Gen.1.1' as const,book:'Gen',chapter:1,verse:1,text:'起初'}]}];
afterEach(()=>{cleanup();localStorage.clear()});
it('ignores stored card edits and deletions in read-only mode',()=>{
 localStorage.setItem('one-holy-bible-public-resource-edits',JSON.stringify({[resource.id]:{title:'Tampered',body:'Tampered'}}));
 localStorage.setItem('one-holy-bible-public-deleted-resource-ids',JSON.stringify([resource.id]));
 render(<Workbench readOnly versions={versions} resources={[resource]} initialLayout={defaultWorkbenchLayout}/>);
 expect(screen.getAllByText('Original public card').length).toBeGreaterThan(0);
 expect(screen.queryByText('Tampered')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/编辑.*标题和正文/})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/删除当前/})).not.toBeInTheDocument();
});
it('keeps saved card references from unloaded books',()=>{
 const saved={...defaultWorkbenchLayout,centerCardResourceIdsByBook:{'John.3':['unloaded-card']}};
 localStorage.setItem('one-holy-bible-public-layout',JSON.stringify(saved));
 render(<Workbench readOnly activeBookId="Gen" onRequestBook={()=>{}} versions={versions} resources={[resource]} initialLayout={defaultWorkbenchLayout}/>);
 expect(JSON.parse(localStorage.getItem('one-holy-bible-public-layout')!).centerCardResourceIdsByBook['John.3']).toEqual(['unloaded-card']);
});
