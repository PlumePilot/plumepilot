import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const sourceDir = path.resolve(arg('--source', path.join(process.cwd(), 'docs', 'inside-plumepilot')));
const outputPath = path.resolve(arg('--output', path.join(sourceDir, 'Inside-PlumePilot.html')));

const chapters = [
  ['00-introduzione.md', '00', 'Introduzione', 'Dal problema al prodotto'],
  ['01-anatomia-estensione.md', '01', 'Anatomia di PlumePilot', 'Cosa succede quando l’estensione prende vita'],
  ['02-contesti-messaging.md', '02', 'Contesti e messaging', 'Far parlare mondi separati'],
  ['03-dom-pagine-dinamiche.md', '03', 'DOM e pagine dinamiche', 'Lavorare in una UI che non controlliamo'],
  ['04-api-reverse-engineering.md', '04', 'API e reverse engineering', 'Capire la piattaforma osservandone il traffico'],
  ['05-asincronia-javascript.md', '05', 'Asincronia JavaScript', 'Eventi, Promise, timeout e race condition'],
  ['06-stato-cache-storage.md', '06', 'Stato, cache e storage', 'Dove vive la verità'],
  ['07-autoplay-state-machine.md', '07', 'Autoplay come state machine', 'Stati, transizioni e guardie'],
  ['08-prima-attivita-incompleta.md', '08', 'Prima attività incompleta', 'Euristiche, master call e fallback'],
  ['09-generazione-documenti.md', '09', 'PDF, HTML ed EPUB', 'Pipeline, memoria e formati binari'],
  ['10-rich-text-editor.md', '10', 'Un piccolo rich-text editor', 'Selection, Range, liste e callout'],
  ['11-ui-senza-framework.md', '11', 'UI senza framework', 'Popup, menu fluttuante e sincronizzazione'],
  ['12-performance-memoria.md', '12', 'Performance e memoria', 'Quando il browser diventa il nostro runtime'],
  ['13-cross-browser.md', '13', 'Chrome, Edge e Firefox', 'Una base comune, runtime diversi'],
  ['14-debug-test-regressioni.md', '14', 'Debug, test e regressioni', 'Trasformare un bug in conoscenza permanente'],
  ['15-git-pr-release.md', '15', 'Git, PR e release engineering', 'Il software oltre il codice'],
  ['16-lezioni-architetturali.md', '16', 'Lezioni architetturali', 'I pattern emersi dal progetto reale'],
  ['17-cosa-rifaremmo-oggi.md', '17', 'Cosa rifaremmo diversamente oggi?', 'Una retrospettiva senza senno di poi'],
];

const extras = [
  ['glossario.md', 'glossario', 'Glossario', 'Termini e concetti del libro'],
  ['FONTI.md', 'fonti', 'Fonti e riferimenti', 'Documentazione primaria e approfondimenti'],
];

function ensureFile(file) {
  if (!fs.existsSync(file)) throw new Error(`File mancante: ${file}`);
}

function pandocFragment(markdown) {
  const result = spawnSync('pandoc', ['-f', 'gfm', '-t', 'html5', '--highlight-style=pygments'], {
    input: markdown,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error?.code === 'ENOENT') {
    throw new Error('Pandoc non trovato. Installa Pandoc e riprova.');
  }
  if (result.status !== 0) throw new Error(result.stderr || 'Pandoc ha restituito un errore.');
  return result.stdout;
}

function prefixIds(html, prefix) {
  const ids = [];
  html = html.replace(/id="([^"]+)"/g, (_, id) => {
    ids.push(id);
    return `id="${prefix}-${id}"`;
  });
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`href="#${escaped}"`, 'g'), `href="#${prefix}-${id}"`);
  }
  return html;
}

function normalizeLinks(html, currentPrefix) {
  const all = [...chapters, ...extras];
  for (const [filename, id] of all) {
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`href="${escaped}"`, 'g'), `href="#chapter-${id}"`);
    html = html.replace(new RegExp(`href="${escaped}#([^"]+)"`, 'g'), (_, anchor) => `href="#${id}-${anchor}"`);
  }
  html = html.replace(/href="https?:\/\/[^\"]+"/g, (m) => `${m} target="_blank" rel="noopener noreferrer"`);
  return html;
}

