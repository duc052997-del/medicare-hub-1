jest.mock('../src/config/supabase.config',()=>({from:jest.fn(),rpc:jest.fn()}));
const db=require('../src/config/supabase.config');
const c=require('../src/controllers/uc012.controller');
const id='11111111-1111-4111-8111-111111111111';
let res,q;
beforeEach(()=>{jest.clearAllMocks();res={status:jest.fn().mockReturnThis(),json:jest.fn().mockReturnThis()};q={};for(const k of ['select','order','eq','or','maybeSingle'])q[k]=jest.fn().mockReturnValue(q);q.then=(resolve)=>Promise.resolve({data:[],error:null}).then(resolve);db.from.mockReturnValue(q);});
test('empty list returns 200 and empty array',async()=>{await c.list({query:{}},res);expect(res.status).toHaveBeenCalledWith(200);expect(res.json.mock.calls[0][0].patients).toEqual([]);});
test('query object rejected',async()=>{await c.list({query:{q:{x:1}}},res);expect(res.status).toHaveBeenCalledWith(400);expect(db.from).not.toHaveBeenCalled();});
test('invalid UUID gives 404 without DB call',async()=>{await c.detail({params:{id:'bad'}},res);expect(res.status).toHaveBeenCalledWith(404);expect(db.from).not.toHaveBeenCalled();});
test('database failure is sanitized',async()=>{const log=jest.spyOn(console,'error').mockImplementation(()=>{});q.then=resolve=>Promise.resolve({error:{message:'secret'}}).then(resolve);await c.list({query:{}},res);expect(res.status).toHaveBeenCalledWith(500);expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret');log.mockRestore();});
test.each([['%', '%\\%%'], ['_', '%\\_%'], ['"', '%"%'], ['a,b', '%a,b%']])('search literal %s survives PostgREST unquoting',async(term,expected)=>{await c.list({query:{q:term}},res);const filter=q.or.mock.calls[0][0];const operand=filter.match(/\.ilike\.("(?:\\.|[^"\\])*")/)[1];expect(JSON.parse(operand)).toBe(expected);});

test('list flattens email without credentials',async()=>{q.then=resolve=>Promise.resolve({data:[{id,full_name:'A',account:{email:'a@example.com'}}]}).then(resolve);await c.list({query:{}},res);expect(res.json.mock.calls[0][0].patients[0]).toEqual({id,full_name:'A',email:'a@example.com'});expect(q.select.mock.calls[0][0]).not.toMatch(/password|\*/);});
test('missing patient',async()=>{q.then=resolve=>Promise.resolve({data:null}).then(resolve);await c.detail({params:{id}},res);expect(res.status).toHaveBeenCalledWith(404);});
test('detail scopes both histories to selected patient',async()=>{let n=0;q.then=resolve=>Promise.resolve({data:n++===0?{id,account:{email:'a@x.com'}}:[]}).then(resolve);await c.detail({params:{id}},res);expect(res.status).toHaveBeenCalledWith(200);expect(q.eq.mock.calls.filter(x=>x[0]==='patient_id')).toEqual([['patient_id',id],['patient_id',id]]);expect(res.json.mock.calls[0][0].patient.medical_records).toEqual([]);});

describe('HTTP authorization with real JWT middleware',()=>{
 let server,url;
 beforeAll(async()=>{process.env.JWT_SECRET='ci-test-only-secret';jest.resetModules();const express=require('express');const app=express();app.use(express.json());app.use('/api/admin',require('../src/routes/uc012.routes'));server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});url='http://127.0.0.1:'+server.address().port+'/api/admin/patients';});
 afterAll(()=>new Promise(resolve=>server.close(resolve)));
 test('no token 401',async()=>{expect((await fetch(url)).status).toBe(401);});
 test('patient 403',async()=>{const token=require('jsonwebtoken').sign({id,role:'PATIENT'},process.env.JWT_SECRET);expect((await fetch(url,{headers:{Authorization:'Bearer '+token}})).status).toBe(403);});
 test('forged token 401',async()=>{expect((await fetch(url,{headers:{Authorization:'Bearer invalid'}})).status).toBe(401);});
});
