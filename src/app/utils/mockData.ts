import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { firebaseAuth, firebaseDb } from '../../lib/firebase';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  password: string;
}

export interface StudentAccount {
  studentId: string;
  fullName: string;
  email: string;
  password: string;
  userId: string;
}

export interface ImportedStudentRow {
  studentId: string;
  fullName: string;
  email: string;
  password: string;
}

export interface AttendanceSession {
  id: string;
  name: string;
  token: string;
  startTime: Date;
  endTime: Date;
  groupId: string;
  createdBy: string;
  status: 'active' | 'expired' | 'ended';
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: Date;
  status: 'valid' | 'late' | 'invalid';
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

const STORAGE_KEYS = {
  CURRENT_USER: 'attendance_current_user',
  SESSIONS: 'attendance_sessions',
  RECORDS: 'attendance_records',
  GROUPS: 'attendance_groups',
  USERS: 'attendance_users',
  STUDENT_ACCOUNTS: 'attendance_student_accounts',
  DEVICE_ID: 'attendance_device_id',
  DEVICE_BOUND_STUDENT_ID: 'attendance_device_bound_student_id',
};

const GROUPS_COLLECTION = 'groups';
const SESSIONS_COLLECTION = 'sessions';
const STUDENT_ACCOUNTS_COLLECTION = 'studentAccounts';
const RECORDS_COLLECTION = 'attendance_records';
const DEVICE_BINDINGS_COLLECTION = 'device_bindings';

interface DeviceBinding {
  deviceId: string;
  studentId: string;
  userId: string;
  email: string;
  boundAt: string;
  updatedAt: string;
}

const setStudentAccountsCache = (accounts: StudentAccount[]) => {
  localStorage.setItem(STORAGE_KEYS.STUDENT_ACCOUNTS, JSON.stringify(accounts));
  const users: User[] = accounts.map((account) => ({
    id: account.userId,
    name: account.fullName,
    email: account.email,
    role: 'user',
    password: account.password,
  }));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

const setGroupsCache = (groups: Group[]) => {
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
};

const setSessionsCache = (sessions: AttendanceSession[]) => {
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
};

const setRecordsCache = (records: AttendanceRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
};

const toDateValue = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(String(value));
};

const normalizeToken = (token: string) =>
  token
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .trim()
    .toLowerCase();

const ensureFirebaseAuthSession = async () => {
  if (firebaseAuth.currentUser) {
    return;
  }

  await signInAnonymously(firebaseAuth);
};

const generateDeviceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getOrCreateDeviceId = () => {
  const existing = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (existing) {
    return existing;
  }
  const created = generateDeviceId();
  localStorage.setItem(STORAGE_KEYS.DEVICE_ID, created);
  return created;
};

const getBoundStudentIdLocal = () => localStorage.getItem(STORAGE_KEYS.DEVICE_BOUND_STUDENT_ID) || '';

const setBoundStudentIdLocal = (studentId: string) => {
  if (!studentId) {
    localStorage.removeItem(STORAGE_KEYS.DEVICE_BOUND_STUDENT_ID);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.DEVICE_BOUND_STUDENT_ID, studentId);
};

const getDeviceBindingRef = (deviceId: string) => doc(firebaseDb, DEVICE_BINDINGS_COLLECTION, deviceId);

const bindOrValidateDeviceForStudent = async (
  studentId: string,
  user: Pick<User, 'id' | 'email'>
): Promise<{ ok: boolean; message?: string }> => {
  const normalizedStudentId = studentId.trim();
  const deviceId = getOrCreateDeviceId();
  const ref = getDeviceBindingRef(deviceId);
  const nowIso = new Date().toISOString();
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const payload: DeviceBinding = {
      deviceId,
      studentId: normalizedStudentId,
      userId: user.id,
      email: user.email,
      boundAt: nowIso,
      updatedAt: nowIso,
    };
    await setDoc(ref, payload);
    setBoundStudentIdLocal(normalizedStudentId);
    return { ok: true };
  }

