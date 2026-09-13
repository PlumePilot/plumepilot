import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=new URL('../',import.meta.url);
// A text-only DOMParser double: assert that the normalizer never parses source tags.
class TextParser {
  parseFromString(source) {
    assert(source.startsWith('<body>'));
    const text=source.slice(6);assert(!text.includes('<'));
    return {body:{textContent:text.replace(/&(lt|gt|amp|nbsp);/g,(_,e)=>({lt:'<',gt:'>',amp:'&',nbsp:'\u00a0'}[e]))}};
  }
}
const core=vm.createContext({DOMParser:TextParser,TextEncoder});
vm.runInContext(await readFile(new URL('notes-core.js',root),'utf8'),core);
const row={id:1,course_code:'COURSE',lp_item_id:146,body:'<ul><li><b>Appunto</b> &nbsp;<em>corsivo</em></li></ul>',tracking_time:1,deleted_at:null,user_id:999,official_code:'PRIVATE'};
const normalize=data=>core.PlumePilotNotes.normalize({code:200,data},'COURSE',146);
assert.equal(normalize([]).notes.length,0);
const normalized=normalize([row]);
assert.equal(normalized.notes[0].blocks[0].list,true);
assert.equal(normalized.notes[0].blocks[0].runs[0].bold,true);
assert(!JSON.stringify(normalized).includes('PRIVATE'));
assert(!JSON.stringify(normalized).includes('user_id'));
assert.equal(normalize([{...row,deleted_at:'deleted'}]).notes.length,0);
assert.equal(normalize([row,{...row,id:2}]).notes.length,2);
assert.throws(()=>normalize([row,row]),/DUPLICATE/);
assert.throws(()=>normalize([{...row,lp_item_id:147}]),/IDENTITY/);
assert.throws(()=>normalize([{...row,body:'x'.repeat(50001)}]),/BODY/);
const attack=normalize([{...row,body:'<script>alert(1)</script><img src="https://bad.invalid" onerror="attack()"><p onclick="attack()">sicuro</p>'}]);
assert(!JSON.stringify(attack).includes('attack'));
assert(!JSON.stringify(attack).includes('bad.invalid'));
assert(JSON.stringify(attack).includes('Immagine non inclusa'));
const context=globalThis;
context.PDFLib=require('../vendor/pdf-lib.min.js');context.fontkit=require('../vendor/fontkit.umd.min.js');
vm.runInThisContext(await readFile(new URL('notes-document.js',root),'utf8'));
const job={courseTitle:'Statistica α e β',missing:[{chapter:'Capitolo 2',reason:'Appunti non recuperati'}],videos:[{section:'Modulo 1',chapterTitle:'1 - Anova',videoTitle:'Statistica test',notes:[{id:1,trackingTime:1,blocks:[{list:true,runs:[{text:'Appunto con α ≤ β e accenti: perché',bold:true,italic:false}]},{list:false,runs:[{text:'<script>alert(1)</script> & osservazioni',bold:false,italic:true}]}]}]},{section:'Modulo 2',chapterTitle:'1 - Altro capitolo',videoTitle:'Titolo diverso',notes:[{id:2,blocks:[{list:false,runs:[{text:'Nota lunga '.repeat(2000)}]}]}]}]};
const html=context.PlumePilotNotesDocument.html(job);
assert(!html.includes('<script>alert(1)</script>'));
assert(html.includes('\\u003cscript\\u003ealert(1)\\u003c/script\\u003e'));
assert.equal([...html.matchAll(/<script>/g)].length,1);
assert(html.includes('Raccolta parziale'));
assert(html.includes('PLUMEPILOT · APPUNTI OFFLINE'));
assert(html.includes('Integrazione all’appunto'));
assert(html.includes("const symbols=['α','β','γ','Δ','π','√','∞','≤','≥','≠','±','×','÷','∫','∑','²']"));
assert(html.includes('id="notes-data"'));
assert(html.includes('video:0:note:1'));
assert(html.includes('beforeunload'));
new Function(html.match(/<script>([\s\S]*)<\/script>/)[1]);
const fonts=await Promise.all(['Regular','Bold','Italic'].map(s=>readFile(new URL(`vendor/standard_fonts/LiberationSans-${s}.ttf`,root))));
const bytes=await context.PlumePilotNotesDocument.pdf(job,...fonts);
const doc=await context.PDFLib.PDFDocument.load(bytes);
assert(doc.getPageCount()>4);
assert(doc.getPage(0).node.Annots().size()===2);
if(process.env.NOTES_QA_DIR){await mkdir(process.env.NOTES_QA_DIR,{recursive:true});await writeFile(process.env.NOTES_QA_DIR+'/notes.pdf',bytes);await writeFile(process.env.NOTES_QA_DIR+'/notes.html',html);}
// Run the actual collector with controlled API responses and real ordering logic stub.
const content=await readFile(new URL('content.js',root),'utf8');
const collector=content.slice(content.indexOf('  async function collectCourseNotes('),content.indexOf('  function testSourceCacheKey('));
const calls=[];const events=[];
const sandbox={collectingCourseMaterials:false,courseBatchRunning:()=>false,exportCancelRequested:false,activeExportOperationId:null,enabled:false,TextEncoder,API_LESSON_RETRY_DELAYS_MS:[1,2],TURBO_API_PACING_MS:350,materialOutlineCache:new Map(),lessonApiCache:new Map(),API_LESSON_CACHE_FRESH_MS:300000,
 ensureExportNotCancelled:()=>{},exportSleep:async()=>{},courseCodeFromUrl:()=> 'COURSE',sections:()=>[{text:'Modulo'}],setExportCollectionStatus:()=>{},apiCourseOutline:async()=>[],recoverCourseTestOutline:async()=>[{identity:{sectionText:'Modulo',chapterText:'Capitolo'},route:{lpId:30,id:99},lessonNumber:1,chapterKey:'1:30:99'}],courseTitle:()=> 'Corso',removeExportCollectionToastAfter:()=>{},
 turboApiRequest:async(action,args)=>{calls.push({action,...args});if(action==='outline')return {ok:true,data:{entries:[]}};if(action==='lesson')return {ok:true,data:{progressDataComplete:true,playbackItems:[{contentType:'video',lp_item_id:146,lp_id:30,title:'Video'},{contentType:'video',lp_item_id:147,lp_id:30,title:'Vuoto'}]}};return {ok:true,data:{notes:args.lpItemId===146?[{id:1,blocks:[]}]:[]}};},
 window:{postMessage:event=>events.push(event)}};sandbox.window.top=sandbox.window;
const c=vm.createContext(sandbox);vm.runInContext(collector,c);await c.collectCourseNotes('op');
assert.equal(calls.find(c=>c.action==='lesson').paragraphId,99);
assert.equal(calls.filter(c=>c.action==='notes').length,2);
assert.equal(events[0].payload.videos.length,1);
assert.equal(c.collectingCourseMaterials,false);
events.length=0;c.ensureExportNotCancelled=()=>{const e=Error('cancel');e.name='AbortError';throw e;};await c.collectCourseNotes('cancel');
assert.equal(events.at(-1).type,'PEGASO_EXPORT_COLLECTION_FAILED');assert.equal(c.collectingCourseMaterials,false);
console.log('PASS: notes collector routes, empty notes, cancellation, safe HTML, Unicode PDF and navigation');
