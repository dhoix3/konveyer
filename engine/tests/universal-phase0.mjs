import assert from 'node:assert/strict';
import fs from 'node:fs';
import {treeGeometry,wrapCaption,reviewBadge} from '../src/doc/composition.ts';
import {documentaryLayout,intersects,fitActor} from '../src/doc/layout.ts';
import {selectDocumentaryGraphic,readableSources} from '../tools/documentary-semantics.mjs';
import {findPack} from '../tools/knowledge.mjs';import {projectGraphics} from '../tools/project-graphics.mjs';
import {buildProject} from '../tools/script.mjs';import {buildDocumentary,qaDocumentary} from '../tools/documentary.mjs';import {buildPlan} from '../tools/timeline.mjs';
const pack=findPack('Рюриковичи'),graph=projectGraphics(pack);
const select=id=>selectDocumentaryGraphic([pack.claims.find(c=>c.id===id)],graph);
assert.equal(select('moscow-line').mode,'tree');assert.equal(select('oleg').mode,'map');assert.equal(select('ivan4').mode,'timeline');
const unknown={id:'x',text:'Исследуется образец.',date:{value:'неизвестно',precision:'unknown'},sources:[]};
assert.equal(selectDocumentaryGraphic([unknown],{places:[],routes:[],tree:[]}).mode,'evidence');
assert.deepEqual(selectDocumentaryGraphic([unknown],{places:[],routes:[],tree:[]}),selectDocumentaryGraphic([unknown],{places:[],routes:[],tree:[]}));
assert.equal(selectDocumentaryGraphic([{...unknown,text:'Отец и сын описаны в источнике.'}],{places:[],routes:[],tree:[]}).mode,'evidence');
assert.match(reviewBadge('supported',true),/^по источнику · не проверено$/);assert.match(reviewBadge('supported'),/не проверено/);assert.match(reviewBadge('disputed',false),/^спорно · подтверждено редактором$/);
assert.equal(readableSources(pack,['pvl'])[0].title,pack.sources[0].shortTitle);
const project=buildDocumentary(buildProject({id:'semantic',topic:'Рюриковичи',duration:120,voiceMode:'none'}),pack);
const plan=buildPlan('semantic',{projectOverride:project,persist:false,ignoreAudio:true});assert.deepEqual(qaDocumentary(plan).errors,[]);
for(const s of project.scenes){const local=s.claimIds.map(id=>pack.claims.find(c=>c.id===id));assert.equal(s.doc.mode,selectDocumentaryGraphic(local,graph).mode);assert.ok(s.doc.selectionReason);assert.ok(s.actors.length<=4);assert.ok(s.actors.some(a=>project.characters.find(c=>c.id===a.char).anonymous));assert.ok(s.doc.events.every(e=>pack.claims.some(c=>c.text===e.label)));assert.ok(s.doc.sourceRefs.every(r=>pack.sources.some(p=>(p.shortTitle||p.title)===r.title)));}
assert.ok(plan.scenes.every(s=>s.doc.subjects.every(c=>c.sources!==pack.claims.find(p=>p.id===c.id).sources.join(', '))));
const trees=[graph.tree,[{id:'r',name:'Родитель',years:'',parent:null},{id:'b',name:'Б',years:'',parent:'r'},{id:'a',name:'А',years:'',parent:'r'},{id:'c',name:'В',years:'',parent:'a'}]];
function segmentHitsRect(a,b,r){if(a.x===b.x)return a.x>r.x&&a.x<r.x+r.w&&Math.max(a.y,b.y)>r.y&&Math.min(a.y,b.y)<r.y+r.h;if(a.y===b.y)return a.y>r.y&&a.y<r.y+r.h&&Math.max(a.x,b.x)>r.x&&Math.min(a.x,b.x)<r.x+r.w;throw new Error('edge must be orthogonal');}
for(const nodes of trees){const t=treeGeometry(nodes);for(const c of t.cards){assert.ok(c.box.y+c.box.h<=640);for(const other of t.cards)if(c.id!==other.id)assert.equal(intersects(c.box,other.box),false);}for(const e of t.edges)for(let i=1;i<e.points.length;i++)for(const c of t.cards)assert.equal(segmentHitsRect(e.points[i-1],e.points[i],c.box),false);}
for(const [w,h]of [[1920,1080],[1080,1920],[1080,1080]]){const l=documentaryLayout(w,h);const htext=wrapCaption('Ретроспектива · Как менялась власть Рюриковичей?',l.header.w-40,l.font,2);assert.ok(htext.lines.length*l.font*1.14<=l.header.h);assert.equal(htext.overflow,false);const bounds={left:650,right:1400,top:100,bottom:900},fit=fitActor(l.actors,bounds);assert.ok(fit.x+bounds.left*fit.scale>=0);assert.ok(fit.x+bounds.right*fit.scale<=l.actors.w);assert.ok(fit.y+bounds.bottom*fit.scale<=l.actors.h);}
const renderer=fs.readFileSync(new URL('../src/v2/SceneRenderer.tsx',import.meta.url),'utf8');assert.match(renderer,/data-documentary-environment="full-frame"/);assert.match(renderer,/groupBounds/);
console.log('PASS phase0: content-based graphics, event captions, source titles/review labels, hero/support cast, tree orthogonal edges outside all label boxes, safe headings/group fit in3 aspects; geometry/data only, NO Chrome assertions');
