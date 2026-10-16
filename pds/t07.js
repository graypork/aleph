import { AUTH_ERROR_MESSAGE, changePassword, getAccessToken, getSession, onAuthChange, signIn, signOut, signUp } from './auth.js'

const nativeFetch=window.fetch.bind(window)
const $=selector=>document.querySelector(selector)

function installT07UI(){
  const main=document.querySelector('main.app-shell')
  const auth=document.createElement('section')
  auth.id='auth-screen';auth.className='auth-screen';auth.setAttribute('aria-labelledby','auth-title')
  auth.insertAdjacentHTML('beforeend','<div class="auth-card"><a class="brand auth-brand" href="/pds/">Plan<span>Do</span>See</a><p class="eyebrow">PRIVATE DEVELOPMENT DIARY</p><h1 id="auth-title">내 기록으로 들어가기</h1><p class="auth-copy">로그인한 계정의 Plan · Do · See 기록만 표시됩니다.</p><form id="auth-form" class="auth-form"><label>이메일<input name="email" type="email" autocomplete="email" required></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><button class="button primary" type="submit">로그인</button><button id="sign-up-btn" class="button quiet" type="button">가입하기</button></form><p id="auth-status" class="auth-status" role="status" aria-live="polite"></p></div>')
  document.body.insertBefore(auth,main)
  const shell=document.createElement('div');shell.id='diary-shell';shell.hidden=true;main.before(shell);shell.append(main)

  const actions=main.querySelector('.topbar-actions')
  const email=document.createElement('span');email.id='account-email';email.className='account-email'
  const out=document.createElement('button');out.id='sign-out-btn';out.className='button quiet';out.type='button';out.textContent='로그아웃'
  actions.prepend(out);actions.prepend(email)
  const warning=main.querySelector('.warning');warning.textContent='로그인한 계정의 기록만 표시됩니다. 비밀번호·토큰·비밀키는 기록에 넣지 마세요.'
  warning.insertAdjacentHTML('beforebegin','<details class="account-panel"><summary>계정 · 보안</summary><div class="account-panel-body"><form id="password-form" class="form-grid compact"><label>현재 비밀번호<input name="current_password" type="password" autocomplete="current-password" required></label><label>새 비밀번호<input name="new_password" type="password" autocomplete="new-password" minlength="8" required></label><div class="actions wide"><button class="button quiet" type="submit">비밀번호 변경</button></div></form><div class="danger-zone"><p><strong>계정 삭제</strong><br>계정을 삭제하면 이 계정의 PlanDoSee 자료도 함께 삭제됩니다.</p><button id="delete-account-btn" class="button danger" type="button">계정과 내 자료 삭제</button></div></div></details>')
  main.querySelector('#see .review-workspace').insertAdjacentHTML('afterend','<article id="five-day-experiment" class="surface experiment-workspace"><div class="section-head"><div><div class="section-label">5-DAY CHECK</div><h2>계획 오차 5일 기록</h2></div><strong id="experiment-progress">0 / 5</strong></div><p id="experiment-question" class="muted"></p><div id="experiment-summary" class="experiment-summary"></div><form id="observation-form" class="form-grid compact"><label>날짜<input name="record_date" type="date" required></label><label>예상 시간(분)<input name="estimated_minutes" type="number" min="1" required></label><label>실제 시간(분)<input name="actual_minutes" type="number" min="0" required></label><label class="wide">메모<input name="note" placeholder="이상값이나 상황이 있으면 기록"></label><div class="actions wide"><button class="button primary" type="submit">오늘 기록 저장</button></div></form><div id="observation-list" class="observation-list"></div><form id="rule-change-form" class="rule-change-form"><div><strong>Day 2 뒤, Day 3 전에 규칙 1회 변경</strong><p class="muted">변경 후: 검증이 필요한 작업은 구현 예상시간에 검증시간 30%를 별도로 추가합니다.</p></div><label>변경 이유<input name="reason" placeholder="Day 1·2 결과를 보고 바꾸는 이유" required></label><button class="button quiet" type="submit">규칙 변경 기록</button></form><div id="rule-change-result"></div></article>')

  const style=document.createElement('style')
  style.textContent='.auth-screen{min-height:100vh;display:grid;place-items:center;padding:32px 20px;background:#f4f7f6}.auth-screen[hidden]{display:none}.auth-card{width:min(100%,420px);background:#fff;border:1px solid #dbe3e0;border-radius:20px;padding:32px;box-shadow:0 18px 50px rgba(20,40,34,.07)}.auth-brand{display:inline-block;margin-bottom:36px}.auth-card h1{margin:6px 0 10px;font-size:30px;letter-spacing:-.04em}.auth-copy{margin:0 0 26px;color:#67736f;line-height:1.6}.auth-form{display:grid;gap:14px}.auth-form label{display:grid;gap:7px;font-size:13px;font-weight:650;color:#36423e}.auth-form input{width:100%;box-sizing:border-box;border:1px solid #cfd9d5;border-radius:10px;padding:12px 13px;font:inherit;background:#fff}.auth-form input:focus{outline:2px solid #1f7563;outline-offset:2px}.auth-status{min-height:22px;margin:14px 0 0;color:#8a3f36;font-size:13px}.account-email{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#65716d}.account-panel{margin:0 auto 16px;max-width:1180px;border:1px solid #dbe3e0;border-radius:12px;background:#fff}.account-panel summary{cursor:pointer;padding:11px 14px;font-size:13px;font-weight:700}.account-panel-body{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:4px 14px 16px}.danger-zone{border-left:1px solid #e5e9e7;padding-left:20px}.button.danger{border-color:#cdb6b2;color:#8a3f36}.experiment-workspace{margin-top:20px}.experiment-summary{margin:14px 0 18px;font-size:14px;font-weight:700}.observation-list{display:grid;gap:8px;margin:18px 0}.observation-row{display:grid;grid-template-columns:minmax(150px,.5fr) 1fr;gap:8px 16px;padding:11px 0;border-bottom:1px solid #edf0ef}.observation-row small{grid-column:2;color:#68736f}.rule-change-form{margin-top:20px;padding-top:18px;border-top:1px solid #e4e9e7;display:grid;grid-template-columns:1.2fr 1fr auto;gap:14px;align-items:end}@media(max-width:720px){.account-panel-body,.rule-change-form{grid-template-columns:1fr}.danger-zone{border-left:0;border-top:1px solid #e5e9e7;padding:16px 0 0}.observation-row{grid-template-columns:1fr}.observation-row small{grid-column:1}}'
  document.head.append(style)
}
installT07UI()

