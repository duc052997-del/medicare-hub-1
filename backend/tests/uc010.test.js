jest.mock('../src/config/supabase.config',()=>({from:jest.fn(),rpc:jest.fn()}));
const db=require('../src/config/supabase.config');
const c=require('../src/controllers/uc010.controller');
const id='11111111-1111-4111-8111-111111111111';
let res,q;
beforeEach(()=>{jest.clearAllMocks();res={status:jest.fn().mockReturnThis(),json:jest.fn().mockReturnThis()};q={};for(const k of ['select','order','eq','or','maybeSingle'])q[k]=jest.fn().mockReturnValue(q);q.then=(resolve)=>Promise.resolve({data:[],error:null}).then(resolve);db.from.mockReturnValue(q);});
test('empty list returns 200 and empty array',async()=>{await c.list({query:{}},res);expect(res.status).toHaveBeenCalledWith(200);expect(res.json.mock.calls[0][0].doctors).toEqual([]);});
test('query object rejected',async()=>{await c.list({query:{q:{x:1}}},res);expect(res.status).toHaveBeenCalledWith(400);expect(db.from).not.toHaveBeenCalled();});
test('invalid UUID gives 404 without DB call',async()=>{await c.detail({params:{id:'bad'}},res);expect(res.status).toHaveBeenCalledWith(404);expect(db.from).not.toHaveBeenCalled();});
test('database failure is sanitized',async()=>{const log=jest.spyOn(console,'error').mockImplementation(()=>{});q.then=resolve=>Promise.resolve({error:{message:'secret'}}).then(resolve);await c.list({query:{}},res);expect(res.status).toHaveBeenCalledWith(500);expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret');log.mockRestore();});
test.each([['%', '%\\%%'], ['_', '%\\_%'], ['"', '%"%'], ['a,b', '%a,b%']])('search literal %s survives PostgREST unquoting',async(term,expected)=>{await c.list({query:{q:term}},res);const filter=q.or.mock.calls[0][0];const operand=filter.match(/\.ilike\.("(?:\\.|[^"\\])*")/)[1];expect(JSON.parse(operand)).toBe(expected);});

const valid={full_name:'Bác sĩ A',specialty:'Nội',email:'a@example.com',phone:'0912345678',schedules:[{day_of_week:1,start_time:'08:00',end_time:'12:00',slot_minutes:30}]};
test.each(['full_name','specialty','email','phone'])('required %s',async(field)=>{await c.save({params:{},body:{...valid,[field]:''}},res);expect(res.status).toHaveBeenCalledWith(400);expect(db.rpc).not.toHaveBeenCalled();});
test('overlap rejected',async()=>{await c.save({params:{},body:{...valid,schedules:[valid.schedules[0],valid.schedules[0]]}},res);expect(res.status).toHaveBeenCalledWith(400);});
test('create uses atomic RPC',async()=>{db.rpc.mockResolvedValue({data:{id},error:null});await c.save({params:{},body:valid},res);expect(res.status).toHaveBeenCalledWith(201);expect(db.rpc).toHaveBeenCalledWith('uc010_save_doctor',expect.objectContaining({p_id:null}));});
test('update omitting schedules preserves omission',async()=>{db.rpc.mockResolvedValue({data:{id},error:null});const {schedules,...body}=valid;await c.save({params:{id},body},res);expect(res.status).toHaveBeenCalledWith(200);expect(db.rpc.mock.calls[0][1].p_body).not.toHaveProperty('schedules');});
test('duplicate email maps 409',async()=>{db.rpc.mockResolvedValue({error:{code:'23505'}});await c.save({params:{},body:valid},res);expect(res.status).toHaveBeenCalledWith(409);});
test('future appointment blocks delete',async()=>{db.rpc.mockResolvedValue({error:{message:'FUTURE_APPOINTMENTS'}});await c.remove({params:{id}},res);expect(res.status).toHaveBeenCalledWith(409);});
test('soft delete RPC success',async()=>{db.rpc.mockResolvedValue({error:null});await c.remove({params:{id}},res);expect(res.status).toHaveBeenCalledWith(200);expect(db.rpc).toHaveBeenCalledWith('uc010_delete_doctor',{p_id:id});});
test('inactive excluded by default',async()=>{await c.list({query:{}},res);expect(q.eq).toHaveBeenCalledWith('is_active',true);});
test('include inactive',async()=>{await c.list({query:{include_inactive:'true'}},res);expect(q.eq).not.toHaveBeenCalled();});

describe('reactivate',()=>{
 beforeEach(()=>{q.update=jest.fn().mockReturnValue(q);});
 test('invalid UUID 404 no DB',async()=>{await c.reactivate({params:{id:'bad'}},res);expect(res.status).toHaveBeenCalledWith(404);expect(db.from).not.toHaveBeenCalled();});
 test('success 200 sets is_active true only for inactive',async()=>{q.maybeSingle.mockResolvedValueOnce({data:{id,is_active:true},error:null});await c.reactivate({params:{id}},res);expect(q.update).toHaveBeenCalledWith({is_active:true});expect(q.eq).toHaveBeenCalledWith('is_active',false);expect(res.status).toHaveBeenCalledWith(200);expect(res.json.mock.calls[0][0].doctor.id).toBe(id);});
 test('not found 404',async()=>{q.maybeSingle.mockResolvedValue({data:null,error:null});await c.reactivate({params:{id}},res);expect(res.status).toHaveBeenCalledWith(404);});
 test('already active 409',async()=>{q.maybeSingle.mockResolvedValueOnce({data:null,error:null}).mockResolvedValueOnce({data:{id},error:null});await c.reactivate({params:{id}},res);expect(res.status).toHaveBeenCalledWith(409);});
 test('db error sanitized 500',async()=>{const log=jest.spyOn(console,'error').mockImplementation(()=>{});q.maybeSingle.mockResolvedValue({data:null,error:{message:'secret'}});await c.reactivate({params:{id}},res);expect(res.status).toHaveBeenCalledWith(500);expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret');log.mockRestore();});
});

describe('HTTP authorization with real JWT middleware',()=>{
 let server,url;
 beforeAll(async()=>{process.env.JWT_SECRET='ci-test-only-secret';jest.resetModules();const express=require('express');const app=express();app.use(express.json());app.use('/api/admin',require('../src/routes/uc010.routes'));server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});url='http://127.0.0.1:'+server.address().port+'/api/admin/doctors';});
 afterAll(()=>new Promise(resolve=>server.close(resolve)));
 test('no token 401',async()=>{expect((await fetch(url)).status).toBe(401);});
 test('patient 403',async()=>{const token=require('jsonwebtoken').sign({id,role:'PATIENT'},process.env.JWT_SECRET);expect((await fetch(url,{headers:{Authorization:'Bearer '+token}})).status).toBe(403);});
 test('forged token 401',async()=>{expect((await fetch(url,{headers:{Authorization:'Bearer invalid'}})).status).toBe(401);});
});
