const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const playwrightPath = argument('playwright');
const browserPath = argument('browser');
if (!playwrightPath || !browserPath) throw new Error('Provide --playwright=/absolute/path/to/playwright/index.mjs and --browser=/absolute/path/to/chromium');
const {chromium} = await import(pathToFileURL(playwrightPath).href);
import {readFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output=path.resolve(argument('output-dir') || '/tmp/plumepilot-menu-ux-preview');
await mkdir(output,{recursive:true});
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const base="https://plumepilot-fixture.test/";
const browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
const errors=[];
const contexts=[];

async function pair(style='standard',size='medium',theme='light',platform='pegaso') {
  const courseKey=`${platform}:COURSE`;
  let stored={enabled:true,stopAtTests:false,autoCompleteTests:false,visualStyle:style,menuSize:size,themePreference:theme,
    floatingMenuEnabled:true,autoplayChapterLimitEnabled:false,autoplayChapterLimits:{[courseKey]:3},
    autoplayChapterLimitStatuses:{[courseKey]:{courseCode:'COURSE',platformId:platform,limit:3,maximum:12,completed:0,enabled:false,reached:false}},
    autoplayStopAt70Enabled:false,autoplayStopAt70BypassedCourses:{},commissionCheckEnabled:false};
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  contexts.push(context);
  await context.route(base+'**',async route=>{
    const file=path.join(root,new URL(route.request().url()).pathname);
    const bytes=await readFile(file);
    const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.ttf':'font/ttf'};
    await route.fulfill({body:bytes,contentType:types[path.extname(file)]||'application/octet-stream',headers:{'Access-Control-Allow-Origin':'*'}});
  });
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.stack)));
  await context.route('https://*.multiversity.click/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body><h1 style="font:20px system-ui;color:#aaa">Course fixture</h1><div class="flex-wrap bg-platform-light-gray"></div></body></html>'}));
  await context.exposeBinding('__swWrite',async(_,values)=>{
    const changes={};
    for(const [key,value]of Object.entries(values)){changes[key]={oldValue:stored[key],newValue:value};stored[key]=value;}
    if(Object.keys(values).some(key=>key.startsWith('autoplayChapter'))&&!('autoplayChapterLimitStatuses'in values)) {
      const status=stored.autoplayChapterLimitStatuses[courseKey];
      const next={...status,enabled:stored.autoplayChapterLimitEnabled,limit:stored.autoplayChapterLimits[courseKey],...(stored.autoplayChapterLimitSessions?.[courseKey]||{})};
      changes.autoplayChapterLimitStatuses={newValue:{[courseKey]:next}};
      stored.autoplayChapterLimitStatuses={[courseKey]:next};
    }
    for(const page of context.pages())await page.evaluate(changes=>window.__swApply(changes),changes);
  });
  await context.addInitScript(({base,manifest,stored,platform})=>{
    const courseKey=`${platform}:COURSE`;
    window.__swStore=stored;
    window.__commands=[];
    const changeListeners=[],messageListeners=[];
    const status=()=>window.__swStore.autoplayChapterLimitStatuses?.[courseKey];
    const progress=()=>({courseCode:'COURSE',platformId:platform,available:true,percent:43});
    window.__swApply=changes=>{
      for(const[key,change]of Object.entries(changes))window.__swStore[key]=change.newValue;
      for(const fn of changeListeners)fn(changes,'local');
      if(changes.autoplayChapterLimitStatuses) window.postMessage({type:'PEGASO_CHAPTER_LIMIT_STATUS',status:status()},'*');
    };
    const local={
      get(keys,cb){
        let result=typeof keys==='object'&&!Array.isArray(keys)?{...keys}:{};
        for(const key of (typeof keys==='string'?[keys]:Array.isArray(keys)?keys:Object.keys(keys||window.__swStore)))
          if(key in window.__swStore)result[key]=window.__swStore[key];
        if(cb)queueMicrotask(()=>cb(result));else return Promise.resolve(result);
      },
      set(values,cb){return window.__swWrite(values).then(()=>cb?.());},
      remove(keys,cb){return window.__swWrite(Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,null]))).then(()=>cb?.());},
    };
    const response=message=>{
      window.__commands.push(message);
      if(message.type==='PEGASO_GET_OPERATION')return {accepted:true,operation:window.__swStore.pegasoActiveOperation||null};
      if(message.type==='PEGASO_CHAPTER_LIMIT_STATUS_REQUEST')return {accepted:true,status:status()};
      if(message.type==='PEGASO_COURSE_PROGRESS_STATUS_REQUEST')return {accepted:true,status:progress()};
      if(message.type==='STUDYWING_ACHIEVEMENT_CLAIM')return {accepted:false,reason:'fixture'};
      return {accepted:true};
    };
    window.chrome={storage:{local,onChanged:{addListener:fn=>changeListeners.push(fn)}},runtime:{
      getURL:pathname=>base+pathname,getManifest:()=>manifest,
      onMessage:{addListener:fn=>messageListeners.push(fn)},
      sendMessage(message,cb){const value=response(message);if(cb)queueMicrotask(()=>cb(value));else return Promise.resolve(value);},
    },tabs:{query(_options,cb){cb([{id:1,url:`https://lms.${platform}.multiversity.click/videolezioni/COURSE`}]);},
      sendMessage(_id,message,options,cb){if(typeof options==='function')cb=options;queueMicrotask(()=>cb?.(response(message)));},create(){}},windows:{create(){}}};
    window.addEventListener('message',event=>{
      if(event.source!==window)return;
      if(event.data?.type==='PEGASO_CHAPTER_LIMIT_STATUS_REQUEST')window.postMessage({type:'PEGASO_CHAPTER_LIMIT_STATUS',status:status()},'*');
      if(event.data?.type==='PEGASO_COURSE_PROGRESS_STATUS_REQUEST')window.postMessage({type:'PEGASO_COURSE_PROGRESS_STATUS',status:progress()},'*');
    });
    // Test-only access: production uses a closed shadow root.
    const attach=Element.prototype.attachShadow;
    Element.prototype.attachShadow=function(options){return attach.call(this,{...options,mode:'open'});};
  },{base,manifest,stored,platform});
  const popup=await context.newPage();await popup.setViewportSize({width:500,height:600});await popup.goto(base+'popup.html');
  const floating=await context.newPage();await floating.goto(`https://lms.${platform}.multiversity.click/videolezioni/COURSE`);
  for(const script of ['commission-state.js','achievements.js','sound-settings.js','store-links.js','floating-menu-layout.js','menu-ux.js','floating-menu.js']) await floating.addScriptTag({url:base+script});
  await floating.locator('#studywing-floating-menu-host .launcher').click();
  await popup.locator('#courseProgressValue').filter({hasText:'43%'}).waitFor();
  await floating.locator('[data-role="course-progress-value"]').filter({hasText:'43%'}).waitFor();
  await popup.evaluate(()=>document.fonts.ready);
  if(style==='gaming')await floating.waitForFunction(()=>[...document.fonts].some(font=>
    font.family==='Pixelify Sans'&&font.status==='loaded'));
  await floating.evaluate(()=>document.fonts.ready);
  return {popup,floating,context,set:async values=>await popup.evaluate(values=>chrome.storage.local.set(values),values)};
}

