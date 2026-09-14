(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain = note => note.blocks.map(b => (b.list ? '• ' : '') + b.runs.map(r => r.text).join('')).join('\n');
  function groupedChapters(job) {
    const chapters=[];
    const chapterMap=new Map();
    for(const [videoIndex,video] of job.videos.entries()){
      const key=video.chapterKey || `${video.section || ''}\u0000${video.chapterTitle || ''}`;
      let chapter=chapterMap.get(key);
      if(!chapter){chapter={section:video.section,chapterTitle:video.chapterTitle,videos:[]};chapterMap.set(key,chapter);chapters.push(chapter);}
      chapter.videos.push({...video,notes:video.notes.map((note,noteIndex)=>({...note,noteKey:`video:${video.videoId ?? videoIndex}:note:${note.id ?? noteIndex}`}))});
    }
    return chapters;
  }
  function html(job) {
    const chapters=groupedChapters(job);
    const filename=`appunti-${String(job.courseTitle || 'corso').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase() || 'corso'}-aggiornati.html`;
    const payload=JSON.stringify({courseTitle:job.courseTitle,chapters,missing:job.missing || [],annotatedFilename:filename})
      .replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    return `<!doctype html><html lang="it" data-theme="auto"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(job.courseTitle)} · Appunti</title><style>
    :root{color-scheme:light;--bg:#f6f2fa;--card:#fff;--text:#281d32;--muted:#73677c;--accent:#cf1d56;--purple:#5b2ca0;--ok:#18794e;--line:#e3dae9;--sidebar:#2b1839}html[data-theme=dark]{color-scheme:dark;--bg:#19151f;--card:#282130;--text:#f0e9f5;--muted:#b9adbf;--line:#51445e}@media(prefers-color-scheme:dark){html[data-theme=auto]{color-scheme:dark;--bg:#19151f;--card:#282130;--text:#f0e9f5;--muted:#b9adbf;--line:#51445e}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}.app{display:grid;grid-template-columns:280px 1fr;min-height:100vh}aside{padding:22px;background:var(--sidebar);color:#fff;position:sticky;top:0;height:100vh;overflow:auto}aside h1{font-size:18px;line-height:1.25;margin:6px 0 4px}.brand{font-size:11px;font-weight:800;letter-spacing:.12em;color:#ff91b4}.summary{color:#dbcbe5;margin:0 0 18px}.chapter{display:block;width:100%;margin:6px 0;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#fff;text-align:left;cursor:pointer}.chapter.active{background:#613493}.partial{margin-top:20px;padding-top:14px;border-top:1px solid #674d78;color:#f4eaf9}.partial summary{cursor:pointer;font-weight:750}.partial ul{padding-left:20px}.content{width:min(850px,calc(100% - 32px));margin:32px auto}.toolbar,.video{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:14px}.toolbar h2{margin:0 0 6px}.toolbar p{margin:0;color:var(--muted)}.toolbar-actions{display:flex;align-items:end;gap:12px;flex-wrap:wrap;margin-top:16px}.toolbar-actions label{color:var(--muted);font-size:14px;font-weight:700}.toolbar-actions select{display:block;margin-top:4px;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text);font:inherit}.toolbar-actions button{border:0;border-radius:10px;padding:11px 15px;background:var(--purple);color:#fff;font:inherit;font-weight:700;cursor:pointer}.status{min-height:24px;margin:12px 0 0;color:var(--accent);font-weight:700}.video h3{margin:0 0 4px}.video-meta{margin:0 0 16px;color:var(--muted)}.source-note{margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:12px}.source-note>p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}.source-note>p:first-child{margin-top:0}.source-note>p:last-of-type{margin-bottom:0}.personal-notes{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}.personal-notes summary{color:var(--purple);font-weight:750;cursor:pointer}.personal-notes[data-has-notes=true] summary{color:var(--accent)}.notes-indicator{display:inline-block;margin-left:8px;padding:2px 7px;border:1px solid currentColor;border-radius:999px;font-size:11px;line-height:1.35;vertical-align:middle}.personal-notes[data-has-notes=false] .notes-indicator{display:none}.note-field{display:block;margin-top:10px;color:var(--muted);font-size:14px;font-weight:700}.note-field textarea{display:block;width:100%;min-height:96px;margin-top:5px;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--text);font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;resize:vertical}.symbol-bar{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.symbol-bar button{min-width:30px;min-height:30px;padding:3px 7px;border:1px solid var(--line);border-radius:7px;background:var(--bg);color:var(--text);font:17px serif;cursor:pointer}.empty{padding:18px;color:var(--muted);text-align:center}@media(max-width:760px){.app{display:block}aside{position:static;height:auto}.content{margin:20px auto}.chapter{display:inline-block;width:auto}}@media print{.app{display:block}aside{position:static;height:auto}.chapter:not(.active),.toolbar-actions,.status,.personal-notes:not([data-has-notes=true]){display:none}.content{width:100%;margin:0}.video{break-inside:avoid}}
    </style></head><body><div class="app"><aside><div class="brand">PLUMEPILOT · APPUNTI OFFLINE</div><h1 id="title"></h1><p class="summary" id="summary"></p><nav id="nav" aria-label="Capitoli"></nav><details class="partial" id="partial" hidden><summary>Raccolta parziale</summary><ul id="missing"></ul></details></aside><main class="content"><section class="toolbar"><h2 id="chapterTitle"></h2><p>Gli appunti originali provengono da Pegaso. Le integrazioni restano solo in questa copia.</p><div class="toolbar-actions"><button id="save" type="button">Scarica copia aggiornata</button><label>Tema<select id="theme"><option value="auto">Automatico</option><option value="light">Chiaro</option><option value="dark">Scuro</option></select></label></div><p class="status" id="dirty" role="status"></p></section><div id="videos"></div></main></div><script id="notes-data" type="application/octet-stream">e30=</script><script>
    const DATA=${payload};let current=0;let dirty=false;const byId=id=>document.getElementById(id);const decodeNotes=value=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value),character=>character.charCodeAt(0))));const encodeNotes=value=>btoa(Array.from(new TextEncoder().encode(JSON.stringify(value)),byte=>String.fromCharCode(byte)).join(''));const integrations=new Map(Object.entries(decodeNotes(byId('notes-data').textContent||'e30=')));const symbols=['α','β','γ','Δ','π','√','∞','≤','≥','≠','±','×','÷','∫','∑','²'];
    function setDirty(value,message){dirty=value;byId('dirty').textContent=message||''}
    function nav(){byId('title').textContent=DATA.courseTitle;const count=DATA.chapters.reduce((total,chapter)=>total+chapter.videos.length,0);byId('summary').textContent=DATA.chapters.length+' '+(DATA.chapters.length===1?'capitolo':'capitoli')+' · '+count+' '+(count===1?'video':'video');byId('nav').replaceChildren(...DATA.chapters.map((chapter,index)=>{const button=document.createElement('button');button.className='chapter'+(index===current?' active':'');button.type='button';button.textContent=chapter.section+' · '+chapter.chapterTitle;button.onclick=()=>{current=index;render()};return button}));const partial=byId('partial');partial.hidden=!DATA.missing.length;byId('missing').replaceChildren(...DATA.missing.map(item=>{const li=document.createElement('li');li.textContent=item.chapter+': '+item.reason;return li}))}
    function appendRuns(target,block){const paragraph=document.createElement('p');if(block.list)paragraph.append('• ');for(const run of block.runs||[]){let node=document.createTextNode(run.text||'');if(run.italic){const em=document.createElement('em');em.appendChild(node);node=em}if(run.bold){const strong=document.createElement('strong');strong.appendChild(node);node=strong}paragraph.appendChild(node)}target.appendChild(paragraph)}
    function integrationEditor(note){const saved=String(integrations.get(note.noteKey)||'');const details=document.createElement('details');details.className='personal-notes';details.open=false;details.dataset.hasNotes=String(Boolean(saved));const summary=document.createElement('summary');summary.append('Integrazione all’appunto');const indicator=document.createElement('span');indicator.className='notes-indicator';indicator.textContent='Appunti presenti';summary.appendChild(indicator);details.appendChild(summary);const label=document.createElement('label');label.className='note-field';label.append('Testo integrativo');const textarea=document.createElement('textarea');textarea.value=saved;textarea.placeholder='Aggiungi formule, chiarimenti, collegamenti o promemoria…';textarea.addEventListener('input',()=>{const value=textarea.value;if(value)integrations.set(note.noteKey,value);else integrations.delete(note.noteKey);details.dataset.hasNotes=String(Boolean(value));setDirty(true,'Modifiche da scaricare')});label.appendChild(textarea);details.appendChild(label);const bar=document.createElement('div');bar.className='symbol-bar';bar.setAttribute('aria-label','Simboli matematici');for(const symbol of symbols){const button=document.createElement('button');button.type='button';button.textContent=symbol;button.title='Inserisci '+symbol;button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',()=>{const start=textarea.selectionStart;const end=textarea.selectionEnd;textarea.setRangeText(symbol,start,end,'end');textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.focus()});bar.appendChild(button)}details.appendChild(bar);return details}
    function render(){nav();const chapter=DATA.chapters[current];const container=byId('videos');container.replaceChildren();if(!chapter){byId('chapterTitle').textContent='Nessun appunto trovato';const empty=document.createElement('p');empty.className='empty';empty.textContent='La raccolta non contiene appunti.';container.appendChild(empty);return}byId('chapterTitle').textContent=chapter.section+' — '+chapter.chapterTitle;chapter.videos.forEach((video,videoIndex)=>{const card=document.createElement('article');card.className='video';const heading=document.createElement('h3');heading.textContent=video.videoTitle;card.appendChild(heading);const meta=document.createElement('p');meta.className='video-meta';meta.textContent=video.notes.length+' '+(video.notes.length===1?'appunto':'appunti');card.appendChild(meta);video.notes.forEach((note,noteIndex)=>{const source=document.createElement('section');source.className='source-note';source.dataset.noteId=String(note.id??'');source.dataset.trackingTime=String(note.trackingTime??'');if(video.notes.length>1){const label=document.createElement('strong');label.textContent='Appunto '+(noteIndex+1);source.appendChild(label)}for(const block of note.blocks||[])appendRuns(source,block);source.appendChild(integrationEditor(note));card.appendChild(source)});container.appendChild(card)})}
    const theme=byId('theme');theme.value=document.documentElement.dataset.theme;theme.onchange=()=>{document.documentElement.dataset.theme=theme.value;setDirty(true,'Modifiche da scaricare')};window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});byId('save').onclick=()=>{const clone=document.documentElement.cloneNode(true);clone.querySelector('#notes-data').textContent=encodeNotes(Object.fromEntries(integrations));clone.dataset.theme=document.documentElement.dataset.theme;clone.querySelector('#dirty').textContent='';const output='<!doctype html>\\n'+clone.outerHTML;const url=URL.createObjectURL(new Blob([output],{type:'text/html;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=DATA.annotatedFilename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setDirty(false,'Download della copia aggiornata avviato')};render();
    </script></body></html>`;
  }
  async function pdf(job, fontBytes, boldBytes, italicBytes, boldItalicBytes = boldBytes) {
    const {PDFDocument, PDFName, PDFHexString} = PDFLib;
    const A4=[595.28,841.89];const margin=54;const width=A4[0]-margin*2;
    const colors={accent:[207,29,86],purple:[91,44,160],text:[40,29,50],muted:[111,100,121],line:[225,217,232]};
    const rgb255=value=>PDFLib.rgb(...value.map(channel=>channel/255));
    const chapters=groupedChapters(job);
    const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
    const fonts=await Promise.all([fontBytes,boldBytes,italicBytes,boldItalicBytes].map(bytes=>doc.embedFont(bytes,{subset:true})));
    const characters = new Map(fonts.map(font => [font, new Set(font.getCharacterSet())]));
    doc.setTitle(job.courseTitle + ' — Appunti');doc.setSubject('Appunti dei video del corso ordinati per capitolo');doc.setCreator('PlumePilot');
    let page;let y;const links=[];const entries=[];
    const newPage=()=>{page=doc.addPage(A4);y=A4[1]-margin;return page;};
    const safeText=(text,font)=>Array.from(String(text)).map(c=>{
      if(c==='\n'||c==='\t')return c==='\t'?'    ':c;
      if(!characters.get(font).has(c.codePointAt(0)))throw Error('Il PDF non supporta un simbolo presente negli appunti. Usa il formato HTML.');
      return c;
    }).join('');
    const wrap=(text,font,size,maxWidth)=>{
      const result=[];
      for(const paragraph of safeText(text,font).replace(/\r/g,'').split('\n')){
        let current='';
        for(const word of paragraph.split(/\s+/).filter(Boolean)){
          const candidate=current?`${current} ${word}`:word;
          if(font.widthOfTextAtSize(candidate,size)<=maxWidth){current=candidate;continue;}
          if(current)result.push(current);current='';let part='';
          for(const character of word){if(part&&font.widthOfTextAtSize(part+character,size)>maxWidth){result.push(part);part=character;}else part+=character;}
          current=part;
        }
        result.push(current);
      }
      return result.length?result:[''];
    };
    const drawLines=(text,options={})=>{
      const font=options.font || (options.bold?fonts[1]:fonts[0]);const size=options.size||11;const lineHeight=options.lineHeight||size*1.35;const x=options.x??margin;const maxWidth=options.width??width;
      const rows=wrap(text,font,size,maxWidth);
      for(const row of rows){if(y-lineHeight<42)newPage();page.drawText(row,{x,y,size,font,color:rgb255(options.color||colors.text)});options.onRow?.(page,y,lineHeight);y-=lineHeight;}
      y-=options.after||0;return rows.length;
    };
    function blockParagraph(block) {
      let x=margin;
      const newline=()=>{y-=16.5;x=margin;if(y<42)newPage();};
      if(y<42)newPage();
      const runs=block.list?[{text:'• ',bold:false,italic:false},...block.runs]:block.runs;
      for(const run of runs){
        const font=fonts[run.bold?(run.italic?3:1):(run.italic?2:0)];
        for(const token of safeText(run.text,font).split(/(\n|[ \t]+)/)){
          if(token==='\n'){newline();continue;}
          if(!token)continue;
          const tokenWidth=font.widthOfTextAtSize(token,11);
          if(x>margin && x+tokenWidth>margin+width)newline();
          if(x===margin && /^\s+$/.test(token))continue;
          if(tokenWidth<=width){page.drawText(token,{x,y,size:11,font,color:rgb255(colors.text)});x+=tokenWidth;}
          else for(const char of token){const w=font.widthOfTextAtSize(char,11);if(x+w>margin+width)newline();page.drawText(char,{x,y,size:11,font,color:rgb255(colors.text)});x+=w;}
        }
      }
      y-=21.5;
    }
    function addBookmarks(){
      if(!entries.length)return;const context=doc.context;const outlineRef=context.nextRef();const rootRef=context.nextRef();const sections=[];
      for(const entry of entries){let section=sections.at(-1);if(!section||section.title!==entry.section){section={title:entry.section,entries:[]};sections.push(section);}section.entries.push(entry);}
      const sectionRefs=sections.map(()=>context.nextRef());const chapterRefs=sections.map(section=>section.entries.map(()=>context.nextRef()));
      context.assign(outlineRef,context.obj({Type:'Outlines',First:rootRef,Last:rootRef,Count:1+sectionRefs.length+chapterRefs.flat().length}));
      context.assign(rootRef,context.obj({Title:PDFHexString.fromText('Appunti'),Parent:outlineRef,Dest:[entries[0].page.ref,PDFName.of('Fit')],First:sectionRefs[0],Last:sectionRefs.at(-1),Count:sectionRefs.length+chapterRefs.flat().length}));
      sections.forEach((section,sectionIndex)=>{const refs=chapterRefs[sectionIndex];context.assign(sectionRefs[sectionIndex],context.obj({Title:PDFHexString.fromText(section.title),Parent:rootRef,Dest:[section.entries[0].page.ref,PDFName.of('Fit')],First:refs[0],Last:refs.at(-1),Count:refs.length,...(sectionIndex?{Prev:sectionRefs[sectionIndex-1]}:{}),...(sectionIndex+1<sections.length?{Next:sectionRefs[sectionIndex+1]}:{})}));section.entries.forEach((entry,entryIndex)=>context.assign(refs[entryIndex],context.obj({Title:PDFHexString.fromText(entry.chapterTitle),Parent:sectionRefs[sectionIndex],Dest:[entry.page.ref,PDFName.of('Fit')],...(entryIndex?{Prev:refs[entryIndex-1]}:{}),...(entryIndex+1<refs.length?{Next:refs[entryIndex+1]}:{})})));});
      doc.catalog.set(PDFName.of('Outlines'),outlineRef);doc.catalog.set(PDFName.of('PageMode'),PDFName.of('UseOutlines'));
    }
    newPage();drawLines('PLUMEPILOT · APPUNTI DEL CORSO',{bold:true,size:11,color:colors.accent,after:18});drawLines(job.courseTitle,{bold:true,size:27,lineHeight:33,after:15});drawLines('Gli appunti sono organizzati per capitolo e video. L’indice e i segnalibri consentono di raggiungere rapidamente ogni capitolo.',{size:13,lineHeight:18,color:colors.muted,after:24});drawLines('Indice navigabile',{bold:true,size:16,color:colors.purple,after:10});
    chapters.forEach((chapter,index)=>{drawLines(`${index+1}. ${chapter.section} · ${chapter.chapterTitle}`,{size:11,color:colors.accent,after:7,onRow:(linkPage,top,lineHeight)=>links.push({page:linkPage,top,lineHeight,index})});});
    if(job.missing.length){newPage();drawLines('RACCOLTA PARZIALE',{bold:true,size:10,color:colors.accent,after:8});drawLines('Elementi non recuperati',{bold:true,size:21,after:14});for(const item of job.missing)drawLines(`${item.chapter}: ${item.reason}`,{size:11,color:colors.muted,after:7});}
    for(const [chapterIndex,chapter] of chapters.entries()){
      const chapterPage=newPage();entries.push({section:chapter.section,chapterTitle:chapter.chapterTitle,page:chapterPage});const number=String(chapter.chapterTitle||'').match(/^\s*(\d+)\s*-/)?.[1]||chapterIndex+1;
      drawLines(`APPUNTI · CAPITOLO ${number}`,{bold:true,size:10,color:colors.accent,after:8});drawLines(chapter.section,{bold:true,size:12,color:colors.purple,after:4});drawLines(chapter.chapterTitle,{bold:true,size:21,lineHeight:26,after:14});page.drawLine({start:{x:margin,y:y+5},end:{x:A4[0]-margin,y:y+5},thickness:.8,color:rgb255(colors.line)});y-=12;
      for(const [videoIndex,video] of chapter.videos.entries()){
        if(y<135)newPage();drawLines(`VIDEO ${videoIndex+1}`,{bold:true,size:9,color:colors.accent,after:4});drawLines(video.videoTitle,{bold:true,size:14,lineHeight:19,color:colors.purple,after:9});
        for(const [noteIndex,note] of video.notes.entries()){
          if(video.notes.length>1)drawLines(`Appunto ${noteIndex+1}`,{bold:true,size:9.5,color:colors.muted,after:5});for(const block of note.blocks)blockParagraph(block);if(noteIndex+1<video.notes.length){page.drawLine({start:{x:margin,y:y+8},end:{x:A4[0]-margin,y:y+8},thickness:.6,color:rgb255(colors.line)});y-=5;}
        }
        y-=10;
      }
      await new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resolve();};channel.port2.postMessage(null);});
    }
    for(const link of links){const target=entries[link.index]?.page;if(!target)continue;const annotation=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[margin,link.top-link.lineHeight+2,A4[0]-margin,link.top+11],Border:[0,0,0],C:colors.accent.map(value=>value/255),Dest:[target.ref,PDFName.of('Fit')]}));link.page.node.addAnnot(annotation);}
    addBookmarks();const pages=doc.getPages();pages.forEach((item,index)=>item.drawText(`${index+1} / ${pages.length}`,{x:A4[0]-margin-28,y:24,size:8.5,font:fonts[0],color:rgb255(colors.muted)}));
    return doc.save({useObjectStreams:true,addDefaultPage:false});
  }
  globalThis.PlumePilotNotesDocument=Object.freeze({html,pdf,plain});
})();