window.fetch=async(input,init={})=>{
  const url=typeof input==='string'?input:input.url
  const isPdsApi=typeof url==='string'&&(url.startsWith('/api/pds/')||url.startsWith(`${location.origin}/api/pds/`))
  if(!isPdsApi)return nativeFetch(input,init)
  const token=await getAccessToken().catch(()=>null)
  const headers=new Headers(init.headers||(typeof input!=='string'?input.headers:undefined))
  if(token)headers.set('Authorization',`Bearer ${token}`)
  return nativeFetch(input,{...init,headers})
}

function showAuth(message=''){ $('#auth-screen').hidden=false;$('#diary-shell').hidden=true;$('#auth-status').textContent=message }
function showDiary(session){ $('#auth-screen').hidden=true;$('#diary-shell').hidden=false;$('#account-email').textContent=session?.user?.email||'';loadExperiment().catch(()=>{}) }

$('#auth-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;$('#auth-status').textContent='';try{const{session}=await signIn(form.elements.email.value.trim(),form.elements.password.value);if(session)location.reload()}catch{$('#auth-status').textContent=AUTH_ERROR_MESSAGE}})
$('#sign-up-btn').addEventListener('click',async()=>{const form=$('#auth-form');$('#auth-status').textContent='';try{const{session}=await signUp(form.elements.email.value.trim(),form.elements.password.value);if(session)location.reload();else $('#auth-status').textContent='가입 확인 후 로그인해 주세요.'}catch{$('#auth-status').textContent=AUTH_ERROR_MESSAGE}})
$('#sign-out-btn').addEventListener('click',async()=>{await signOut();location.reload()})
$('#password-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{await changePassword(form.elements.current_password.value,form.elements.new_password.value);alert('비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.');location.reload()}catch(error){alert(error.message)}finally{form.reset()}})
$('#delete-account-btn').addEventListener('click',async()=>{if(!confirm('계정을 삭제하면 내 PlanDoSee 자료도 함께 삭제됩니다. 계속할까요?'))return;const response=await fetch('/api/pds/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete_account'})});if(!response.ok)return alert('계정을 삭제하지 못했습니다.');await signOut().catch(()=>{});location.reload()})

function seoulToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function formatDateTime(value){return value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'—'}
async function experimentApi(options){const response=await fetch('/api/pds/experiment',options);const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'EXPERIMENT_FAILED');return data}
async function loadExperiment(){
  const data=await experimentApi()
  $('#experiment-question').textContent=`질문 · ${data.experiment.question} / 지표 · ${data.experiment.metric_name} (${data.experiment.unit})`
  $('#experiment-progress').textContent=`${data.observations.length} / 5`
  $('#experiment-summary').textContent=`합계 ${data.summary.sum}${data.experiment.unit} · 평균 ${data.summary.average}${data.experiment.unit}`
  const list=$('#observation-list');list.textContent=''
  data.observations.forEach((row,index)=>{const item=document.createElement('div');item.className='observation-row';const title=document.createElement('strong');title.textContent=`Day ${index+1} · ${row.record_date}`;const value=document.createElement('span');value.textContent=`예상 ${row.estimated_minutes}분 · 실제 ${row.actual_minutes}분 · 오차 ${row.metric_value}%`;item.append(title,value);if(row.note){const note=document.createElement('small');note.textContent=row.note;item.append(note)}list.append(item)})
  $('#rule-change-form').hidden=Boolean(data.rule_change)
  $('#rule-change-result').textContent=data.rule_change?`규칙 변경 기록됨 · ${formatDateTime(data.rule_change.changed_at)} · ${data.rule_change.reason}`:'아직 규칙을 변경하지 않았습니다.'
  if(!$('#observation-form').elements.record_date.value)$('#observation-form').elements.record_date.value=seoulToday()
}
$('#observation-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{await experimentApi({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'observation',record_date:form.elements.record_date.value,estimated_minutes:Number(form.elements.estimated_minutes.value),actual_minutes:Number(form.elements.actual_minutes.value),note:form.elements.note.value.trim()})});await loadExperiment()}catch(error){alert(error.message)}})
$('#rule-change-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{await experimentApi({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'rule_change',reason:form.elements.reason.value.trim()})});await loadExperiment()}catch(error){alert(error.message)}})

const initialSession=await getSession().catch(()=>null)
if(initialSession)showDiary(initialSession);else showAuth()
onAuthChange((event,session)=>{if(event==='SIGNED_OUT')showAuth();else if(event==='SIGNED_IN'&&session)showDiary(session)})