function transformMermaid(html) {
  return html.replace(/<pre class="mermaid"><code>([\s\S]*?)<\/code><\/pre>/g, (_, body) =>
    `<figure class="mermaid-fallback"><figcaption>Diagramma Mermaid</figcaption><pre><code>${body}</code></pre></figure>`
  );
}

function readAndRender(filename, id) {
  const full = path.join(sourceDir, filename);
  ensureFile(full);
  let md = fs.readFileSync(full, 'utf8');
  md = md.replace(/\n---\n\n\[←[^\n]+\n?\s*$/s, '').trimEnd() + '\n';
  let html = pandocFragment(md);
  html = prefixIds(html, id);
  html = normalizeLinks(html, id);
  html = transformMermaid(html);
  return html;
}

const rendered = [...chapters, ...extras].map(([filename, id, title, subtitle]) => ({
  filename,
  id,
  title,
  subtitle,
  html: readAndRender(filename, id),
}));

const sidebar = chapters.map(([, id, title]) => `<a class="chapter-link" data-chapter-link="${id}" href="#chapter-${id}"><span>${id}</span>${title}</a>`).join('\n');

const articleSections = rendered.map((item, index) => {
  const isExtra = item.id === 'glossario' || item.id === 'fonti';
  const chapterIndex = chapters.findIndex(([, id]) => id === item.id);
  const prev = !isExtra && chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const next = !isExtra && chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;
  const footer = isExtra ? `<nav class="chapter-footer"><a href="#chapter-00" data-book-nav="00">← Torna all'introduzione</a></nav>` : `
    <nav class="chapter-footer">
      ${prev ? `<a href="#chapter-${prev[1]}" data-book-nav="${prev[1]}">← ${prev[1]} · ${prev[2]}</a>` : '<span></span>'}
      ${next ? `<a href="#chapter-${next[1]}" data-book-nav="${next[1]}">${next[1]} · ${next[2]} →</a>` : '<a href="#chapter-glossario" data-book-nav="glossario">Glossario →</a>'}
    </nav>`;
  return `<section class="chapter" id="chapter-${item.id}" data-chapter="${item.id}" data-title="${escapeHtml(item.title)}" ${index ? 'hidden' : ''}>
    <div class="chapter-kicker">${isExtra ? 'Appendice' : `Capitolo ${item.id}`}</div>
    ${item.html}
    ${footer}
  </section>`;
}).join('\n');

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}

