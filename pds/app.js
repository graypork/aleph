const state={plans:[],currentPlan:null,tasks:[],workLogs:[],review:null,activeStage:'plan'}
const $=s=>document.querySelector(s)

function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(className)n.className=className;return n}
function setStatus(message,error=false){const n=$('#status');n.textContent=message;n.dataset.error=error?'1':'0'}
async function api(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||`HTTP_${r.status}`);return data}
function fmtPriority(v){return({high:'높음',medium:'보통',low:'낮음'})[v]||v}
function seoulToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function addDays(dateString,days){const d=new Date(`${dateString}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
function scrollToId(id){document.getElementById(id)?.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'})}

function setActiveStage(stage,{updateHash=true,focus=false}={}){
  if(!['plan','do','see'].includes(stage))stage='plan'
  state.activeStage=stage
  document.querySelectorAll('[data-stage-screen]').forEach(screen=>{screen.hidden=screen.dataset.stageScreen!==stage})
  document.querySelectorAll('[data-stage-tab]').forEach(tab=>{
    const active=tab.dataset.stageTab===stage
    tab.setAttribute('aria-selected',String(active))
    tab.classList.toggle('is-active',active)
    if(active&&focus)tab.focus({preventScroll:true})
  })
  if(updateHash&&location.hash!==`#${stage}`)history.replaceState(null,'',`#${stage}`)
  window.scrollTo({top:0,behavior:reducedMotion()?'auto':'smooth'})
}

function setTaskEditorOpen(open){
  const form=$('#task-form'),toggle=$('#toggle-task-editor')
  form.hidden=!open
  toggle.setAttribute('aria-expanded',String(open))
  toggle.textContent=open?'닫기':'작업 추가'
}

async function loadPlans(preferredId){
  const {plans}=await api('/api/pds/plans')
  state.plans=plans
  const select=$('#plan-select');select.textContent=''
  plans.forEach(p=>{const o=node('option',p.title);o.value=p.id;select.append(o)})
  if(!plans.length){
    state.currentPlan=null;state.tasks=[];state.workLogs=[];state.review=null
    fillPlanForm(null);renderPlan();renderTasks();renderDoChecklist();renderReview();setStatus('첫 Plan을 저장하세요.');return
  }
  const id=preferredId&&plans.some(p=>p.id===preferredId)?preferredId:(state.currentPlan?.id&&plans.some(p=>p.id===state.currentPlan.id)?state.currentPlan.id:plans[0].id)
  select.value=id
  await selectPlan(id)
}

async function selectPlan(id){
  const {plan}=await api(`/api/pds/plans?id=${encodeURIComponent(id)}`)
  state.currentPlan=plan
  state.review=null
  $('#plan-select').value=plan.id
  fillPlanForm(plan);renderPlan()
  await Promise.all([loadTasks(),loadWorkLogs(),loadReview()])
}

function fillPlanForm(plan){
  const f=$('#plan-form')
  const defaults={title:'Bookaive 상기 루프 MVP 완성 및 검증',start_date:'2026-10-07',end_date:'2026-10-14',priority:'high',success_criteria:'Bookaive에 저장된 기록이 상기 규칙에 따라 다시 선택되고, 위젯에서 노출되며, 위젯을 눌렀을 때 해당 기록으로 정상 이동하는 흐름을 검증한다.',estimated_minutes:480}
  const p=plan||defaults
  for(const k of ['title','start_date','end_date','priority','success_criteria','estimated_minutes'])f.elements[k].value=p[k]??''
}

function renderPlan(){
  const box=$('#plan-current');box.textContent=''
  const p=state.currentPlan
  $('#context-title').textContent=p?p.title:'새 Plan을 작성하세요.'
  if(!p){box.append(node('p','아직 저장된 Plan이 없습니다. 아래 기본값을 확인하고 저장하세요.','muted'));$('#revision-list').textContent='';renderDashboard();return}
  box.append(node('h3',p.title))
  const meta=node('div',undefined,'chips');[`${p.start_date} → ${p.end_date}`,`우선순위 ${fmtPriority(p.priority)}`,`예상 ${p.estimated_minutes}분`].forEach(v=>meta.append(node('span',v,'chip')));box.append(meta)
  box.append(node('p',p.success_criteria,'criteria'))
  const rev=$('#revision-list');rev.textContent=''
  if(!p.revisions?.length)rev.append(node('p','아직 수정 이력이 없습니다.','muted'))
  else p.revisions.forEach((r,i)=>{const card=node('article',undefined,'revision');card.append(node('strong',`이전 버전 ${p.revisions.length-i}`));card.append(node('p',r.title));card.append(node('small',`${r.start_date} ~ ${r.end_date} · ${fmtPriority(r.priority)} · ${r.estimated_minutes}분`));card.append(node('p',r.success_criteria));rev.append(card)})
  renderDashboard()
}

$('#plan-form').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget
  const body={title:f.elements.title.value.trim(),start_date:f.elements.start_date.value,end_date:f.elements.end_date.value,priority:f.elements.priority.value,success_criteria:f.elements.success_criteria.value.trim(),estimated_minutes:Number(f.elements.estimated_minutes.value)}
  try{
    if(state.currentPlan){body.id=state.currentPlan.id;await api('/api/pds/plans',{method:'PATCH',body:JSON.stringify(body)});setStatus('Plan 수정 완료. 이전 버전은 수정 이력에 보존됐습니다.')}
    else{const {plan}=await api('/api/pds/plans',{method:'POST',body:JSON.stringify(body)});setStatus('Plan 생성 완료.');await loadPlans(plan.id);return}
    await selectPlan(state.currentPlan.id)
  }catch(err){setStatus(err.message,true)}
})

