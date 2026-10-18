// Run with Playwright installed; optionally set PLUMEPILOT_CHROMIUM_PATH.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {execFileSync}=require('node:child_process');
const dir=mkdtempSync(path.join(tmpdir(),'plumepilot-notes-'));
const fixture=path.join(dir,'quiz.html');
const saved=path.join(dir,'saved.html');
execFileSync(process.execPath,[path.join(__dirname,'../test-html-notes.mjs')],{env:{...process.env,PLUMEPILOT_QUIZ_FIXTURE:fixture}});

(async()=>{const b=await chromium.launch({executablePath:process.env.PLUMEPILOT_CHROMIUM_PATH||undefined,args:['--no-sandbox'],headless:true});const p=await b.newPage();await p.goto(pathToFileURL(fixture).href);await p.locator('.personal-notes summary').first().click();const e=p.locator('.note-editor').first();
for(const [marker,tag]of [['-','ul'],['1.','ol']]){await p.reload();await p.locator('.personal-notes summary').first().click();await e.focus();await e.pressSequentially(marker+' ');assert.equal(await e.locator(tag+' li').count(),1);await e.pressSequentially('Item');await e.press('Enter');await e.press('Enter');await e.pressSequentially('Normal');assert.equal(await e.locator('li').count(),1);assert.equal(await e.locator('li').textContent(),'Item');}
await e.fill('ordinary - ');assert.equal(await e.locator('ul').count(),0);
for(const click of [false,true]){await e.evaluate(el=>{el.innerHTML='<span class="highlight" data-color="green"><b>abcdef</b></span>';el.focus();const t=el.querySelector('b').firstChild;const r=document.createRange();r.setStart(t,2);r.setEnd(t,4);window.getSelection().removeAllRanges();window.getSelection().addRange(r);el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});if(click)await p.getByRole('button',{name:'Rimuovi formattazione',exact:true}).first().click();else await e.press('Control+Backslash');assert.equal(await e.textContent(),'abcdef');assert.deepEqual(await e.locator('.highlight').allTextContents(),['ab','ef']);assert.equal(await e.locator('b').allTextContents().then(x=>x.join('')),'abef');}
const downloadPromise=p.waitForEvent('download');await p.locator('#downloadNotes').click();const d=await downloadPromise;await d.saveAs(saved);await p.goto(pathToFileURL(saved).href);await p.locator('.personal-notes summary').first().click();assert.equal(await p.locator('.note-editor').first().textContent(),'abcdef');console.log('PASS Chromium: automatic lists, double-Enter exit, plain text, Ctrl+Backslash and Tx partial color/bold removal, saved notes round-trip');await b.close();rmSync(dir,{recursive:true,force:true})})().catch(e=>{console.error(e);process.exit(1)});
