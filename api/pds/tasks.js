import {
  completeTask as completeTaskRecord,
  createTask as createTaskRecord,
  getTask as getTaskRecord,
  listTasks as listTasksRecord,
  reopenTask as reopenTaskRecord,
  softDeleteTask as softDeleteTaskRecord,
  updateTask as updateTaskRecord,
} from '../../src/pds-server/task-store.js'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
const ALLOWED_FIELDS = ['plan_id','title','description','due_date','priority','tags','estimated_minutes']

function send(res,status,body){res.setHeader('Cache-Control','no-store');return res.status(status).json(body)}
function pick(input={}){return Object.fromEntries(ALLOWED_FIELDS.filter(k=>Object.prototype.hasOwnProperty.call(input,k)).map(k=>[k,input[k]]))}
function validTask(input,{partial=false}={}){
  if(!partial && (!input.plan_id || !input.title)) return false
  if(partial && Object.keys(input).length===0) return false
  if(Object.prototype.hasOwnProperty.call(input,'title') && (typeof input.title!=='string' || !input.title.trim())) return false
  if(Object.prototype.hasOwnProperty.call(input,'priority') && !['low','medium','high'].includes(input.priority)) return false
  if(Object.prototype.hasOwnProperty.call(input,'tags') && (!Array.isArray(input.tags) || input.tags.some(t=>typeof t!=='string'))) return false
  if(Object.prototype.hasOwnProperty.call(input,'estimated_minutes') && (!Number.isInteger(input.estimated_minutes) || input.estimated_minutes<0)) return false
  return true
}

export function sortTasks(tasks){
  return [...tasks].sort((a,b)=>{
    const ad=a.due_date||'9999-12-31', bd=b.due_date||'9999-12-31'
    return ad.localeCompare(bd) || (PRIORITY_RANK[a.priority]??9)-(PRIORITY_RANK[b.priority]??9) || String(a.created_at||'').localeCompare(String(b.created_at||'')) || String(a.id).localeCompare(String(b.id))
  })
}

export function createTasksHandler({listTasks=listTasksRecord,getTask=getTaskRecord,createTask=createTaskRecord,updateTask=updateTaskRecord,softDeleteTask=softDeleteTaskRecord,completeTask=completeTaskRecord,reopenTask=reopenTaskRecord}={}){
  return async function handler(req,res){
    try{
      if(req.method==='GET'){
        const planId=req.query?.plan_id
        if(!planId) return send(res,400,{error:'PLAN_ID_REQUIRED'})
        let tasks=await listTasks(String(planId))
        const q=String(req.query?.q||'').trim().toLowerCase()
        if(q) tasks=tasks.filter(t=>`${t.title} ${t.description||''}`.toLowerCase().includes(q))
        if(req.query?.status) tasks=tasks.filter(t=>t.status===req.query.status)
        if(req.query?.priority) tasks=tasks.filter(t=>t.priority===req.query.priority)
        if(req.query?.tag) tasks=tasks.filter(t=>(t.tags||[]).includes(req.query.tag))
        return send(res,200,{tasks:sortTasks(tasks),sort:'due_date asc → priority high-first → created_at asc → id asc'})
      }
      if(req.method==='POST'){
        const input=pick(req.body)
        if(!validTask(input)) return send(res,400,{error:'INVALID_TASK'})
        return send(res,201,{task:await createTask(input)})
      }
      if(req.method==='PATCH'){
        const id=req.body?.id
        if(!id) return send(res,400,{error:'INVALID_TASK_ID'})
        if(req.body?.action==='complete'){
          const key=req.body?.idempotency_key
          if(typeof key!=='string'||!key) return send(res,400,{error:'IDEMPOTENCY_KEY_REQUIRED'})
          await completeTask(id,key)
          return send(res,200,{task:await getTask(id)})
        }
        if(req.body?.action==='reopen'){
          await reopenTask(id)
          return send(res,200,{task:await getTask(id)})
        }
        const patch=pick(req.body)
        if(!validTask(patch,{partial:true})) return send(res,400,{error:'INVALID_TASK'})
        const task=await updateTask(id,patch)
        if(!task) return send(res,404,{error:'TASK_NOT_FOUND'})
        return send(res,200,{task})
      }
      if(req.method==='DELETE'){
        const id=req.body?.id||req.query?.id
        if(!id) return send(res,400,{error:'INVALID_TASK_ID'})
        const task=await softDeleteTask(String(id))
        if(!task) return send(res,404,{error:'TASK_NOT_FOUND'})
        return send(res,200,{task})
      }
      res.setHeader('Allow','GET, POST, PATCH, DELETE')
      return send(res,405,{error:'METHOD_NOT_ALLOWED'})
    }catch{return send(res,503,{error:'DATABASE_UNAVAILABLE'})}
  }
}

export default createTasksHandler()