$('#new-plan-btn').addEventListener('click',()=>{state.currentPlan=null;state.review=null;state.tasks=[];state.workLogs=[];fillPlanForm(null);renderPlan();renderTasks();renderDoChecklist();$('#plan-select').value='';setActiveStage('plan');$('#plan-form').closest('details').open=true;$('#plan-form').elements.title.focus()})
$('#plan-select').addEventListener('change',e=>selectPlan(e.target.value).catch(err=>setStatus(err.message,true)))

async function loadTasks(){
  if(!state.currentPlan){state.tasks=[];renderTasks();renderDoChecklist();renderDashboard();return}
  const {tasks}=await api(`/api/pds/tasks?plan_id=${encodeURIComponent(state.currentPlan.id)}`)
  state.tasks=tasks;renderTasks();renderDoChecklist();renderDashboard()
}

async function loadWorkLogs(){
  if(!state.currentPlan){state.workLogs=[];renderTasks();renderDoChecklist();renderDashboard();return}
  const {work_logs}=await api(`/api/pds/worklogs?plan_id=${encodeURIComponent(state.currentPlan.id)}`)
  state.workLogs=work_logs;renderTasks();renderDoChecklist();renderDashboard()
}

function blockedTaskIds(){return new Set(state.workLogs.filter(l=>l.blocker_reason&&l.blocker_reason.trim()).map(l=>l.task_id))}
function isOverdue(t){return t.status!=='done'&&t.due_date&&t.due_date<seoulToday()}
function taskVisualState(t,blocked){
  if(t.status==='done')return'done'
  if(blocked.has(t.id))return'blocked'
  if(isOverdue(t))return'overdue'
  return'todo'
}
function taskStatusLabel(t,blocked){const s=taskVisualState(t,blocked);return({done:'완료',blocked:'막힘',overdue:'지연',todo:'진행중'})[s]}