const css = String.raw`
:root{
  color-scheme:light dark;
  --bg:#f7f7f5;--panel:#ffffff;--text:#1f2328;--muted:#656d76;--line:#d0d7de;
  --accent:#3157d5;--accent-soft:#eaf0ff;--code:#f2f4f7;--quote:#eef2f7;--shadow:0 16px 40px rgba(0,0,0,.08);
  --sidebar:320px;--content:860px;
}
html[data-theme="dark"]{--bg:#0f1115;--panel:#171a21;--text:#e6edf3;--muted:#9aa4b2;--line:#30363d;--accent:#8aa4ff;--accent-soft:#202a4a;--code:#11151b;--quote:#151d29;--shadow:0 16px 45px rgba(0,0,0,.32)}
@media(prefers-color-scheme:dark){html:not([data-theme="light"]){--bg:#0f1115;--panel:#171a21;--text:#e6edf3;--muted:#9aa4b2;--line:#30363d;--accent:#8aa4ff;--accent-soft:#202a4a;--code:#11151b;--quote:#151d29;--shadow:0 16px 45px rgba(0,0,0,.32)}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.72 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{color:var(--accent);text-underline-offset:3px}.progress{position:fixed;z-index:100;top:0;left:0;height:3px;width:0;background:var(--accent);transition:width .08s linear}
.sidebar{position:fixed;inset:0 auto 0 0;width:var(--sidebar);background:var(--panel);border-right:1px solid var(--line);overflow:auto;padding:22px 18px 40px;z-index:40}
.brand{display:block;color:var(--text);font-size:1.18rem;font-weight:800;text-decoration:none;margin:6px 8px 2px}.brand-sub{color:var(--muted);font-size:.82rem;margin:0 8px 18px}
.search-wrap{position:relative;margin:0 4px 14px}.search-wrap input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);outline:none}.search-wrap input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.search-results{display:none;margin:5px 0 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel);max-height:330px;overflow:auto}.search-results.open{display:block}.search-result{display:block;padding:9px 10px;border-bottom:1px solid var(--line);color:var(--text);text-decoration:none;font-size:.86rem}.search-result:last-child{border-bottom:0}.search-result strong{color:var(--accent)}.search-result small{display:block;color:var(--muted);margin-top:2px}
.chapter-link{display:grid;grid-template-columns:30px 1fr;gap:8px;padding:8px 10px;border-radius:9px;color:var(--text);text-decoration:none;font-size:.88rem}.chapter-link span{font-variant-numeric:tabular-nums;color:var(--muted)}.chapter-link:hover,.chapter-link.active{background:var(--accent-soft);color:var(--accent)}
.sidebar-section{margin:18px 8px 7px;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.09em;font-weight:800}.section-toc{margin:6px 4px 12px;padding-left:10px;border-left:1px solid var(--line)}.section-toc a{display:block;padding:4px 8px;color:var(--muted);font-size:.78rem;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.section-toc a.level-3{padding-left:20px}.section-toc a.active{color:var(--accent);font-weight:700}
.sidebar-tools{display:grid;grid-template-columns:1fr auto;gap:8px;margin:16px 4px}.sidebar-tools select,.icon-btn{border:1px solid var(--line);background:var(--bg);color:var(--text);border-radius:9px;padding:8px 10px}.icon-btn{cursor:pointer}
main{margin-left:var(--sidebar);min-height:100vh;padding:42px 32px 90px}.reader{max-width:var(--content);margin:0 auto;background:var(--panel);border:1px solid var(--line);box-shadow:var(--shadow);border-radius:18px;padding:56px clamp(26px,6vw,72px) 64px}.chapter-kicker{color:var(--accent);font-size:.76rem;text-transform:uppercase;letter-spacing:.12em;font-weight:800;margin-bottom:8px}
h1,h2,h3,h4{line-height:1.25;scroll-margin-top:30px}h1{font-size:clamp(2rem,5vw,3.1rem);letter-spacing:-.035em;margin:0 0 30px}h2{font-size:1.65rem;margin-top:2.8em;padding-top:.25em;border-top:1px solid var(--line)}h3{font-size:1.25rem;margin-top:2.1em}h4{font-size:1.05rem;margin-top:1.8em}p,li{max-width:78ch}hr{border:0;border-top:1px solid var(--line);margin:2.8rem 0}blockquote{margin:1.5rem 0;padding:12px 18px;border-left:4px solid var(--accent);background:var(--quote);border-radius:0 10px 10px 0;color:var(--muted)}
pre{overflow:auto;padding:16px 18px;border:1px solid var(--line);background:var(--code);border-radius:11px;line-height:1.5;font-size:.9rem}code{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace}p code,li code{background:var(--code);border:1px solid var(--line);padding:.12em .34em;border-radius:5px;font-size:.9em}.sourceCode{overflow:auto}.sourceCode pre{margin:1.3rem 0}.kw,.cf{color:#9c36b5;font-weight:600}.st,.vs{color:#16794b}.co{color:#7a828e;font-style:italic}.fu{color:#1f6feb}.dv,.fl{color:#ad4e00}.op{color:#57606a}.dt,.bu{color:#0550ae}
table{border-collapse:collapse;width:100%;display:block;overflow:auto;margin:1.5rem 0}th,td{border:1px solid var(--line);padding:9px 12px;vertical-align:top}th{background:var(--code);text-align:left}img,svg{max-width:100%;height:auto}.mermaid-fallback{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:1.7rem 0;background:var(--code)}.mermaid-fallback figcaption{padding:8px 12px;border-bottom:1px solid var(--line);font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em}.mermaid-fallback pre{margin:0;border:0;border-radius:0;background:transparent}
.chapter-footer{display:flex;justify-content:space-between;gap:20px;margin-top:4rem;padding-top:1.5rem;border-top:1px solid var(--line)}.chapter-footer a{text-decoration:none;font-weight:700}.appendix-links{display:grid;gap:5px}
.mobile-bar{display:none;position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--panel) 93%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);padding:10px 12px;align-items:center;gap:10px}.mobile-bar strong{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.overlay{display:none}
mark{background:#ffe066;color:#1f2328;border-radius:3px;padding:0 .08em}
@media(max-width:900px){.sidebar{transform:translateX(-105%);transition:transform .2s ease;width:min(88vw,340px);box-shadow:var(--shadow)}body.sidebar-open .sidebar{transform:none}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:35}body.sidebar-open .overlay{display:block}.mobile-bar{display:flex}main{margin-left:0;padding:20px 12px 64px}.reader{border-radius:13px;padding:34px 22px 44px}.chapter-footer{flex-direction:column}}
@media print{.sidebar,.mobile-bar,.progress,.overlay,.chapter-footer{display:none!important}main{margin:0;padding:0}.reader{max-width:none;border:0;box-shadow:none;padding:0}.chapter[hidden]{display:block!important}.chapter{break-before:page}body{background:#fff;color:#000;font-size:11pt}a{color:#000;text-decoration:none}h1{font-size:26pt}h2{font-size:18pt}.mermaid-fallback{break-inside:avoid}}
`;

