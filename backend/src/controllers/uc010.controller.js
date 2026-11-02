const db = require('../config/supabase.config');
const {success, fail, serverError} = require('../utils/response');
const {UUID_REGEX} = require('../utils/schedule');
const fields = 'id,full_name,specialty,email,phone,avatar_url,bio,is_featured,is_active';
const missing = res => fail(res,404,'Không tìm thấy bác sĩ');
const invalid = (res,field) => fail(res,400,'Thông tin không hợp lệ',{field});
// Quote PostgREST operands; escape LIKE metacharacters to search literal text.
const pattern = q => JSON.stringify('%' + q.replace(/[\\%_]/g, '\\$&') + '%');
exports.list = async(req,res) => {
  if (req.query.q !== undefined && typeof req.query.q !== 'string') return invalid(res,'q');
  if (req.query.include_inactive !== undefined && !['true','false'].includes(req.query.include_inactive)) return invalid(res,'include_inactive');
  try {
    let query=db.from('doctors').select(fields).order('full_name').order('id');
    if(req.query.include_inactive!=='true') query=query.eq('is_active',true);
    if(req.query.q?.trim()) { const p=pattern(req.query.q.trim()); query=query.or(`full_name.ilike.${p},email.ilike.${p},phone.ilike.${p}`); }
    const {data,error}=await query; if(error) throw error;
    return success(res,200,data?.length?'Lấy danh sách bác sĩ thành công':'Không tìm thấy bác sĩ phù hợp',{doctors:data||[]});
  }catch(e){return serverError(res,'UC010.list',e);}
};
exports.detail=async(req,res)=>{
  if(!UUID_REGEX.test(req.params.id)) return missing(res);
  try {
    const {data,error}=await db.from('doctors').select(fields+',schedules:doctor_schedules(id,day_of_week,start_time,end_time,slot_minutes,is_active)').eq('id',req.params.id).maybeSingle();
    if(error) throw error; if(!data) return missing(res);
    data.schedules=(data.schedules||[]).filter(s=>s.is_active!==false).map(({is_active,...s})=>({...s,start_time:s.start_time.slice(0,5),end_time:s.end_time.slice(0,5)}));
    return success(res,200,'Lấy thông tin bác sĩ thành công',{doctor:data});
  }catch(e){return serverError(res,'UC010.detail',e);}
};
function validate(b){
  if(!b||Array.isArray(b)||typeof b!=='object') return 'body';
  const allowed=['full_name','specialty','email','phone','avatar_url','bio','is_featured','schedules'];
  for(const k of Object.keys(b)) if(!allowed.includes(k)) return k;
  for(const k of ['full_name','specialty','email','phone']) if(typeof b[k]!=='string'||!b[k].trim()) return k;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())) return 'email';
  if(!/^0\d{9}$/.test(b.phone.trim())) return 'phone';
  if(b.is_featured!==undefined && typeof b.is_featured!=='boolean') return 'is_featured';
  for(const k of ['avatar_url','bio']) if(b[k]!=null&&typeof b[k]!=='string') return k;
  if(b.schedules!==undefined){
    if(!Array.isArray(b.schedules)) return 'schedules';
    const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
    for(const s of b.schedules){
      if(!s||!Number.isInteger(s.day_of_week)||s.day_of_week<0||s.day_of_week>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start_time)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end_time)||!Number.isInteger(s.slot_minutes)||s.slot_minutes<=0||mins(s.end_time)<=mins(s.start_time)||s.slot_minutes>mins(s.end_time)-mins(s.start_time)) return 'schedules';
    }
    for(let i=0;i<b.schedules.length;i++) for(let j=i+1;j<b.schedules.length;j++){
      const a=b.schedules[i],c=b.schedules[j];
      if(a.day_of_week===c.day_of_week&&a.start_time<c.end_time&&c.start_time<a.end_time) return 'schedules';
    }
  }
}
function dbError(res,e){
  if(e.code==='23505') return fail(res,409,'Email bác sĩ đã tồn tại',{field:'email'});
  if(e.message==='DOCTOR_NOT_FOUND') return missing(res);
  if(e.message==='FUTURE_APPOINTMENTS') return fail(res,409,'Bác sĩ còn lịch hẹn chưa hoàn tất',{code:'FUTURE_APPOINTMENTS'});
  return serverError(res,'UC010.write',e);
}
exports.save=async(req,res)=>{
  if(req.params.id&&!UUID_REGEX.test(req.params.id)) return missing(res);
  const field=validate(req.body); if(field) return invalid(res,field);
  const b={...req.body}; for(const k of ['full_name','specialty','email','phone']) b[k]=b[k].trim(); b.email=b.email.toLowerCase();
  try {
    const {data,error}=await db.rpc('uc010_save_doctor',{p_id:req.params.id||null,p_body:b});
    if(error) return dbError(res,error);
    return success(res,req.params.id?200:201,req.params.id?'Cập nhật bác sĩ thành công':'Thêm bác sĩ thành công',{doctor:data});
  }catch(e){return dbError(res,e);}
};
exports.remove=async(req,res)=>{
  if(!UUID_REGEX.test(req.params.id)) return missing(res);
  try {
    const {error}=await db.rpc('uc010_delete_doctor',{p_id:req.params.id});
    if(error) return dbError(res,error);
    return success(res,200,'Xóa bác sĩ thành công');
  }catch(e){return dbError(res,e);}
};