function renderTasks(){
  const list=$('#task-list');list.textContent=''
  const q=$('#task-search').value.trim().toLowerCase(),status=$('#status-filter').value,priority=$('#priority-filter').value,tag=$('#tag-filter').value.trim()
  const blocked=blockedTaskIds()
  let tasks=state.tasks.filter(t=>!q||`${t.title} ${t.description||''}`.toLowerCase().includes(q))
  if(status==='todo')tasks=tasks.filter(t=>t.status==='todo')
  if(status==='done')tasks=tasks.filter(t=>t.status==='done')
  if(status==='overdue')tasks=tasks.filter(isOverdue)
  if(status==='blocked')tasks=tasks.filter(t=>blocked.has(t.id))
  if(priority)tasks=tasks.filter(t=>t.priority===priority)
  if(tag)tasks=tasks.filter(t=>(t.tags||[]).includes(tag))
  if(!tasks.length){list.append(node('p','조건에 맞는 작업이 없습니다.','muted'));return}
  tasks.forEach(t=>{
    const card=document.createElement('details');card.className='task-card';card.dataset.taskId=t.id
    const summary=document.createElement('summary');summary.className='task-summary'
    const titleWrap=node('span',undefined,'task-summary-title');titleWrap.append(node('strong',t.title))
    const important=node('span',undefined,'task-summary-meta')
    const visual=taskVisualState(t,blocked)
    important.append(node('span',taskStatusLabel(t,blocked),`status-pill ${visual}`))
    important.append(node('small',t.due_date?`${t.due_date} · ${fmtPriority(t.priority)}`:fmtPriority(t.priority)))
    summary.append(titleWrap,important);card.append(summary)
    const detail=node('div',undefined,'task-detail')
    detail.append(node('p',`${t.due_date||'마감 없음'} · 우선순위 ${fmtPriority(t.priority)} · 예상 ${t.estimated_minutes}분 · ${(t.tags||[]).join(', ')||'태그 없음'}`,'task-meta'))
    if(t.description)detail.append(node('p',t.description,'task-description'))
    if(blocked.has(t.id))detail.append(node('p','이전 작업기록에 막힘 사유가 있습니다.','blocked-note'))
    const actions=node('div',undefined,'actions')
    const toggle=node('button',t.status==='done'?'재오픈':'완료','small-btn');toggle.type='button';toggle.addEventListener('click',()=>toggleTask(t));actions.append(toggle)
    const edit=node('button','수정','small-btn');edit.type='button';edit.addEventListener('click',()=>beginTaskEdit(t));actions.append(edit)
    const del=node('button','삭제','small-btn danger');del.type='button';del.addEventListener('click',()=>deleteTask(t));actions.append(del)
    detail.append(actions);card.append(detail)
    card.addEventListener('toggle',()=>{if(card.open)list.querySelectorAll('details.task-card[open]').forEach(other=>{if(other!==card)other.open=false})})
    list.append(card)
  })
}

function renderDoChecklist(){
  const list=$('#do-checklist'),summary=$('#do-checklist-summary')
  if(!list||!summary)return
  list.textContent=''
  const blocked=blockedTaskIds(),total=state.tasks.length,done=state.tasks.filter(t=>t.status==='done').length
  summary.textContent=total?`${done}/${total} 완료 · 체크하면 즉시 저장됩니다.`:'PLAN에서 작업을 추가하면 여기에 체크리스트가 만들어집니다.'
  if(!total){list.append(node('p','아직 실행할 작업이 없습니다.','muted do-empty'));return}
  const tasks=[...state.tasks].sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')||(a.due_date||'9999').localeCompare(b.due_date||'9999')||a.title.localeCompare(b.title))
  tasks.forEach(t=>{
    const label=document.createElement('label');label.className=`do-check-item ${t.status==='done'?'is-done':''}`
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=t.status==='done';checkbox.setAttribute('aria-label',`${t.title} 완료 여부`)
    checkbox.addEventListener('change',async()=>{checkbox.disabled=true;await toggleTask(t)})
    const copy=node('span',undefined,'do-check-copy');copy.append(node('strong',t.title))
    copy.append(node('small',t.due_date?`${t.due_date} · ${fmtPriority(t.priority)}`:`마감 없음 · ${fmtPriority(t.priority)}`))
    const visual=taskVisualState(t,blocked)
    label.append(checkbox,copy,node('span',taskStatusLabel(t,blocked),`status-pill ${visual}`))
    list.append(label)
  })
}

$('#task-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!state.currentPlan)return setStatus('먼저 Plan을 선택하세요.',true)
  const f=e.currentTarget,id=f.elements.id.value
  const fields={title:f.elements.title.value.trim(),description:f.elements.description.value.trim(),due_date:f.elements.due_date.value||null,priority:f.elements.priority.value,tags:f.elements.tags.value.split(',').map(v=>v.trim()).filter(Boolean),estimated_minutes:Number(f.elements.estimated_minutes.value)}
  try{
    if(id)await api('/api/pds/tasks',{method:'PATCH',body:JSON.stringify({id,...fields})})
    else await api('/api/pds/tasks',{method:'POST',body:JSON.stringify({plan_id:state.currentPlan.id,...fields})})
    resetTaskForm();setTaskEditorOpen(false);setStatus(id?'작업 수정 완료.':'작업 추가 완료.');await Promise.all([loadTasks(),loadReview()])
  }catch(err){setStatus(err.message,true)}
})