  const data = snap.data() as Partial<DeviceBinding>;
  const boundStudentId = String(data.studentId || '').trim();
  if (boundStudentId && boundStudentId !== normalizedStudentId) {
    return {
      ok: false,
      message: `Thiết bị này đã bị khóa với MSSV ${boundStudentId}. Không thể đăng nhập MSSV khác.`,
    };
  }

  await updateDoc(ref, {
    studentId: normalizedStudentId,
    userId: user.id,
    email: user.email,
    updatedAt: nowIso,
  });
  setBoundStudentIdLocal(normalizedStudentId);
  return { ok: true };
};

const resolveStudentIdFromUserId = async (userId: string): Promise<string> => {
  if (userId.startsWith('sv_')) {
    return userId.replace(/^sv_/, '');
  }
  const accounts = await getStudentAccountsFromFirebase();
  return accounts.find((account) => account.userId === userId)?.studentId || '';
};

const verifyDeviceLockForUserId = async (userId: string): Promise<{ ok: boolean; message?: string }> => {
  await ensureFirebaseAuthSession();
  const deviceId = getOrCreateDeviceId();
  const snap = await getDoc(getDeviceBindingRef(deviceId));
  if (!snap.exists()) {
    return { ok: false, message: 'Thiết bị chưa được liên kết. Vui lòng đăng nhập lại.' };
  }

  const data = snap.data() as Partial<DeviceBinding>;
  const boundStudentId = String(data.studentId || '').trim();
  const userStudentId = await resolveStudentIdFromUserId(userId);

  if (!boundStudentId || !userStudentId || boundStudentId !== userStudentId) {
    return { ok: false, message: 'Thiết bị đang bị khóa với tài khoản khác.' };
  }

  setBoundStudentIdLocal(boundStudentId);
  return { ok: true };
};

export const getCurrentDeviceBinding = async (): Promise<{ deviceId: string; studentId: string | null }> => {
  const deviceId = getOrCreateDeviceId();
  const snap = await getDoc(getDeviceBindingRef(deviceId));
  if (!snap.exists()) {
    return { deviceId, studentId: null };
  }
  const data = snap.data() as Partial<DeviceBinding>;
  const studentId = String(data.studentId || '').trim() || null;
  if (studentId) {
    setBoundStudentIdLocal(studentId);
  }
  return { deviceId, studentId };
};

export const resetDeviceBindingByAdmin = async (deviceId: string): Promise<boolean> => {
  const normalized = deviceId.trim();
  if (!normalized) {
    return false;
  }
  await deleteDoc(getDeviceBindingRef(normalized));
  const localDeviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (localDeviceId === normalized) {
    setBoundStudentIdLocal('');
  }
  return true;
};

export const initializeMockData = () => {
  // Firebase-only mode: do not seed any mock data.
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return userStr ? (JSON.parse(userStr) as User) : null;
};

export const login = async (studentId: string, password: string): Promise<User | null> => {
  const normalizedStudentId = studentId.trim();
  if (!normalizedStudentId || !password) {
    return null;
  }

  const accountQuery = query(
    collection(firebaseDb, STUDENT_ACCOUNTS_COLLECTION),
    where('studentId', '==', normalizedStudentId),
    where('password', '==', password)
  );
  const accountSnapshot = await getDocs(accountQuery);
  const account = accountSnapshot.docs[0]?.data() as StudentAccount | undefined;

  if (!account) {
    return null;
  }

  const user: User = {
    id: account.userId,
    name: account.fullName,
    email: account.email,
    role: 'user',
    password: account.password,
  };

  await ensureFirebaseAuthSession();
  const lockCheck = await bindOrValidateDeviceForStudent(normalizedStudentId, {
    id: user.id,
    email: user.email,
  });
  if (!lockCheck.ok) {
    throw new Error(lockCheck.message || 'Thiết bị đã bị khóa với tài khoản khác');
  }

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  return user;
};

