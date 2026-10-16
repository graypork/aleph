import { requireAuthenticatedUser, deleteAuthUser as deleteAuthUserRecord } from '../../src/pds-server/auth.js'
function send(res,status,body){res.setHeader('Cache-Control','no-store');return res.status(status).json(body)}
export function createAccountHandler({authenticate=requireAuthenticatedUser,deleteAuthUser=deleteAuthUserRecord}={}){
  return async function handler(req,res){
    try{
      const {user}=await authenticate(req)
      if(req.method==='DELETE'){
        await deleteAuthUser(user.id)
        return send(res,200,{deleted:true})
      }
      res.setHeader('Allow','DELETE');return send(res,405,{error:'METHOD_NOT_ALLOWED'})
    }catch(error){if(error?.statusCode===401)return send(res,401,{error:'AUTH_REQUIRED'});return send(res,503,{error:'ACCOUNT_DELETE_FAILED'})}
  }
}
export default createAccountHandler()
