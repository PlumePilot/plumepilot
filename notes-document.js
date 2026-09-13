(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain = note => note.blocks.map(b => (b.list ? '• ' : '') + b.runs.map(r => r.text).join('')).join('\n');
  function html(job) {
    const content = job.videos.map((video,index) => `<article id="v${index}" data-video-id="${escape(video.videoId)}"><h2>${escape(video.section)} · ${escape(video.chapterTitle)}</h2><h3>${escape(video.videoTitle)}</h3>${video.notes.map(note => `<section data-note-id="${escape(note.id)}" data-tracking-time="${escape(note.trackingTime)}">${note.blocks.map(b => `<p>${b.list ? '• ' : ''}${b.runs.map(r => `${r.bold?'<strong>':''}${r.italic?'<em>':''}${escape(r.text)}${r.italic?'</em>':''}${r.bold?'</strong>':''}`).join('')}</p>`).join('')}<details><summary>Modifica il testo nella copia</summary><label>Testo modificabile (formato semplice)<textarea aria-label="Testo modificabile">${escape(plain(note))}</textarea></label></details><label>Appunti integrativi<textarea aria-label="Appunti integrativi"></textarea></label></section>`).join('')}</article>`).join('');
    return `<!doctype html><html lang="it" data-theme="auto"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(job.courseTitle)} · Appunti</title><style>
    :root{color-scheme:light;--bg:#f6f2fa;--card:#fff;--text:#281d32;--line:#ddd2e5}html[data-theme=dark]{color-scheme:dark;--bg:#19151f;--card:#282130;--text:#f0e9f5;--line:#51445e}@media(prefers-color-scheme:dark){html[data-theme=auto]{color-scheme:dark;--bg:#19151f;--card:#282130;--text:#f0e9f5;--line:#51445e}}*{box-sizing:border-box}body{font:17px/1.6 system-ui;margin:0;background:var(--bg);color:var(--text)}header,main{max-width:900px;margin:auto;padding:24px}h1{line-height:1.2}article,nav{background:var(--card);padding:24px;border:1px solid var(--line);border-radius:16px;margin:20px 0}a{color:inherit}section{border-top:1px solid var(--line);padding:14px 0}p{white-space:pre-wrap;overflow-wrap:anywhere}textarea{display:block;width:100%;min-height:120px;padding:12px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:8px;font:inherit}button,select{font:inherit;padding:8px;margin:4px}label{display:block}small{opacity:.8}#dirty{font-weight:600}@media print{button,select,#dirty{display:none}article{break-before:page}}
    </style></head><body><header><small>PLUMEPILOT · APPUNTI DEL CORSO</small><h1>${escape(job.courseTitle)}</h1><p>Le integrazioni rimangono in questa copia e non modificano Pegaso. Scarica la copia aggiornata prima di chiudere.</p><button id="save">Scarica copia aggiornata</button><label>Tema <select id="theme"><option value="auto">Automatico</option><option value="light">Chiaro</option><option value="dark">Scuro</option></select></label><p id="dirty" role="status"></p></header><main>${job.missing.length ? `<aside><h2>Raccolta parziale</h2><ul>${job.missing.map(m=>`<li>${escape(m.chapter)}: ${escape(m.reason)}</li>`).join('')}</ul></aside>` : ''}<nav aria-label="Indice"><h2>Indice</h2>${job.videos.map((v,i)=>`<p><a href="#v${i}">${escape(v.section)} · ${escape(v.chapterTitle)} — ${escape(v.videoTitle)}</a></p>`).join('')}</nav>${content}</main><script>
    let dirty=false;const status=document.getElementById('dirty');const theme=document.getElementById('theme');theme.value=document.documentElement.dataset.theme;theme.onchange=()=>{document.documentElement.dataset.theme=theme.value;dirty=true;status.textContent='Modifiche da scaricare'};document.addEventListener('input',e=>{if(e.target.tagName==='TEXTAREA'){dirty=true;status.textContent='Modifiche da scaricare'}});window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});document.getElementById('save').onclick=()=>{const clone=document.documentElement.cloneNode(true);document.querySelectorAll('textarea').forEach((field,i)=>{clone.querySelectorAll('textarea')[i].textContent=field.value});clone.querySelector('#dirty').textContent='';const url=URL.createObjectURL(new Blob(['<!doctype html>'+clone.outerHTML],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='appunti-aggiornati.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);dirty=false;status.textContent='Download della copia aggiornata avviato'};
    </script></body></html>`;
  }
  async function pdf(job, fontBytes, boldBytes, italicBytes, boldItalicBytes = boldBytes) {
    const {PDFDocument, PDFName} = PDFLib;
    const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
    const fonts=await Promise.all([fontBytes,boldBytes,italicBytes,boldItalicBytes].map(bytes=>doc.embedFont(bytes,{subset:true})));
    const characters = new Map(fonts.map(font => [font, new Set(font.getCharacterSet())]));
    doc.setTitle(job.courseTitle + ' — Appunti');doc.setCreator('PlumePilot');
    let page;let y;const links=[];const destinations=[];const margin=48;const width=499;
    const newPage=()=>{page=doc.addPage([595,842]);y=786;};
    const safeText=(text,font)=>Array.from(String(text)).map(c=>{
      if(c==='\n'||c==='\t')return c==='\t'?'    ':c;
      if(!characters.get(font).has(c.codePointAt(0)))throw Error('Il PDF non supporta un simbolo presente negli appunti. Usa il formato HTML.');
      return c;
    }).join('');
    const line=(text,size=11,font=fonts[0],onRow=null)=>{
      let current='';const result=[];
      for(const token of safeText(text,font).split(/(\n|\s+)/)){
        if(token.includes('\n')){result.push(current);current='';continue;}
        if(current && font.widthOfTextAtSize(current+token,size)>width){result.push(current);current='';}
        for(const char of token){if(font.widthOfTextAtSize(current+char,size)>width){result.push(current);current='';}current+=char;}
      }
      if(current)result.push(current);
      for(const row of result){if(y<60)newPage();page.drawText(row,{x:margin,y,size,font});onRow?.(page,y);y-=size*1.5;}return result.length;
    };
    function blockParagraph(block) {
      let x=margin;
      const newline=()=>{y-=16.5;x=margin;if(y<60)newPage();};
      if(y<60)newPage();
      const runs=block.list?[{text:'• ',bold:false,italic:false},...block.runs]:block.runs;
      for(const run of runs){
        const font=fonts[run.bold?(run.italic?3:1):(run.italic?2:0)];
        for(const token of safeText(run.text,font).split(/(\n|[ \t]+)/)){
          if(token==='\n'){newline();continue;}
          if(!token)continue;
          const tokenWidth=font.widthOfTextAtSize(token,11);
          if(x>margin && x+tokenWidth>margin+width)newline();
          if(x===margin && /^\s+$/.test(token))continue;
          if(tokenWidth<=width){page.drawText(token,{x,y,size:11,font});x+=tokenWidth;}
          else for(const char of token){const w=font.widthOfTextAtSize(char,11);if(x+w>margin+width)newline();page.drawText(char,{x,y,size:11,font});x+=w;}
        }
      }
      y-=21.5;
    }
    newPage();line('PLUMEPILOT · APPUNTI DEL CORSO',11,fonts[1]);y-=12;line(job.courseTitle,22,fonts[1]);y-=20;line('Indice navigabile',16,fonts[1]);
    job.videos.forEach((v,i)=>{if(y<100)newPage();line(`${i+1}. ${v.section} · ${v.chapterTitle} — ${v.videoTitle}`,11,fonts[0],(page,top)=>links.push({page,top,index:i,rows:1}));y-=8;});
    if(job.missing.length){newPage();line('Raccolta parziale',18,fonts[1]);for(const m of job.missing)line(`${m.chapter}: ${m.reason}`);}
    for(const video of job.videos){newPage();destinations.push(page.ref);line(video.section,12,fonts[1]);line(video.chapterTitle,18,fonts[1]);line(video.videoTitle,14,fonts[1]);y-=16;for(const note of video.notes){for(const b of note.blocks)blockParagraph(b);y-=14;}
      await new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resolve();};channel.port2.postMessage(null);});
    }
    for(const link of links){const annotation=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[margin,Math.max(50,link.top-link.rows*16.5),547,link.top+12],Border:[0,0,0],Dest:[destinations[link.index],PDFName.of('Fit')]}));link.page.node.addAnnot(annotation);}
    const pages=doc.getPages();pages.forEach((p,i)=>p.drawText(`${i+1} / ${pages.length}`,{x:margin,y:28,size:9,font:fonts[0]}));
    return doc.save();
  }
  globalThis.PlumePilotNotesDocument=Object.freeze({html,pdf,plain});
})();