export const loginAdminWithFirebase = async (email: string, password: string): Promise<User | null> => {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
    const user: User = {
      id: `firebase-admin-${credential.user.uid}`,
      name: credential.user.displayName || 'Quản trị viên',
      email: credential.user.email || normalizedEmail,
      role: 'admin',
      password: '',
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  signOut(firebaseAuth).catch(() => undefined);
};

export const getStudentAccounts = (): StudentAccount[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_ACCOUNTS) || '[]') as StudentAccount[];
};

export const getStudentAccountsFromFirebase = async (): Promise<StudentAccount[]> => {
  const snapshot = await getDocs(collection(firebaseDb, STUDENT_ACCOUNTS_COLLECTION));
  const accounts: StudentAccount[] = snapshot.docs.map((accountDoc) => {
    const data = accountDoc.data() as Partial<StudentAccount>;
    const studentId = String(data.studentId || accountDoc.id).trim();
    return {
      studentId,
      fullName: String(data.fullName || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      password: String(data.password || ''),
      userId: String(data.userId || `sv_${studentId}`),
    };
  });

  setStudentAccountsCache(accounts);
  return accounts;
};

export const getUsers = (): User[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]') as User[];
};

export const getUsersFromFirebase = async (): Promise<User[]> => {
  const accounts = await getStudentAccountsFromFirebase();
  return accounts.map((account) => ({
    id: account.userId,
    name: account.fullName,
    email: account.email,
    role: 'user',
    password: account.password,
  }));
};

export const getUserById = (userId: string): User | undefined => {
  return getUsers().find((u) => u.id === userId);
};

export const getGroups = (): Group[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]') as Group[];
};

export const getGroupsFromFirebase = async (): Promise<Group[]> => {
  const snapshot = await getDocs(collection(firebaseDb, GROUPS_COLLECTION));
  const groups: Group[] = snapshot.docs.map((groupDoc) => {
    const data = groupDoc.data() as Omit<Group, 'id'>;
    return {
      id: groupDoc.id,
      name: data.name || '',
      description: data.description || '',
      memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    };
  });

  setGroupsCache(groups);
  return groups;
};

export const createGroup = async (group: Omit<Group, 'id'>): Promise<Group> => {
  const groupRef = await addDoc(collection(firebaseDb, GROUPS_COLLECTION), {
    name: group.name,
    description: group.description,
    memberIds: group.memberIds,
  });

  const newGroup: Group = { ...group, id: groupRef.id };
  const groups = getGroups();
  setGroupsCache([...groups.filter((g) => g.id !== newGroup.id), newGroup]);
  return newGroup;
};

export const updateGroup = async (groupId: string, updates: Partial<Group>): Promise<Group | null> => {
  const groups = await getGroupsFromFirebase();
  const index = groups.findIndex((g) => g.id === groupId);
  if (index === -1) return null;

  const next: Group = { ...groups[index], ...updates };
  groups[index] = next;
  setGroupsCache(groups);

  await updateDoc(doc(firebaseDb, GROUPS_COLLECTION, groupId), {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.memberIds !== undefined ? { memberIds: updates.memberIds } : {}),
  });

  return next;
};

export const deleteGroup = async (groupId: string): Promise<boolean> => {
  const groups = await getGroupsFromFirebase();
  const remaining = groups.filter((g) => g.id !== groupId);
  if (remaining.length === groups.length) {
    return false;
  }

  await deleteDoc(doc(firebaseDb, GROUPS_COLLECTION, groupId));
  setGroupsCache(remaining);
  return true;
};

export const addMemberToGroup = async (groupId: string, userId: string): Promise<boolean> => {
  const groups = await getGroupsFromFirebase();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return false;
  if (group.memberIds.includes(userId)) return false;

  const memberIds = [...group.memberIds, userId];
  await updateDoc(doc(firebaseDb, GROUPS_COLLECTION, groupId), { memberIds });
  group.memberIds = memberIds;
  setGroupsCache(groups);
  return true;
};

export const removeMemberFromGroup = async (groupId: string, userId: string): Promise<boolean> => {
  const groups = await getGroupsFromFirebase();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return false;

  const memberIds = group.memberIds.filter((id) => id !== userId);
  if (memberIds.length === group.memberIds.length) return false;

  await updateDoc(doc(firebaseDb, GROUPS_COLLECTION, groupId), { memberIds });
  group.memberIds = memberIds;
  setGroupsCache(groups);
  return true;
};