async function checkPresentation(page, scope, style, size) {
  const copy={small:11,medium:12,large:13}[size];
  const action={small:13,medium:14,large:15}[size];
  const result=await page.locator(scope).evaluate(root=>{
    const styles=selector=>[...root.querySelectorAll(selector)].map(element=>{
      const css=getComputedStyle(element);
      return {label:element.getAttribute('aria-label')||element.textContent.trim()||element.name,
        size:parseFloat(css.fontSize),font:css.fontFamily,accent:css.accentColor};
    });
    return {
      inputs:styles('input[type="checkbox"],input[type="radio"]'),
      actions:styles('.ux-primary,.ux-navigation,.ux-back,.secondary-button,.action,.bookmark-action,.data-button'),
      headings:styles('.ux-heading,.ux-detail-title,.ux-completion > summary,.course-progress-heading > span'),
      settings:styles('.ux-setting-title,.chapter-limit-row,.chapter-limit-controls > span,.preference-group-heading,.preference-subsection-summary,.toggle-row > span,.test-choice-list label'),
    };
  });
  assert.equal(new Set(result.inputs.map(input=>input.accent)).size,1,'all checkboxes/radios share the theme accent');
  assert.notEqual(result.inputs[0].accent,'auto','native blue must not leak into any preference');
  for(const [role,expected]of [['actions',action],['headings',action],['settings',copy]])
    for(const item of result[role]) {
      assert.equal(item.size,expected,`${style}/${size}/${role}: ${item.label}`);
      assert.equal(item.font.includes('Pixelify Sans'),style==='gaming',`${role}: ${item.label} uses the selected style`);
    }
  const incomplete=page.locator('[data-action="find-first-incomplete"],#findFirstIncomplete');
  assert.equal(await incomplete.evaluate(e=>getComputedStyle(e).borderRadius),style==='gaming'?'0px':'7px');
  if(style==='gaming')assert.equal(await page.evaluate(()=>[...document.fonts].some(font=>
    font.family==='Pixelify Sans'&&font.status==='loaded')),true,'Gaming uses the loaded font, not only a declared family');
}

