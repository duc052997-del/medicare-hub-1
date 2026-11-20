// services/mocks/mockClinic.ts  - giả lập API-05  GET /api/home

import { ApiError } from '../apierror';
import type { ClinicInfo } from '../../types';
import { MOCK_CLINIC } from './mockdata';
import { delay, flag } from './mockutils';

export const mockGetClinic = async (): Promise<ClinicInfo> => {
  await delay();
  // Tester bật bằng console: localStorage.setItem('mock_clinic_empty','1') để thử nhánh "chưa có dữ liệu"
  if (flag('mock_clinic_empty')) {
    throw new ApiError(404, 'Chưa có thông tin giới thiệu phòng khám');
  }
  return MOCK_CLINIC;
};
