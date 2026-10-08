import './weekly-bars.css'

const DO_STATES={done:{symbol:'V',label:'완료'},doing:{symbol:'△',label:'진행'},blocked:{symbol:'X',label:'막힘'},todo:{symbol:'-',label:'대기'}}
const PRIORITY_CLASS={high:'priority-high',medium:'priority-medium',low:'priority-low'}
let currentPlan=null
let currentTasks=[]
let observer=null
let renderTimer=null

const $=selector=>document.querySelector(selector)
const formatShortDate=value=>{if(!value)return'미정';const [,month,day]=value.split('-');return`${month}/${day}`}
const fmtPriority=value=>({high:'높음',medium:'보통',low:'낮음'})[value]||'기타'
const taskRange=task=>{const start=task.start_date||currentPlan?.start_date||null;const end=task.due_date||start;return{start,end,label:start&&end?`${formatShortDate(start)} → ${formatShortDate(end)}`:'기간 미정'}}
const taskPriorityClass=priority=>PRIORITY_CLASS[priority]||'priority-default'
const taskState=task=>DO_STATES[task.status]||DO_STATES.todo

async function getJson(url,options={}){
  const response=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options})
  let data={};try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(data.error||`HTTP_${response.status}`)
  return data
}

function weekBounds(start,end){
  if(!start||!end)return null
  const s=new Date(`${start}T00:00:00Z`),e=new Date(`${end}T00:00:00Z`)
  if(!Number.isFinite(s.getTime())||!Number.isFinite(e.getTime())||e<s)return null
  const monday=new Date(s);monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7))
  const sunday=new Date(e);sunday.setUTCDate(sunday.getUTCDate()+(6-((sunday.getUTCDay()+6)%7)))
  return{start:monday,end:sunday}
}

function updateLegend(){
  const panel=$('.weekly-panel'),copy=panel?.querySelector('.weekly-head .muted'),legend=panel?.querySelector('.weekly-legend')
  if(copy)copy.textContent='색상은 우선순위, 바 안의 V · △ · X · - 는 실행상태입니다. 바를 클릭하면 바로 수정할 수 있습니다.'
  if(legend)legend.innerHTML='<span><i class="priority-dot high"></i>높음</span><span><i class="priority-dot medium"></i>보통</span><span><i class="priority-dot low"></i>낮음</span><span><i class="priority-dot default"></i>기타</span>'
}

function renderWeeklyBars(){
  const box=$('#weekly-table')
  if(!box||!currentPlan)return
  const bounds=weekBounds(currentPlan.start_date,currentPlan.end_date)
  if(!bounds)return
  const dates=[]
  for(let d=new Date(bounds.start);d<=bounds.end&&dates.length<42;d.setUTCDate(d.getUTCDate()+1))dates.push(d.toISOString().slice(0,10))
  const weekdays=['일','월','화','수','목','금','토']
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  observer?.disconnect()
  box.textContent=''
  const grid=document.createElement('div');grid.className='weekly-grid weekly-grid-enhanced';grid.style.setProperty('--days',dates.length)
  const corner=document.createElement('div');corner.className='weekly-cell weekly-corner';corner.textContent='Task / 기간';corner.style.gridRow='1';corner.style.gridColumn='1';grid.append(corner)
  dates.forEach((date,index)=>{
    const d=new Date(`${date}T00:00:00Z`),header=document.createElement('div');header.className=`weekly-cell weekly-date ${date===today?'is-today':''}`;header.style.gridRow='1';header.style.gridColumn=String(index+2)
    const strong=document.createElement('strong');strong.textContent=weekdays[d.getUTCDay()];const small=document.createElement('small');small.textContent=formatShortDate(date);header.append(strong,small);grid.append(header)
  })
  if(!currentTasks.length){const empty=document.createElement('div');empty.className='weekly-empty';empty.textContent='작업을 추가하면 기간이 여기에 표시됩니다.';empty.style.gridColumn=`1 / span ${dates.length+1}`;empty.style.gridRow='2';grid.append(empty)}
  currentTasks.forEach((task,taskIndex)=>{
    const range=taskRange(task),row=taskIndex+2,label=document.createElement('div');label.className='weekly-cell weekly-task';label.style.gridRow=String(row);label.style.gridColumn='1'
    const strong=document.createElement('strong');strong.textContent=task.title;const small=document.createElement('small');small.textContent=range.label;label.append(strong,small);grid.append(label)
    dates.forEach((date,index)=>{const cell=document.createElement('div');cell.className=`weekly-cell weekly-day ${date===today?'is-today':''}`;cell.style.gridRow=String(row);cell.style.gridColumn=String(index+2);grid.append(cell)})
    if(!range.start||!range.end)return
    const first=dates[0],last=dates.at(-1);if(range.end<first||range.start>last)return
    const clippedStart=range.start<first?first:range.start,clippedEnd=range.end>last?last:range.end
    const startIndex=dates.indexOf(clippedStart),endIndex=dates.indexOf(clippedEnd);if(startIndex<0||endIndex<0)return
    const state=taskState(task),bar=document.createElement('button');bar.type='button';bar.className=`weekly-task-bar ${taskPriorityClass(task.priority)}`;bar.style.gridRow=String(row);bar.style.gridColumn=`${startIndex+2} / ${endIndex+3}`
    const title=document.createElement('span');title.className='weekly-task-bar-title';title.textContent=task.title
    const badge=document.createElement('span');badge.className='weekly-task-bar-state';badge.textContent=state.symbol;badge.title=state.label
    bar.append(title,badge);bar.title=`${task.title} · ${range.label} · 우선순위 ${fmtPriority(task.priority)} · ${state.label}`;bar.setAttribute('aria-label',`${task.title}, ${range.label}, 우선순위 ${fmtPriority(task.priority)}, ${state.label}. 클릭하여 수정`);bar.addEventListener('click',()=>openTaskModal(task));grid.append(bar)
  })
  box.append(grid);updateLegend();observeWeeklyTable()
}