async function toggleTask(t){
  try{
    if(t.status==='done')await api('/api/pds/tasks',{method:'PATCH',body:JSON.stringify({id:t.id,action:'reopen'})})
    else await api('/api/pds/tasks',{method:'PATCH',body:JSON.stringify({id:t.id,action:'complete',idempotency_key:`complete-${t.id}-${crypto.randomUUID()}`})})
    await Promise.all([loadTasks(),loadReview()])
    setStatus(t.status==='done'?'체크를 해제했습니다.':'완료로 체크했습니다.')
  }catch(err){renderDoChecklist();setStatus(err.message,true)}
}
function resetTaskForm(){const f=$('#task-form');f.reset();f.elements.id.value='';f.elements.estimated_minutes.value=60;$('#task-submit').textContent='작업 추가';$('#cancel-task-edit').hidden=true}
function beginTaskEdit(t){setActiveStage('plan');setTaskEditorOpen(true);const f=$('#task-form');f.elements.id.value=t.id;f.elements.title.value=t.title;f.elements.due_date.value=t.due_date||'';f.elements.priority.value=t.priority;f.elements.tags.value=(t.tags||[]).join(', ');f.elements.estimated_minutes.value=t.estimated_minutes;f.elements.description.value=t.description||'';$('#task-submit').textContent='수정 저장';$('#cancel-task-edit').hidden=false;f.elements.title.focus()}
$('#toggle-task-editor').addEventListener('click',()=>{const willOpen=$('#task-form').hidden;if(willOpen)resetTaskForm();setTaskEditorOpen(willOpen);if(willOpen)$('#task-form').elements.title.focus()})
$('#cancel-task-edit').addEventListener('click',()=>{resetTaskForm();setTaskEditorOpen(false)})
async function deleteTask(t){if(!confirm(`'${t.title}' 작업을 삭제할까요?`))return;try{await api('/api/pds/tasks',{method:'DELETE',body:JSON.stringify({id:t.id})});await Promise.all([loadTasks(),loadWorkLogs(),loadReview()]);setStatus('작업을 삭제했습니다.')}catch(err){setStatus(err.message,true)}}
;['#task-search','#status-filter','#priority-filter','#tag-filter'].forEach(sel=>$(sel).addEventListener('input',renderTasks))

async function loadReview(){
  if(!state.currentPlan){state.review=null;$('#improvement').value='';renderReview();return}
  try{const {review}=await api(`/api/pds/review?plan_id=${encodeURIComponent(state.currentPlan.id)}`);state.review=review;$('#improvement').value=review.improvement||'';renderReview()}catch(err){state.review=null;$('#improvement').value='';renderReview();if(err.message!=='REVIEW_NOT_FOUND')setStatus(err.message,true)}
}

function getCycleProgress(){
  const p=state.currentPlan
  if(!p?.start_date||!p?.end_date)return{percent:0,caption:'기간 미설정',note:'Plan의 시작일과 종료일을 입력하세요.'}
  const day=86400000,start=Date.parse(`${p.start_date}T00:00:00Z`),end=Date.parse(`${p.end_date}T00:00:00Z`),today=Date.parse(`${seoulToday()}T00:00:00Z`)
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return{percent:0,caption:'기간 확인 필요',note:'Plan 기간을 확인하세요.'}
  const total=Math.max(1,Math.floor((end-start)/day)+1)
  if(today<start){const until=Math.ceil((start-today)/day);return{percent:0,caption:`시작 전 · D-${until}`,note:`${p.start_date} → ${p.end_date}`}}
  if(today>end)return{percent:100,caption:`${total} / ${total}일`,note:`${p.end_date}에 Cycle 종료`}
  const elapsed=Math.floor((today-start)/day)+1
  return{percent:Math.min(100,Math.round((elapsed/total)*100)),caption:`${elapsed} / ${total}일`,note:`${p.start_date} → ${p.end_date}`}
}