export const importStudentsToGroup = async (
  groupId: string,
  rows: ImportedStudentRow[]
): Promise<{ added: number; updated: number; linkedToGroup: number }> => {
  const groups = await getGroupsFromFirebase();
  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    return { added: 0, updated: 0, linkedToGroup: 0 };
  }

  const existingAccounts = await getStudentAccountsFromFirebase();
  const accountMap = new Map(existingAccounts.map((a) => [a.studentId.toLowerCase(), a]));

  let added = 0;
  let updated = 0;
  let linkedToGroup = 0;

  for (const row of rows) {
    const studentId = row.studentId.trim();
    if (!studentId) continue;

    const userId = `sv_${studentId}`;
    const payload: StudentAccount = {
      studentId,
      fullName: row.fullName.trim(),
      email: row.email.trim().toLowerCase(),
      password: row.password,
      userId,
    };

    if (accountMap.has(studentId.toLowerCase())) {
      updated += 1;
    } else {
      added += 1;
    }

    await setDoc(doc(firebaseDb, STUDENT_ACCOUNTS_COLLECTION, studentId), payload);
    accountMap.set(studentId.toLowerCase(), payload);

    if (!group.memberIds.includes(userId)) {
      group.memberIds.push(userId);
      linkedToGroup += 1;
    }
  }

  await updateDoc(doc(firebaseDb, GROUPS_COLLECTION, groupId), {
    memberIds: group.memberIds,
  });

  setGroupsCache(groups);
  setStudentAccountsCache(Array.from(accountMap.values()));

  return { added, updated, linkedToGroup };
};

export const updateGroupMemberProfile = async (
  userId: string,
  updates: { studentId: string; fullName: string; email: string }
): Promise<{ success: boolean; message?: string }> => {
  const studentId = updates.studentId.trim();
  const fullName = updates.fullName.trim();
  const email = updates.email.trim().toLowerCase();

  if (!studentId || !fullName || !email) {
    return { success: false, message: 'Vui lòng điền đầy đủ thông tin' };
  }

  const accounts = await getStudentAccountsFromFirebase();
  const current = accounts.find((a) => a.userId === userId);
  if (!current) {
    return { success: false, message: 'Không tìm thấy thành viên' };
  }

  if (accounts.some((a) => a.userId !== userId && a.studentId === studentId)) {
    return { success: false, message: 'MSSV đã tồn tại' };
  }

  if (accounts.some((a) => a.userId !== userId && a.email === email)) {
    return { success: false, message: 'Email đã tồn tại' };
  }

  const nextAccount: StudentAccount = {
    studentId,
    fullName,
    email,
    password: current.password || 'user123',
    userId,
  };

  if (current.studentId !== studentId) {
    await deleteDoc(doc(firebaseDb, STUDENT_ACCOUNTS_COLLECTION, current.studentId));
  }

  await setDoc(doc(firebaseDb, STUDENT_ACCOUNTS_COLLECTION, studentId), nextAccount);

  const nextAccounts = accounts
    .filter((a) => a.userId !== userId)
    .concat(nextAccount);
  setStudentAccountsCache(nextAccounts);

  return { success: true };
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const accounts = await getStudentAccountsFromFirebase();
  const email = user.email.trim().toLowerCase();
  if (accounts.some((a) => a.email === email)) {
    throw new Error('Email đã tồn tại');
  }

  const studentId = `SV${String(Date.now()).slice(-8)}`;
  const created: StudentAccount = {
    studentId,
    fullName: user.name.trim(),
    email,
    password: user.password || 'user123',
    userId: `sv_${studentId}`,
  };

  await setDoc(doc(firebaseDb, STUDENT_ACCOUNTS_COLLECTION, studentId), created);
  setStudentAccountsCache([...accounts, created]);

  return {
    id: created.userId,
    name: created.fullName,
    email: created.email,
    role: 'user',
    password: created.password,
  };
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  const accounts = await getStudentAccountsFromFirebase();
  const current = accounts.find((a) => a.userId === userId);
  if (!current) return null;

  const nextEmail = (updates.email || current.email).trim().toLowerCase();
  const nextName = (updates.name || current.fullName).trim();

  if (accounts.some((a) => a.userId !== userId && a.email === nextEmail)) {
    throw new Error('Email đã tồn tại');
  }

  const next: StudentAccount = {
    ...current,
    fullName: nextName,
    email: nextEmail,
    password: updates.password || current.password,
  };

  await setDoc(doc(firebaseDb, STUDENT_ACCOUNTS_COLLECTION, current.studentId), next);
  const nextAccounts = accounts.map((a) => (a.userId === userId ? next : a));
  setStudentAccountsCache(nextAccounts);

  return {
    id: next.userId,
    name: next.fullName,
    email: next.email,
    role: 'user',
    password: next.password,
  };
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const accounts = await getStudentAccountsFromFirebase();
  const target = accounts.find((a) => a.userId === userId);
  if (!target) return false;

  await deleteDoc(doc(firebaseDb, STUDENT_ACCOUNTS_COLLECTION, target.studentId));

  const groups = await getGroupsFromFirebase();
  await Promise.all(
    groups
      .filter((group) => group.memberIds.includes(userId))
      .map((group) => {
        const memberIds = group.memberIds.filter((id) => id !== userId);
        group.memberIds = memberIds;
        return updateDoc(doc(firebaseDb, GROUPS_COLLECTION, group.id), { memberIds });
      })
  );

  setGroupsCache(groups);
  setStudentAccountsCache(accounts.filter((a) => a.userId !== userId));
  return true;
};

