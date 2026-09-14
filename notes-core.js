(() => {
  'use strict';
  // Parse into data only. No untrusted markup is ever attached to a document.
  function richText(body) {
    if (typeof body !== 'string' || body.length > 50000) throw new Error('NOTE_BODY_INVALID');
    const blocks = []; let runs = []; let bold = false; let italic = false; let list = false;
    const flush = () => { if (runs.some(r => r.text.trim())) blocks.push({ list, runs }); runs = []; };
    const source = body.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
    for (const token of source.split(/(<[^>]*>)/g)) {
      if (token.startsWith('<')) {
        const tag = token.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
        if (!tag) continue;
        const close = Boolean(tag[1]); const name = tag[2].toLowerCase();
        if (['p','div','br','li','ul','ol','h1','h2','h3'].includes(name)) flush();
        if (name === 'li') list = !close;
        if (['strong','b'].includes(name)) bold = !close;
        if (['em','i'].includes(name)) italic = !close;
        if (name === 'img') runs.push({ text: '[Immagine non inclusa]', bold: false, italic: true });
      } else if (token) {
        // Escape brackets before entity decoding, so DOMParser sees text only.
        const doc = new DOMParser().parseFromString('<body>' + token.replace(/</g,'&lt;').replace(/>/g,'&gt;'), 'text/html');
        runs.push({ text: doc.body.textContent.replace(/\u00a0/g, ' '), bold, italic });
      }
    }
    flush(); return blocks;
  }
  function normalize(body, courseCode, lpItemId) {
    if (Number(body?.code) !== 200 || !Array.isArray(body.data) || body.data.length > 500) throw new Error('NOTES_RESPONSE_INVALID');
    if (body.next_page_url || body.links?.next || body.meta?.current_page < body.meta?.last_page) throw new Error('NOTES_PAGINATION_UNSUPPORTED');
    const seen = new Set(); const notes = [];
    for (const row of body.data) {
      if (row.course_code !== courseCode || Number(row.lp_item_id) !== Number(lpItemId) || !Number.isSafeInteger(Number(row.id)) || Number(row.id) <= 0) throw new Error('NOTE_IDENTITY_MISMATCH');
      if (row.deleted_at != null) continue;
      if (seen.has(Number(row.id))) throw new Error('NOTE_DUPLICATE_ID');
      seen.add(Number(row.id));
      const blocks = richText(row.body);
      if (!blocks.length) continue;
      notes.push({ id: Number(row.id), blocks, trackingTime: typeof row.tracking_time === 'number' && Number.isFinite(row.tracking_time) ? row.tracking_time : null });
    }
    if (new TextEncoder().encode(JSON.stringify(notes)).length > 2 * 1024 * 1024) throw new Error('NOTES_TOO_LARGE');
    return { notes };
  }
  globalThis.PlumePilotNotes = Object.freeze({ richText, normalize });
})();