const js = String.raw`
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const chapters = $$('.chapter');
  const links = $$('[data-chapter-link]');
  const sidebar = $('.sidebar');
  const toc = $('#sectionToc');
  const search = $('#bookSearch');
  const searchResults = $('#searchResults');
  const title = $('#mobileTitle');
  const progress = $('#progress');
  const theme = $('#themeSelect');
  const storage = {
    get(k){try{return localStorage.getItem(k)}catch{return null}},
    set(k,v){try{localStorage.setItem(k,v)}catch{}}
  };
  const ids = chapters.map(c => c.dataset.chapter);
  let active = '00';
  let currentHeading = null;

  function chapterEl(id){ return document.getElementById('chapter-' + id); }
  function buildToc(ch){
    toc.textContent='';
    const heads = $$('h2[id],h3[id]', ch).slice(0,140);
    if(!heads.length){ toc.parentElement.hidden=true; return; }
    toc.parentElement.hidden=false;
    for(const h of heads){
      const a=document.createElement('a');
      a.href='#'+h.id; a.textContent=h.textContent.trim();
      a.className=h.tagName==='H3'?'level-3':'';
      a.addEventListener('click',e=>{e.preventDefault(); h.scrollIntoView({block:'start'}); history.replaceState(null,'','#'+h.id); save(); closeSidebar();});
      toc.append(a);
    }
  }
  function setActiveLink(id){ links.forEach(a=>a.classList.toggle('active',a.dataset.chapterLink===id)); }
  function showChapter(id,{anchor=null,top=true,historyMode='replace'}={}){
    if(!chapterEl(id)) id='00';
    active=id;
    chapters.forEach(c=>c.hidden=c.dataset.chapter!==id);
    setActiveLink(id);
    const ch=chapterEl(id); buildToc(ch); title.textContent=ch.dataset.title || 'Inside PlumePilot';
    if(historyMode!=='none') history[historyMode+'State']?.(null,'',anchor ? '#'+anchor : '#chapter-'+id);
    requestAnimationFrame(()=>{
      if(anchor && document.getElementById(anchor)) document.getElementById(anchor).scrollIntoView({block:'start'});
      else if(top) window.scrollTo({top:0});
      updateProgress(); updateCurrentHeading(); save();
    });
  }
  function parseHash(){
    const raw=location.hash.slice(1);
    if(!raw) return null;
    if(raw.startsWith('chapter-')) return {id:raw.slice(8),anchor:null};
    const match=raw.match(/^([0-9]{2}|glossario|fonti)-/);
    if(match) return {id:match[1],anchor:raw};
    return null;
  }
  function save(){
    storage.set('inside-plumepilot-state', JSON.stringify({chapter:active,anchor:currentHeading?.id || null,scrollY:window.scrollY}));
  }
  function restore(){
    const hash=parseHash();
    if(hash){showChapter(hash.id,{anchor:hash.anchor,top:!hash.anchor,historyMode:'none'}); return;}
    try{
      const state=JSON.parse(storage.get('inside-plumepilot-state')||'null');
      if(state?.chapter && chapterEl(state.chapter)){
        showChapter(state.chapter,{anchor:state.anchor,top:false,historyMode:'replace'});
        if(!state.anchor && Number.isFinite(state.scrollY)) requestAnimationFrame(()=>window.scrollTo({top:state.scrollY}));
        return;
      }
    }catch{}
    showChapter('00',{historyMode:'replace'});
  }
  function updateProgress(){
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    progress.style.width=Math.min(100,(scrollY/max)*100)+'%';
  }
  function updateCurrentHeading(){
    const ch=chapterEl(active); if(!ch) return;
    const heads=$$('h2[id],h3[id]',ch);
    let cur=null;
    for(const h of heads){if(h.getBoundingClientRect().top<=150) cur=h; else break;}
    currentHeading=cur;
    $$('#sectionToc a').forEach(a=>a.classList.toggle('active',cur && a.getAttribute('href')==='#'+cur.id));
  }
  let saveTimer;
  addEventListener('scroll',()=>{updateProgress();updateCurrentHeading();clearTimeout(saveTimer);saveTimer=setTimeout(save,180)},{passive:true});
  addEventListener('hashchange',()=>{const h=parseHash();if(h) showChapter(h.id,{anchor:h.anchor,top:!h.anchor,historyMode:'none'});});

  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#"]'); if(!a) return;
    const target=a.getAttribute('href').slice(1); if(!target) return;
    const el=document.getElementById(target); if(!el) return;
    const ch=el.closest('.chapter'); if(!ch) return;
    e.preventDefault(); showChapter(ch.dataset.chapter,{anchor:target.startsWith('chapter-')?null:target,top:target.startsWith('chapter-'),historyMode:'push'}); closeSidebar();
  });

  function openSidebar(){document.body.classList.add('sidebar-open')}
  function closeSidebar(){document.body.classList.remove('sidebar-open')}
  $('#menuBtn').addEventListener('click',openSidebar); $('#closeSidebar').addEventListener('click',closeSidebar); $('#overlay').addEventListener('click',closeSidebar);

  const storedTheme=storage.get('inside-plumepilot-theme')||'system'; theme.value=storedTheme; applyTheme(storedTheme);
  function applyTheme(v){document.documentElement.dataset.theme=v==='system'?'':v; storage.set('inside-plumepilot-theme',v)}
  theme.addEventListener('change',()=>applyTheme(theme.value));

  const searchBlocks=[];
  for(const ch of chapters){
    const blocks=$$('h1,h2,h3,p,li,figcaption',ch);
    blocks.forEach((el,i)=>{ if(!el.id) el.id='search-'+ch.dataset.chapter+'-'+i; const text=el.textContent.replace(/\s+/g,' ').trim(); if(text.length>10) searchBlocks.push({chapter:ch.dataset.chapter,id:el.id,text,title:ch.dataset.title}); });
  }
  function snippet(text,q){const lower=text.toLowerCase(),i=lower.indexOf(q);const start=Math.max(0,i-55),end=Math.min(text.length,i+q.length+90);return (start?'…':'')+text.slice(start,end)+(end<text.length?'…':'')}
  function runSearch(){
    const q=search.value.trim().toLowerCase(); searchResults.textContent='';
    if(q.length<2){searchResults.classList.remove('open');return}
    const found=searchBlocks.filter(x=>x.text.toLowerCase().includes(q)).slice(0,28);
    for(const x of found){const a=document.createElement('a');a.href='#'+x.id;a.className='search-result';const sn=snippet(x.text,q);a.innerHTML='<strong>'+escapeHtml(x.title)+'</strong><small>'+escapeHtml(sn)+'</small>';searchResults.append(a)}
    if(!found.length){const d=document.createElement('div');d.className='search-result';d.textContent='Nessun risultato';searchResults.append(d)}
    searchResults.classList.add('open');
  }
  search.addEventListener('input',runSearch);
  function escapeHtml(s){return s.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

  $('#prevBtn').addEventListener('click',()=>move(-1)); $('#nextBtn').addEventListener('click',()=>move(1));
  function move(delta){const i=ids.indexOf(active),n=ids[i+delta]; if(n) showChapter(n,{historyMode:'push'});}
  addEventListener('keydown',e=>{
    if(e.key==='/' && !/input|textarea/i.test(document.activeElement.tagName)){e.preventDefault();search.focus();openSidebar()}
    if(e.key==='Escape'){searchResults.classList.remove('open');closeSidebar()}
    if(e.altKey && e.key==='ArrowLeft'){e.preventDefault();move(-1)}
    if(e.altKey && e.key==='ArrowRight'){e.preventDefault();move(1)}
  });

  restore();
})();
`;