export const getSessions = (): AttendanceSession[] => {
  const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]') as Array<
    AttendanceSession & { startTime: string; endTime: string }
  >;
  return sessions.map((session) => ({
    ...session,
    startTime: new Date(session.startTime),
    endTime: new Date(session.endTime),
  }));
};

export const getSessionsFromFirebase = async (): Promise<AttendanceSession[]> => {
  const snapshot = await getDocs(collection(firebaseDb, SESSIONS_COLLECTION));
  const sessions: AttendanceSession[] = snapshot.docs.map((sessionDoc) => {
    const data = sessionDoc.data() as {
      name?: string;
      token?: string;
      startTime?: unknown;
      endTime?: unknown;
      groupId?: string;
      createdBy?: string;
      status?: AttendanceSession['status'];
    };

    const startTime = toDateValue(data.startTime);
    const endTime = toDateValue(data.endTime);
    const status: AttendanceSession['status'] = new Date() > endTime ? 'expired' : 'active';

    return {
      id: sessionDoc.id,
      name: data.name || '',
      token: data.token || '',
      startTime,
      endTime,
      groupId: data.groupId || '',
      createdBy: data.createdBy || '',
      status: data.status || status,
    };
  });

  setSessionsCache(sessions);
  return sessions;
};

export const createSession = async (
  session: Omit<AttendanceSession, 'id' | 'token'>
): Promise<AttendanceSession> => {
  const token = `ATT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const ref = await addDoc(collection(firebaseDb, SESSIONS_COLLECTION), {
    name: session.name,
    token,
    startTime: session.startTime,
    endTime: session.endTime,
    groupId: session.groupId,
    createdBy: session.createdBy,
    status: session.status,
  });

  const created: AttendanceSession = {
    ...session,
    id: ref.id,
    token,
  };

  setSessionsCache([...getSessions(), created]);
  return created;
};

export const updateSession = async (
  sessionId: string,
  updates: Pick<AttendanceSession, 'name' | 'groupId' | 'startTime' | 'endTime'>
): Promise<boolean> => {
  const sessions = await getSessionsFromFirebase();
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index === -1) {
    return false;
  }

  const status: AttendanceSession['status'] = new Date() > updates.endTime ? 'expired' : 'active';
  sessions[index] = {
    ...sessions[index],
    ...updates,
    status,
  };

  await updateDoc(doc(firebaseDb, SESSIONS_COLLECTION, sessionId), {
    name: updates.name,
    groupId: updates.groupId,
    startTime: updates.startTime,
    endTime: updates.endTime,
    status,
  });

  setSessionsCache(sessions);
  return true;
};

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  const sessions = await getSessionsFromFirebase();
  const remaining = sessions.filter((s) => s.id !== sessionId);
  if (remaining.length === sessions.length) {
    return false;
  }

  await deleteDoc(doc(firebaseDb, SESSIONS_COLLECTION, sessionId));

  const recordsQuery = query(collection(firebaseDb, RECORDS_COLLECTION), where('sessionId', '==', sessionId));
  const recordsSnapshot = await getDocs(recordsQuery);
  await Promise.all(recordsSnapshot.docs.map((recordDoc) => deleteDoc(recordDoc.ref)));

  setSessionsCache(remaining);
  setRecordsCache(getRecords().filter((r) => r.sessionId !== sessionId));
  return true;
};

export const getSessionByToken = (token: string): AttendanceSession | null => {
  const normalized = normalizeToken(token);
  return getSessions().find((session) => normalizeToken(session.token) === normalized) || null;
};

export const getSessionByTokenFromFirebase = async (token: string): Promise<AttendanceSession | null> => {
  await ensureFirebaseAuthSession();

  const exactTokenQuery = query(
    collection(firebaseDb, SESSIONS_COLLECTION),
    where('token', '==', token.trim())
  );
  const exactSnapshot = await getDocs(exactTokenQuery);
  if (!exactSnapshot.empty) {
    const docSnap = exactSnapshot.docs[0];
    const data = docSnap.data() as {
      name?: string;
      token?: string;
      startTime?: unknown;
      endTime?: unknown;
      groupId?: string;
      createdBy?: string;
      status?: AttendanceSession['status'];
    };

    const startTime = toDateValue(data.startTime);
    const endTime = toDateValue(data.endTime);
    const session: AttendanceSession = {
      id: docSnap.id,
      name: data.name || '',
      token: data.token || '',
      startTime,
      endTime,
      groupId: data.groupId || '',
      createdBy: data.createdBy || '',
      status: data.status || (new Date() > endTime ? 'expired' : 'active'),
    };

    const sessions = getSessions().filter((s) => s.id !== session.id).concat(session);
    setSessionsCache(sessions);
    return session;
  }

  const normalized = normalizeToken(token);
  const sessions = await getSessionsFromFirebase();
  return sessions.find((s) => normalizeToken(s.token) === normalized) || null;
};

export const getRecords = (): AttendanceRecord[] => {
  const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS) || '[]') as Array<
    AttendanceRecord & { timestamp: string }
  >;
  return records.map((record) => ({
    ...record,
    timestamp: new Date(record.timestamp),
  }));
};

export const getRecordsFromFirebase = async (): Promise<AttendanceRecord[]> => {
  const snapshot = await getDocs(collection(firebaseDb, RECORDS_COLLECTION));
  const records: AttendanceRecord[] = snapshot.docs.map((recordDoc) => {
    const data = recordDoc.data() as {
      sessionId: string;
      userId: string;
      timestamp: unknown;
      status: AttendanceRecord['status'];
    };

    return {
      id: recordDoc.id,
      sessionId: data.sessionId,
      userId: data.userId,
      timestamp: toDateValue(data.timestamp),
      status: data.status,
    };
  });

  setRecordsCache(records);
  return records;
};

export const getRecordsBySessionFromFirebase = async (sessionId: string): Promise<AttendanceRecord[]> => {
  const recordsQuery = query(collection(firebaseDb, RECORDS_COLLECTION), where('sessionId', '==', sessionId));
  const snapshot = await getDocs(recordsQuery);

  const records: AttendanceRecord[] = snapshot.docs.map((recordDoc) => {
    const data = recordDoc.data() as {
      sessionId: string;
      userId: string;
      timestamp: unknown;
      status: AttendanceRecord['status'];
    };

    return {
      id: recordDoc.id,
      sessionId: data.sessionId,
      userId: data.userId,
      timestamp: toDateValue(data.timestamp),
      status: data.status,
    };
  });

  return records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export const getRecordsBySession = (sessionId: string): AttendanceRecord[] => {
  return getRecords().filter((record) => record.sessionId === sessionId);
};

export const getRecordsByUser = (userId: string): AttendanceRecord[] => {
  return getRecords().filter((record) => record.userId === userId);
};

export const addRecordToFirestore = async (
  record: Omit<AttendanceRecord, 'id'>
): Promise<AttendanceRecord> => {
  const ref = await addDoc(collection(firebaseDb, RECORDS_COLLECTION), {
    sessionId: record.sessionId,
    userId: record.userId,
    timestamp: serverTimestamp(),
    status: record.status,
  });

  const snapshot = await getDoc(ref);
  const rawTimestamp = snapshot.exists()
    ? (snapshot.data() as { timestamp?: unknown }).timestamp
    : undefined;
  const savedTimestamp = rawTimestamp ? toDateValue(rawTimestamp) : record.timestamp;

  return {
    id: ref.id,
    ...record,
    timestamp: savedTimestamp,
  };
};

export const createRecord = async (
  sessionId: string,
  userId: string,
  sessionOverride?: AttendanceSession
): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> => {
  const deviceLock = await verifyDeviceLockForUserId(userId);
  if (!deviceLock.ok) {
    return { success: false, message: deviceLock.message || 'Thiết bị bị khóa với tài khoản khác' };
  }

  const session =
    sessionOverride || (await getSessionsFromFirebase()).find((item) => item.id === sessionId) || null;

  if (!session) {
    return { success: false, message: 'Phiên điểm danh không tồn tại' };
  }

  const now = new Date();
  if (now < session.startTime) {
    return { success: false, message: 'Phiên điểm danh chưa bắt đầu' };
  }

  if (now > session.endTime) {
    return { success: false, message: 'Phiên điểm danh đã kết thúc' };
  }

  try {
    await ensureFirebaseAuthSession();
  } catch {
    return { success: false, message: 'Không thể kết nối dữ liệu điểm danh' };
  }

  try {
    const groupSnapshot = await getDoc(doc(firebaseDb, GROUPS_COLLECTION, session.groupId));
    if (groupSnapshot.exists()) {
      const groupData = groupSnapshot.data() as { memberIds?: string[] };
      const memberIds = Array.isArray(groupData.memberIds) ? groupData.memberIds : [];
      if (!memberIds.includes(userId)) {
        return { success: false, message: 'Bạn không thuộc nhóm của phiên điểm danh này' };
      }
    }
  } catch {
    // Keep attendance available even if group check fails.
  }

  const duplicateQuery = query(
    collection(firebaseDb, RECORDS_COLLECTION),
    where('sessionId', '==', sessionId),
    where('userId', '==', userId)
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);
  if (!duplicateSnapshot.empty) {
    return { success: false, message: 'Bạn đã điểm danh cho phiên này rồi' };
  }

  const created = await addRecordToFirestore({
    sessionId,
    userId,
    timestamp: now,
    status: 'valid',
  });

  setRecordsCache(getRecords().concat(created));
  return { success: true, message: 'Điểm danh thành công', record: created };
};

export const subscribeRecordsBySession = (
  sessionId: string,
  callback: (records: AttendanceRecord[]) => void
) => {
  const recordsQuery = query(collection(firebaseDb, RECORDS_COLLECTION), where('sessionId', '==', sessionId));

  return onSnapshot(recordsQuery, (snapshot) => {
    const records: AttendanceRecord[] = snapshot.docs.map((recordDoc) => {
      const data = recordDoc.data() as {
        sessionId: string;
        userId: string;
        timestamp: unknown;
        status: AttendanceRecord['status'];
      };

      return {
        id: recordDoc.id,
        sessionId: data.sessionId,
        userId: data.userId,
        timestamp: toDateValue(data.timestamp),
        status: data.status,
      };
    });

    callback(records);
  });
};