function ensureModal(){
  if($('#task-modal'))return
  const dialog=document.createElement('dialog');dialog.id='task-modal';dialog.className='task-modal';dialog.setAttribute('aria-labelledby','task-modal-title')
  dialog.innerHTML=`<div class="task-modal-shell"><header class="task-modal-head"><div><p class="kicker">WEEKLY TASK</p><h2 id="task-modal-title">Task 상세</h2></div><button id="task-modal-close" class="ghost task-modal-close" type="button" aria-label="팝업 닫기">닫기</button></header><div class="task-modal-grid"><section class="task-modal-plan"><div class="panel-label">CURRENT PLAN</div><div id="modal-current-plan" class="modal-current-plan"></div></section><section class="task-modal-task"><div class="panel-label">EXECUTION TASKS</div><div class="modal-task-heading"><h3 id="modal-task-title">Task</h3><span id="modal-task-status" class="status-pill"></span></div><form id="modal-task-form" class="form-grid compact modal-task-form"><input name="id" type="hidden"/><label class="wide">작업명<input name="title" required/></label><label>시작일<input name="start_date" type="date"/></label><label>종료일<input name="due_date" type="date"/></label><label>우선순위<select name="priority"><option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option></select></label><label>태그<input name="tags" placeholder="widget, test"/></label><label>예상 시간(분)<input name="estimated_minutes" type="number" min="0" required/></label><label class="wide">설명<textarea name="description" rows="3"></textarea></label><label class="wide">막힘 사유<textarea name="blocker_reason" rows="2" placeholder="막힌 원인이나 다음에 풀 조건"></textarea></label><div class="actions wide"><button class="primary" type="submit">Task 수정 저장</button><button id="modal-task-cancel" class="ghost" type="button">취소</button></div></form></section></div></div>`
  document.body.append(dialog)
  $('#task-modal-close').addEventListener('click',closeTaskModal);$('#modal-task-cancel').addEventListener('click',closeTaskModal);dialog.addEventListener('click',event=>{if(event.target===dialog)closeTaskModal()});$('#modal-task-form').addEventListener('submit',saveModalTask)
}

function closeTaskModal(){const dialog=$('#task-modal');if(dialog?.open)dialog.close()}
function openTaskModal(task){
  ensureModal();const dialog=$('#task-modal'),form=$('#modal-task-form'),planBox=$('#modal-current-plan'),state=taskState(task);planBox.textContent=''
  const planTitle=document.createElement('strong');planTitle.textContent=currentPlan.title;const planMeta=document.createElement('small');planMeta.textContent=`${currentPlan.start_date} → ${currentPlan.end_date} · 우선순위 ${fmtPriority(currentPlan.priority)}`;const criteria=document.createElement('p');criteria.className='criteria';criteria.textContent=currentPlan.success_criteria;planBox.append(planTitle,planMeta,criteria)
  $('#modal-task-title').textContent=task.title;$('#modal-task-status').textContent=`${state.symbol} ${state.label}`;form.elements.id.value=task.id;form.elements.title.value=task.title;form.elements.start_date.value=task.start_date||currentPlan.start_date||'';form.elements.due_date.value=task.due_date||'';form.elements.priority.value=task.priority||'medium';form.elements.tags.value=(task.tags||[]).join(', ');form.elements.estimated_minutes.value=task.estimated_minutes??0;form.elements.description.value=task.description||'';form.elements.blocker_reason.value=task.blocker_reason||'';dialog.showModal();requestAnimationFrame(()=>form.elements.title.focus())
}

async function saveModalTask(event){
  event.preventDefault();const form=event.currentTarget,id=form.elements.id.value,start_date=form.elements.start_date.value||null,due_date=form.elements.due_date.value||null
  if(start_date&&due_date&&start_date>due_date){$('#status').textContent='종료일은 시작일보다 빠를 수 없습니다.';return}
  const body={id,title:form.elements.title.value.trim(),description:form.elements.description.value.trim(),start_date,due_date,priority:form.elements.priority.value,tags:form.elements.tags.value.split(',').map(value=>value.trim()).filter(Boolean),estimated_minutes:Number(form.elements.estimated_minutes.value),blocker_reason:form.elements.blocker_reason.value.trim()||null}
  try{await getJson('/api/pds/tasks',{method:'PATCH',body:JSON.stringify(body)});closeTaskModal();const select=$('#plan-select');select?.dispatchEvent(new Event('change',{bubbles:true}));$('#status').textContent='주간 일정에서 Task를 수정했습니다.';scheduleRefresh()}catch(error){$('#status').textContent=error.message}
}

async function refreshData(){
  const select=$('#plan-select'),planId=select?.value;if(!planId)return
  try{const [{plan},{tasks}]=await Promise.all([getJson(`/api/pds/plans?id=${encodeURIComponent(planId)}`),getJson(`/api/pds/tasks?plan_id=${encodeURIComponent(planId)}`)]);currentPlan=plan;currentTasks=tasks;renderWeeklyBars()}catch{}
}
function scheduleRefresh(){clearTimeout(renderTimer);renderTimer=setTimeout(refreshData,20)}
function observeWeeklyTable(){const box=$('#weekly-table');if(!box)return;observer??=new MutationObserver(()=>scheduleRefresh());observer.observe(box,{childList:true,subtree:true})}
function init(){ensureModal();observeWeeklyTable();$('#plan-select')?.addEventListener('change',()=>scheduleRefresh());scheduleRefresh()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()
