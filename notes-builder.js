(() => {
  'use strict';
  const $=id=>document.getElementById(id);let job;let busy=false;
  const message=payload=>new Promise((resolve,reject)=>chrome.runtime.sendMessage(payload,result=>chrome.runtime.lastError?reject(Error(chrome.runtime.lastError.message)):resolve(result)));
  const setBusy=value=>{busy=value;$('pdf').disabled=value;$('html').disabled=value;};
  async function build(format){
    if(busy||!job)return;
    setBusy(true);$('status').textContent='Creazione del documento…';
    let operationId;
    try{
      const tab = await new Promise(resolve => chrome.tabs.getCurrent(resolve));
      const acquired = await message({type:'PEGASO_ACQUIRE_OPERATION',kind:'notes',sourceTabId:tab.id});
      if(!acquired?.accepted)throw Error('Un’altra operazione è in corso. Riprova al termine.');
      operationId=acquired.operation.id;
      await message({type:'PEGASO_UPDATE_OPERATION',operationId,patch:{phase:'building',builderTabId:tab.id,message:'Creazione della raccolta appunti…'}});
      let blob;
      if(format==='html')blob=new Blob([PlumePilotNotesDocument.html(job)],{type:'text/html;charset=utf-8'});
      else{
        const fonts=await Promise.all(['Regular','Bold','Italic','BoldItalic'].map(async style=>{const response=await fetch(chrome.runtime.getURL(`vendor/standard_fonts/LiberationSans-${style}.ttf`));if(!response.ok)throw Error('Font non disponibile');return response.arrayBuffer();}));
        blob=new Blob([await PlumePilotNotesDocument.pdf(job,...fonts)],{type:'application/pdf'});
      }
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(job.courseTitle.replace(/[^a-zA-Z0-9]+/g,'-')||'corso')+'-appunti.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
      $('status').textContent='Documento creato. Download avviato.';
      const award=await message({type:'STUDYWING_ACHIEVEMENT_CLAIM',achievementId:'export-course-notes'});
      if(award?.accepted)$('status').textContent+=` Pensieri in viaggio: +${award.awardedExp} EXP.`;
    }catch(error){$('status').textContent='Esportazione non riuscita: '+error.message;}finally{if(operationId)await message({type:'PEGASO_RELEASE_OPERATION',operationId}).catch(()=>{});setBusy(false);}
  }
  $('pdf').onclick=()=>build('pdf');$('html').onclick=()=>build('html');
  async function start(){
    const id=new URLSearchParams(location.search).get('job');if(!/^[a-f0-9-]{36}$/i.test(id||''))throw Error('Identificativo raccolta non valido');
    const key='pegasoExportJob:'+id;
    job=await new Promise((resolve,reject)=>chrome.storage.local.get(key,result=>chrome.runtime.lastError?reject(Error(chrome.runtime.lastError.message)):resolve(result[key])));
    if(!job?.videos?.length||job.format!=='notes')throw Error('Raccolta non disponibile');
    $('title').textContent=job.courseTitle;
    for(const m of job.missing||[]){const li=document.createElement('li');li.textContent=m.chapter+': '+m.reason;$('missingList').append(li);} $('missing').hidden=!job.missing?.length;
    await new Promise(resolve=>chrome.storage.local.remove(key,resolve));
    await message({type:'PEGASO_RELEASE_OPERATION',operationId:job.operationId});
    $('status').textContent=`Appunti di ${job.videos.length} video pronti. Scegli uno o entrambi i formati.`;setBusy(false);
  }
  start().catch(async error=>{$('status').textContent=error.message;setBusy(true);if(job?.operationId)await message({type:'PEGASO_RELEASE_OPERATION',operationId:job.operationId}).catch(()=>{});});
})();