function renderDashboard(){
  const tasks=state.tasks,blocked=blockedTaskIds(),total=tasks.length
  const counts={done:0,todo:0,overdue:0,blocked:0}
  tasks.forEach(t=>{counts[taskVisualState(t,blocked)]+=1})
  const completion=total?Math.round((counts.done/total)*100):0
  $('#completion-ring').style.setProperty('--progress',`${completion}%`)
  $('#completion-value').textContent=`${completion}%`
  $('#completion-caption').textContent=`${counts.done} / ${total} 완료`
  const statusParts=[['done','완료'],['todo','진행'],['overdue','지연'],['blocked','막힘']]
  statusParts.forEach(([key])=>{$(`#status-${key}`).style.flexBasis=total?`${(counts[key]/total)*100}%`:'0%'})
  $('#status-caption').textContent=total?`완료 ${counts.done} · 진행 ${counts.todo} · 지연 ${counts.overdue} · 막힘 ${counts.blocked}`:'아직 작업 없음'
  const legend=$('#status-legend');legend.textContent=''
  statusParts.forEach(([key,label])=>{const item=node('span',undefined,'legend-item');item.append(node('i','',`legend-dot ${key}`),node('span',`${label} ${counts[key]}`));legend.append(item)})
  const cycle=getCycleProgress()
  $('#cycle-progress-fill').style.width=`${cycle.percent}%`
  $('#cycle-caption').textContent=cycle.caption
  $('#cycle-note').textContent=cycle.note
}

function renderOverview(){renderDashboard()}

function openMetricTarget(target,filter){
  if(target==='tasks'){
    setActiveStage('plan')
    if(filter!==undefined){$('#status-filter').value=filter;renderTasks()}
    requestAnimationFrame(()=>scrollToId('tasks'))
    return
  }
  setActiveStage(target)
}
function metricButton(label,value,target,filter){const b=node('button',undefined,'metric');b.type='button';b.append(node('span',label));b.append(node('strong',value));b.addEventListener('click',()=>openMetricTarget(target,filter));return b}
function renderReview(){
  renderDashboard()
  const box=$('#metrics');box.textContent='';const r=state.review
  if(!r){box.append(node('p','집계할 Plan이 없습니다.','muted'));return}
  const remaining=Math.max(0,Number(r.total_tasks||0)-Number(r.completed_tasks||0))
  box.append(metricButton('전체 작업',r.total_tasks,'tasks',''))
  box.append(metricButton('완료',r.completed_tasks,'tasks','done'))
  box.append(metricButton('미완료',remaining,'tasks','todo'))
  box.append(metricButton('지연',r.overdue_tasks,'tasks','overdue'))
  box.append(metricButton('막힘',r.blocked_tasks,'tasks','blocked'))
}

$('#review-form').addEventListener('submit',async e=>{e.preventDefault();if(!state.currentPlan)return;const improvement=$('#improvement').value.trim();try{await api('/api/pds/review',{method:'PATCH',body:JSON.stringify({plan_id:state.currentPlan.id,improvement})});setStatus('개선사항 저장 완료.');await loadReview()}catch(err){setStatus(err.message,true)}})
$('#carry-btn').addEventListener('click',async()=>{
  const improvement=$('#improvement').value.trim(),p=state.currentPlan;if(!p||!improvement)return setStatus('현재 Plan과 개선사항이 필요합니다.',true)
  const start=addDays(p.end_date,1),end=addDays(p.end_date,7)
  try{
    const {plan:next}=await api('/api/pds/plans',{method:'POST',body:JSON.stringify({title:`${p.title} · 다음 사이클`,start_date:start,end_date:end,priority:p.priority,success_criteria:`이전 회고 개선사항 반영: ${improvement}`,estimated_minutes:p.estimated_minutes})})
    await api('/api/pds/review',{method:'PATCH',body:JSON.stringify({plan_id:p.id,improvement,carried_to_plan_id:next.id})})
    setStatus('개선사항을 반영한 다음 Plan을 만들었습니다.');await loadPlans(next.id);setActiveStage('plan')
  }catch(err){setStatus(err.message,true)}
})

$('#export-btn').addEventListener('click',async()=>{try{const r=await fetch('/api/pds/export');if(!r.ok)throw new Error('EXPORT_FAILED');const blob=await r.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pds-export.json';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(a.href);setStatus('전체 데이터를 JSON 한 파일로 내보냈습니다.')}catch(err){setStatus(err.message,true)}})
document.querySelectorAll('[data-stage-tab]').forEach(tab=>tab.addEventListener('click',()=>setActiveStage(tab.dataset.stageTab,{focus:true})))
window.addEventListener('hashchange',()=>{const stage=location.hash.slice(1);if(['plan','do','see'].includes(stage)&&stage!==state.activeStage)setActiveStage(stage,{updateHash:false})})

const initialStage=['plan','do','see'].includes(location.hash.slice(1))?location.hash.slice(1):'plan'
setActiveStage(initialStage,{updateHash:false})
loadPlans().catch(err=>setStatus(err.message,true))
