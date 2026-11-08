'use strict';
(()=>{
 const $=q=>document.querySelector(q),dialog=$('#submission-dialog'),form=$('#submission-form'),preview=$('#submission-preview'),draft=$('#submission-draft'),notice=$('#submission-notice');
 if(!dialog||!form)return;
 const noticeText='Drafts stay on this page until it is reloaded. Nothing has been submitted.';
 $('#open-submit').onclick=()=>{window.Atlas?.closeWorkspacePanels();if(dialog.open)return;dialog.showModal();$('#submission-kind').focus({preventScroll:true});};
 $('#close-submission').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>$('#open-submit').focus({preventScroll:true}));
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dialog.close();}});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 const invalidate=()=>{preview.hidden=true;notice.textContent=noticeText;$('#submission-source').setCustomValidity('');};
 form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);
 form.addEventListener('submit',e=>{
  e.preventDefault();const subject=$('#submission-subject'),source=$('#submission-source');subject.setCustomValidity(subject.value.trim()?'':'Enter a name or title.');source.setCustomValidity('');
  if(source.value.trim()){try{const u=new URL(source.value.trim());if(!['http:','https:'].includes(u.protocol))throw new Error('Unsupported protocol');}catch{source.setCustomValidity('Use a complete http or https source link.');}}
  if(!form.reportValidity())return;
  const kind=$('#submission-kind').selectedOptions[0].textContent,affiliation=$('#submission-affiliation').value.trim(),notes=$('#submission-notes').value.trim();
  draft.value=['Indigenous Cinema Atlas — submission draft','DRAFT ONLY — NOT SUBMITTED','Type: '+kind,'Name or title: '+subject.value.trim(),affiliation?'Affiliation or community: '+affiliation:'',source.value.trim()?'Source: '+source.value.trim():'',notes?'Notes: '+notes:''].filter(Boolean).join('\n\n');
  preview.hidden=false;notice.textContent='Draft prepared. Review or copy it below. Nothing has been submitted.';draft.focus({preventScroll:true});preview.scrollIntoView?.({block:'nearest',behavior:'instant'});
 });
 $('#submission-subject').addEventListener('input',e=>e.target.setCustomValidity(''));
 $('#clear-submission').onclick=()=>{form.reset();$('#submission-subject').setCustomValidity('');$('#submission-source').setCustomValidity('');draft.value='';preview.hidden=true;notice.textContent='Draft cleared. Nothing has been submitted.';$('#submission-kind').focus();};
 $('#copy-submission').onclick=async()=>{if(!draft.value)return;try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(draft.value);notice.textContent='Draft copied. Nothing has been submitted.';}catch{draft.focus();draft.select();notice.textContent='Select and copy the draft text. Nothing has been submitted.';}};
})();