const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Inside PlumePilot — Anatomia di una browser extension reale</title>
<meta name="description" content="JavaScript, WebExtensions, DOM, API, asincronia e software engineering attraverso PlumePilot.">
<style>${css}</style>
</head>
<body>
<div class="progress" id="progress"></div>
<div class="overlay" id="overlay"></div>
<header class="mobile-bar"><button class="icon-btn" id="menuBtn" aria-label="Apri indice">☰</button><strong id="mobileTitle">Inside PlumePilot</strong><button class="icon-btn" id="prevBtn" aria-label="Capitolo precedente">←</button><button class="icon-btn" id="nextBtn" aria-label="Capitolo successivo">→</button></header>
<aside class="sidebar" aria-label="Indice del libro">
  <button class="icon-btn" id="closeSidebar" style="float:right" aria-label="Chiudi indice">×</button>
  <a class="brand" href="#chapter-00">Inside PlumePilot</a>
  <div class="brand-sub">Anatomia di una browser extension reale</div>
  <div class="search-wrap"><input id="bookSearch" type="search" placeholder="Cerca nel libro…" aria-label="Cerca nel libro"><div class="search-results" id="searchResults"></div></div>
  <div class="sidebar-section">Capitoli</div>
  ${sidebar}
  <div class="sidebar-section">Appendici</div>
  <div class="appendix-links"><a class="chapter-link" data-chapter-link="glossario" href="#chapter-glossario"><span>•</span>Glossario</a><a class="chapter-link" data-chapter-link="fonti" href="#chapter-fonti"><span>•</span>Fonti</a></div>
  <div id="sectionWrap"><div class="sidebar-section">In questo capitolo</div><nav class="section-toc" id="sectionToc"></nav></div>
  <div class="sidebar-tools"><select id="themeSelect" aria-label="Tema"><option value="system">Tema: sistema</option><option value="light">Tema: chiaro</option><option value="dark">Tema: scuro</option></select><button class="icon-btn" onclick="window.print()" title="Stampa / salva PDF">⎙</button></div>
  <div class="brand-sub">Offline · nessun tracking · nessuna dipendenza remota<br><br>Scorciatoie: <strong>/</strong> cerca · <strong>Alt+←/→</strong> capitoli</div>
</aside>
<main><div class="reader">${articleSections}</div></main>
<script>${js}</script>
</body></html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Creato ${outputPath}`);
console.log(`${Math.round(Buffer.byteLength(html)/1024)} KiB · ${rendered.length} sezioni`);