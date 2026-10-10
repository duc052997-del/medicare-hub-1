// services/mocks/mockAuth.ts
// Giả lập API-01..04 (register, login, me, logout) đúng thứ tự kiểm tra và đúng thông báo lỗi
// của backend/controllers/auth.controller.js + middlewares. Gồm cả các nhánh lỗi để Tester thử:
//   - email/mật khẩu sai (401 + field), tài khoản bị khóa (403: locked@medicare.test)
//   - quá 10 lần gọi login / 15 phút (429)
//   - thiếu token, token sai, token hết hạn, token đã đăng xuất (401 + code)

import { ApiError } from '../apierror';
import type { AuthUser, LoginResult, RegisterPayload, RegisterResult } from '../../types';
import { MOCK_TOKEN_TTL_SECONDS, MockUser, SEED_USERS } from './mockdata';
import { delay } from './mockutils';

const EMAIL_TAKEN = 'Email không hợp lệ hoặc đã được đăng ký';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 10;

// ---------- "CSDL" trong bộ nhớ (tài khoản đăng ký mới lưu localStorage để F5 không mất) ----------
const USERS_KEY = 'mock_users';

const loadRegistered = (): MockUser[] => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') as MockUser[];
  } catch {
    return [];
  }
};

const saveRegistered = (users: MockUser[]) => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* bỏ qua */
  }
};

const allUsers = () => [...SEED_USERS, ...loadRegistered()];
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const publicUser = (u: MockUser): AuthUser => ({
  id: u.id,
  email: u.email,
  username: u.username ?? null,
  role: u.role,
});

// ---------- Token giả: mock.<base64(payload)>.signature, payload {id,email,role,iat,exp} ----------
const revokedTokens = new Set<string>();

const makeToken = (u: MockUser) => {
  const iat = Math.floor(Date.now() / 1000);
  const payload = { id: u.id, email: u.email, role: u.role, iat, exp: iat + MOCK_TOKEN_TTL_SECONDS };
  return `mock.${btoa(JSON.stringify(payload))}.signature`;
};

// Tương đương middleware verifyToken của BE
const verifyToken = (): { token: string; payload: { id: string; email: string; role: string; exp: number } } => {
  const token = localStorage.getItem('token');
  if (!token) throw new ApiError(401, 'Không tìm thấy token, vui lòng đăng nhập');

  if (revokedTokens.has(token)) {
    throw new ApiError(401, 'Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại', 'TOKEN_REVOKED');
  }

  let payload;
  try {
    const parts = token.split('.');
    if (parts[0] !== 'mock' || parts.length !== 3) throw new Error('bad token');
    payload = JSON.parse(atob(parts[1]));
  } catch {
    throw new ApiError(401, 'Token không hợp lệ', 'TOKEN_INVALID');
  }

  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 'TOKEN_EXPIRED');
  }
  return { token, payload };
};

// ---------- Rate limit login: 10 lần / 15 phút theo email (mock không có IP) ----------
const loginHits = new Map<string, { count: number; resetAt: number }>();

const checkLoginRateLimit = (email: string) => {
  const now = Date.now();
  const entry = loginHits.get(email);
  if (!entry || entry.resetAt <= now) {
    loginHits.set(email, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX) {
    const seconds = Math.ceil((entry.resetAt - now) / 1000);
    const waitText = seconds >= 60 ? `${Math.ceil(seconds / 60)} phút` : `${seconds} giây`;
    throw new ApiError(429, `Bạn đã thử đăng nhập sai quá nhiều lần, vui lòng thử lại sau ${waitText}`);
  }
};

// ================= API-01  POST /auth/register =================
export const mockRegister = async (payload: RegisterPayload): Promise<RegisterResult> => {
  await delay();
  const { email, password, confirmPassword, username } = payload;

  if (
    typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !password ||
    typeof confirmPassword !== 'string' || !confirmPassword ||
    typeof username !== 'string' || !username.trim()
  ) {
    throw new ApiError(400, 'Vui lòng nhập đầy đủ thông tin bắt buộc');
  }

  if (username.trim().length > 50) throw new ApiError(400, 'Tên tài khoản tối đa 50 ký tự');

  const normalized = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalized)) throw new ApiError(400, EMAIL_TAKEN);

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `Mật khẩu phải có tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`);
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    throw new ApiError(400, `Mật khẩu quá dài (tối đa ${MAX_PASSWORD_BYTES} byte)`);
  }
  if (password !== confirmPassword) throw new ApiError(400, 'Mật khẩu xác nhận không khớp');

  if (allUsers().some((u) => u.email === normalized)) throw new ApiError(409, EMAIL_TAKEN);

  const created: MockUser = {
    id: crypto.randomUUID(),
    email: normalized,
    username: username.trim(),
    password,
    role: 'PATIENT',
    is_active: true,
    created_at: new Date().toISOString(),
  };
  saveRegistered([...loadRegistered(), created]);

  return {
    message: 'Đăng ký thành công',
    user: { ...publicUser(created), created_at: created.created_at },
  };
};

// ================= API-02  POST /auth/login =================
export const mockLogin = async (email: string, password: string): Promise<LoginResult> => {
  await delay();

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    throw new ApiError(400, 'Vui lòng nhập email và mật khẩu');
  }

  const normalized = normalizeEmail(email);
  checkLoginRateLimit(normalized);

  if (!EMAIL_REGEX.test(normalized)) throw new ApiError(401, 'Email không tồn tại', undefined, 'email');

  const found = allUsers().find((u) => u.email === normalized);
  if (!found) throw new ApiError(401, 'Email không tồn tại', undefined, 'email');
  if (found.password !== password) throw new ApiError(401, 'Mật khẩu không đúng', undefined, 'password');
  if (!found.is_active) throw new ApiError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ quản trị viên');

  return { message: 'Đăng nhập thành công', token: makeToken(found), user: publicUser(found) };
};

// ================= API-03  GET /auth/me =================
export const mockGetMe = async (): Promise<AuthUser> => {
  await delay(150, 300);
  const { payload } = verifyToken();
  const found = allUsers().find((u) => u.id === payload.id);
  if (!found || !found.is_active) {
    throw new ApiError(401, 'Phiên đăng nhập không còn hiệu lực, vui lòng đăng nhập lại');
  }
  return publicUser(found);
};

// ================= API-04  POST /auth/logout =================
export const mockLogout = async (): Promise<void> => {
  await delay(150, 300);
  const { token } = verifyToken();
  revokedTokens.add(token);
};
