const db=require('../config/supabase.config');
const {success,fail,serverError}=require('../utils/response');
const {UUID_REGEX}=require('../utils/schedule');
const fields='id,patient_code,full_name,phone,date_of_birth,gender,account:users(email)';
const flatten=({account,...p})=>({...p,email:account?.email??null});
exports.list=async(req,res)=>{
  if(req.query.q!==undefined&&typeof req.query.q!=='string') return fail(res,400,'Thông tin không hợp lệ',{field:'q'});
  try{
    let q=db.from('patients').select(fields).order('full_name').order('id');
    if(req.query.q?.trim()){
      const p=JSON.stringify('%' + req.query.q.trim().replace(/[\\%_]/g, '\\$&') + '%');
      q=q.or(`full_name.ilike.${p},patient_code.ilike.${p},phone.ilike.${p}`);
    }
    const {data,error}=await q;if(error)throw error;
    return success(res,200,data?.length?'Lấy danh sách bệnh nhân thành công':'Không tìm thấy bệnh nhân phù hợp',{patients:(data||[]).map(flatten)});
  }catch(e){return serverError(res,'UC012.list',e);}
};
exports.detail=async(req,res)=>{
  if(!UUID_REGEX.test(req.params.id))return fail(res,404,'Không tìm thấy bệnh nhân');
  try{
    const {data:p,error}=await db.from('patients').select(fields+',avatar_url,address').eq('id',req.params.id).maybeSingle();
    if(error)throw error;if(!p)return fail(res,404,'Không tìm thấy bệnh nhân');
    const [a,r]=await Promise.all([
      db.from('appointments').select('id,appointment_date,start_time,end_time,symptoms,status,cancel_reason,created_at,doctor:doctors(id,full_name,specialty)').eq('patient_id',p.id).order('appointment_date',{ascending:false}),
      db.from('medical_records').select('id,appointment_id,diagnosis,appointment:appointments(appointment_date),doctor:doctors(id,full_name,specialty)').eq('patient_id',p.id).order('created_at',{ascending:false})
    ]);
    if(a.error||r.error)throw a.error||r.error;
    return success(res,200,'Lấy hồ sơ bệnh nhân thành công',{patient:{...flatten(p),appointments:(a.data||[]).map(x=>({...x,start_time:x.start_time.slice(0,5),end_time:x.end_time.slice(0,5)})),medical_records:(r.data||[]).map(({appointment,...x})=>({...x,appointment_date:appointment?.appointment_date??null}))}});
  }catch(e){return serverError(res,'UC012.detail',e);}
};