async function checkExpansionScroll(page, scope, completion) {
  const summary=page.locator(completion+' > summary');
  await summary.scrollIntoViewIfNeeded();
  const before=await page.locator(scope).evaluate(root=>{
    const scroll=root.closest('.panel')?.querySelector('.body')||document.scrollingElement;
    return scroll.scrollTop;
  });
  await summary.click();
  await page.waitForTimeout(150); // Allow native disclosure, layout and reduced-motion scrolling to settle.
  const after=await page.locator(scope).evaluate((root,selector)=>{
    const scroll=root.closest('.panel')?.querySelector('.body')||document.scrollingElement;
    const rect=root.querySelector(selector).getBoundingClientRect();
    const viewport=scroll===document.scrollingElement?{bottom:innerHeight}:scroll.getBoundingClientRect();
    return {top:scroll.scrollTop,bottom:rect.bottom,viewportBottom:viewport.bottom,pageScroll:window.scrollY};
  },completion);
  assert.ok(after.top>before,'opening a submenu at the bottom scrolls to reveal its content');
  assert.ok(after.bottom<=after.viewportBottom+1,'short expanded section is fully visible');
  if(scope==='#studywing-panel')assert.equal(after.pageScroll,0,'floating expansion must not scroll the LMS page');
  const closingTop=after.top;
  await summary.click();
  await page.waitForTimeout(80);
  // Shrinking content may clamp scrollTop naturally; it must never scroll further down.
  const closedTop=await page.locator(scope).evaluate(root=>(root.closest('.panel')?.querySelector('.body')||document.scrollingElement).scrollTop);
  assert.ok(closedTop<=closingTop,'closing does not trigger expansion scrolling');
}

async function capturePopup(page, filename) {
  const viewport=page.viewportSize();
  // Capture the whole document without the viewport's fixed Gaming frame cutting
  // across an element screenshot that extends beyond the original viewport.
  const height=await page.locator('.container').evaluate(e=>Math.ceil(e.scrollHeight)+10);
  await page.setViewportSize({...viewport,height});
  await page.evaluate(()=>document.scrollingElement.scrollTop=0);
  await page.locator('.container').screenshot({path:filename});
  await page.setViewportSize(viewport);
}

