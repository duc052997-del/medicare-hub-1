
insert into public.doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_minutes, is_active)
select d.id, s.day_of_week, s.start_time, s.end_time, s.slot_minutes, true
from public.doctors d
cross join (values

  ('BS. Nguyễn Văn A', 1, '08:00'::time, '12:00'::time, 30),
  ('BS. Nguyễn Văn A', 1, '14:00'::time, '17:00'::time, 30),
  ('BS. Nguyễn Văn A', 2, '08:00'::time, '12:00'::time, 30),
  ('BS. Nguyễn Văn A', 2, '14:00'::time, '17:00'::time, 30),
  ('BS. Nguyễn Văn A', 3, '08:00'::time, '12:00'::time, 30),
  ('BS. Nguyễn Văn A', 3, '14:00'::time, '17:00'::time, 30),
  ('BS. Nguyễn Văn A', 4, '08:00'::time, '12:00'::time, 30),
  ('BS. Nguyễn Văn A', 4, '14:00'::time, '17:00'::time, 30),
  ('BS. Nguyễn Văn A', 5, '08:00'::time, '12:00'::time, 30),
  ('BS. Nguyễn Văn A', 5, '14:00'::time, '17:00'::time, 30),

  ('BS. Trần Thị B', 2, '08:00'::time, '11:00'::time, 20),
  ('BS. Trần Thị B', 4, '08:00'::time, '11:00'::time, 20),
  ('BS. Trần Thị B', 6, '08:00'::time, '11:00'::time, 20),

  ('BS. Lê Văn C', 1, '13:30'::time, '16:30'::time, 30),
  ('BS. Lê Văn C', 3, '13:30'::time, '16:30'::time, 30)


) as s(full_name, day_of_week, start_time, end_time, slot_minutes)
where d.full_name = s.full_name
  and not exists (
    select 1 from public.doctor_schedules existing
    where existing.doctor_id = d.id
      and existing.day_of_week = s.day_of_week
      and existing.start_time = s.start_time
  );