try {
  const {popup,floating,set}=await pair();
  assert.deepEqual(await popup.locator('[role="tab"]:visible').evaluateAll(e=>e.map(x=>x.innerText)),['Corso','Esami','Preferenze']);
  assert.deepEqual((await floating.locator('.menu-tab:visible').evaluateAll(e=>e.map(x=>x.innerText))).map(s=>s.trim()),['Corso','Esami','Preferenze']);
  await popup.locator('#findFirstIncomplete').waitFor({state:'visible'});
  assert.equal(await popup.locator('#findFirstIncomplete').isEnabled(),true);
  assert.equal(await floating.locator('[data-action="find-first-incomplete"]').isEnabled(),true);
  const newIds=await popup.locator('[id]').evaluateAll(elements=>elements.map(e=>e.id));
  assert.equal(new Set(newIds).size,newIds.length,'popup IDs unique');
  for(const [page,open,detail,back]of [[popup,'#openAutoplaySettings','#autoplaySettingsView','[data-ux-back]'],[floating,'[data-action="toggle-autoplay-options"]','#studywing-autoplay-options','[data-ux-back]']]) {
    await page.locator(open).click();
    assert.equal(await page.locator(detail).isVisible(),true);
    assert.equal(await page.locator('[data-ux-home]').isVisible(),false);
    assert.equal(await page.locator('[data-ux-detail-title]').evaluate(e=>e===e.getRootNode().activeElement),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(detail).isVisible(),false);
    assert.equal(await page.locator(open).evaluate(e=>e===e.getRootNode().activeElement),true);
    await page.locator(open).click();await page.locator(back).click();
  }
  await capturePopup(popup,output+'/popup-standard.png');
  await floating.locator('.panel').screenshot({path:output+'/floating-standard.png'});
  await set({enabled:false});
  assert.equal(await popup.locator('#findFirstIncomplete').isDisabled(),true);
  assert.equal(await floating.locator('[data-action="find-first-incomplete"]').isDisabled(),true);
  await popup.locator('#openAutoplaySettings').click();
  await popup.locator('#autoplaySkipCompletedVideos').check();
  assert.equal(await floating.locator('[data-setting="autoplay-skip-completed-videos"]').isChecked(),true);
  assert.equal(await popup.locator('#autoplaySkipCompletedVideos').isEnabled(),true);
  await set({stopAtTests:true,autoCompleteTests:false,autoplayChapterLimitEnabled:true,autoplayStopAt70Enabled:true});
  assert.equal(await popup.locator('#testBehaviorOverride').isVisible(),true);
  assert.match(await popup.locator('#autoplayOptionsSummary').textContent(),/Test ignorati.*Stop al 70%.*3 capitoli/);
  assert.equal(await popup.locator('#autoplayOptionsSummary').textContent(),await floating.locator('[data-role="autoplay-options-summary"]').textContent());
  assert.equal(await popup.locator('input[name="testBehavior"][value="stop"]').isDisabled(),true);
  assert.equal(await popup.locator('input[name="testBehavior"][value="stop"]').isChecked(),true);
  await popup.screenshot({path:output+'/popup-settings.png'});
  await floating.locator('[data-action="toggle-autoplay-options"]').click();
  await floating.locator('.panel').screenshot({path:output+'/floating-settings.png'});
  await floating.locator('[data-ux-back]').click();
  await popup.locator('[data-ux-back]').click();
  const custom={version:1,items:[{id:'complete-tests',visible:false},{id:'complete-objectives',visible:false},{id:'test-collection',visible:false},{id:'study-materials',visible:false}]};
  await set({floatingMenuLayout:custom,pegasoActiveOperation:{id:'fixture-operation',kind:'turbo',phase:'running',message:'Test in corso'}});
  assert.equal(await popup.locator('#turboTests').isVisible(),true);
  assert.equal(await floating.locator('[data-action="turbo"]').isVisible(),true);
  await popup.locator('#examsTab').click();await popup.locator('#activeOperationBanner').click();
  assert.equal(await popup.locator('#turboTests').isVisible(),true);
  await floating.locator('[data-tab="preferences"]').click();await floating.locator('[data-role="active-operation-banner"]').click();
  assert.equal(await floating.locator('[data-action="turbo"]').isVisible(),true);
  assert.equal(await popup.locator('#turboTests').textContent().then(s=>s.trim()),'Interrompi i test automatici');
  await set({pegasoActiveOperation:null});
  assert.equal(await popup.locator('#courseCompletion').isVisible(),false);
  assert.equal(await floating.locator('[data-role="course-completion"]').isVisible(),false);
  await set({floatingMenuLayout:{version:1,items:[{id:'study-materials',visible:true},{id:'test-collection',visible:true},{id:'complete-tests',visible:true},{id:'complete-objectives',visible:true}]}});
  await popup.locator('#preferencesTab').click();
  await popup.locator('#interfaceSectionTitle').click();
  await popup.locator('.ux-layout-settings > summary').click();
  await popup.locator('#floatingMenuLayoutList [data-layout-item="study-materials"] input').uncheck();
  assert.equal(await floating.locator('[data-menu-item="study-materials"]').evaluate(e=>e.hidden),true);
  await popup.locator('#floatingMenuLayoutList [data-layout-item="study-materials"] input').check();
  await popup.locator('#floatingMenuLayoutList [data-layout-item="study-materials"] [data-direction="down"]').click();
  assert.equal(await popup.evaluate(()=>document.activeElement.closest('[data-layout-item]')?.dataset.layoutItem), 'study-materials', 'reordering retains keyboard focus');
  assert.deepEqual(await popup.locator('[data-menu-group="materials"] > [data-menu-item]').evaluateAll(e=>e.map(x=>x.dataset.menuItem)),['test-collection','study-materials']);
  assert.deepEqual(await floating.locator('[data-menu-group="materials"] > [data-menu-item]').evaluateAll(e=>e.map(x=>x.dataset.menuItem)),['test-collection','study-materials']);
  await floating.locator('[data-tab="preferences"]').click();
  await floating.locator('#studywing-interface-preferences-heading').click();
  await floating.locator('.ux-layout-settings > summary').click();
  await floating.locator('[data-action="reset-menu-layout"]').click();
  await popup.locator('#courseTab').click();
  assert.equal(await popup.locator('[data-menu-item="study-materials"]').isVisible(),true);
  console.log('PASS: common navigation, Back/Escape/focus, paused configuration, synchronized settings/layout and accessible active cancellation');
  // Theme/style/size matrix: verify actual layout rather than screenshot alone.
  for(const style of ['standard','gaming'])for(const size of ['small','medium','large'])for(const theme of ['light','dark']) {
    const pairPages=await pair(style,size,theme);
    for(const page of [pairPages.popup,pairPages.floating]) {
      const scope=page===pairPages.popup?'.container':'#studywing-panel';
      await checkPresentation(page,scope,style,size);
      const overflow=await page.locator(scope).evaluate(root=>[...root.querySelectorAll('button,input,summary,h2,.ux-format,.ux-summary')].filter(e=>e.getClientRects().length).filter(e=>e.scrollWidth>e.clientWidth+2 && !['INPUT'].includes(e.tagName)).map(e=>[e.tagName,e.textContent.trim(),e.scrollWidth,e.clientWidth]));
      assert.deepEqual(overflow,[],`${style}/${size}/${theme}: controls must not clip`);
      await page.locator('[data-ux-open]').click();
      assert.equal(await page.locator('[data-ux-detail]').isVisible(),true);
      await page.locator('[data-ux-back]').click();
      await checkExpansionScroll(page,scope,page===pairPages.popup?'#courseCompletion':'[data-role="course-completion"]');
    }
    if(size==='medium'&&theme==='dark') {
      for(const page of [pairPages.popup,pairPages.floating])await page.locator(page===pairPages.popup?'.container':'#studywing-panel').evaluate(root=>{
        (root.closest('.panel')?.querySelector('.body')||document.scrollingElement).scrollTop=0;
      });
      await capturePopup(pairPages.popup,output+`/popup-${style}-dark.png`);
      await pairPages.floating.locator('.panel').screenshot({path:output+`/floating-${style}-dark.png`});
    }
    await pairPages.context.close();
  }
  for(const platform of ['mercatorum','utsr']) {
    const p=await pair('standard','medium','light',platform);
    assert.equal(await p.floating.locator('[data-action="find-first-incomplete"]').isEnabled(),true);
    await p.context.close();
  }
  const expanded=await pair('gaming','small','dark');
  await expanded.popup.setViewportSize({width:360,height:440});
  await expanded.floating.setViewportSize({width:900,height:560});
  for(const page of [expanded.popup,expanded.floating]) {
    const popup=page===expanded.popup;
    await page.locator(popup?'#preferencesTab':'[data-tab="preferences"]').click();
    const summary=page.locator(popup?'#interfaceSectionTitle':'#studywing-interface-preferences-heading');
    await summary.click();
    await page.waitForTimeout(100);
    const nested=page.locator('.ux-layout-settings > summary');
    await nested.scrollIntoViewIfNeeded();
    await nested.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const position=await nested.evaluate(e=>{
      const scroll=e.getRootNode().querySelector('.body');
      const viewport=scroll?scroll.getBoundingClientRect():{top:document.querySelector('.popup-sticky-header').getBoundingClientRect().bottom,bottom:innerHeight};
      const rect=e.getBoundingClientRect();
      return {top:rect.top,bottom:rect.bottom,viewportTop:viewport.top,viewportBottom:viewport.bottom};
    });
    assert.ok(position.top>=position.viewportTop-1&&position.bottom<position.viewportBottom,'keyboard opening keeps the nested section opener visible');
  }
  await expanded.popup.locator('#courseTab').click();
  await expanded.popup.emulateMedia({reducedMotion:'no-preference'});
  const info=expanded.popup.locator('[aria-controls="materialsInfo"]');
  await info.scrollIntoViewIfNeeded();
  await info.click();
  await expanded.popup.waitForFunction(()=>{
    const panel=document.getElementById('materialsInfo');
    return !panel.hidden&&!panel.classList.contains('is-expanding')&&panel.getBoundingClientRect().bottom<=innerHeight+1;
  });
  assert.equal(await info.evaluate(e=>e===document.activeElement),true,'help scrolling retains focus on the opener');
  await expanded.set({commissionCheckEnabled:true});
  await expanded.floating.locator('[data-tab="exams"]').click();
  const gap=await expanded.floating.locator('[data-action="clear-commission-data"]').evaluate(button=>
    button.getBoundingClientRect().top-button.getRootNode().querySelector('.commission-note').getBoundingClientRect().bottom);
  assert.ok(gap>=12,'exam data button has space above it');
  await expanded.floating.locator('.panel').screenshot({path:output+'/floating-exams-gaming.png'});
  await expanded.context.close();
  assert.deepEqual(errors,[],'no runtime exceptions');
  console.log('PASS: 12 theme/style/size combinations, matching typography and checkbox accents, expansion scrolling, all three platform fixtures, no runtime errors');
} finally {
  await browser.close();
}
