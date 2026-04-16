import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { firebaseDb } from '../../lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth } from '../../lib/firebase';

// Mock data vÃ  state quáº£n lÃ½ cho há»‡ thá»‘ng Ä‘iá»ƒm danh


export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  password: string;
}

export interface StudentAccount {
  studentId: string; // MSSV
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

// StudentAccount table (fixed)
export const studentAccounts: StudentAccount[] = [
  {
    studentId: '21110001',
    fullName: 'Tran Thi Binh',
    email: 'user1@example.com',
    password: 'user123',
    userId: 'user1',
  },
  {
    studentId: '21110002',
    fullName: 'Le Van Cuong',
    email: 'user2@example.com',
    password: 'user123',
    userId: 'user2',
  },
  {
    studentId: '21110003',
    fullName: 'Pham Thi Dung',
    email: 'user3@example.com',
    password: 'user123',
    userId: 'user3',
  },
];
const mapStudentAccountsToUsers = (accounts: StudentAccount[]): User[] =>
  accounts.map((account) => ({
    id: account.userId,
    name: account.fullName,
    email: account.email,
    role: 'user',
    password: account.password,
  }));

const studentUsersFromAccounts: User[] = mapStudentAccountsToUsers(studentAccounts);
// Mock users
export const mockUsers: User[] = [
  {
    id: 'admin1',
    name: 'Nguyen Van An',
    email: 'admin@example.com',
    role: 'admin',
    password: 'admin123',
  },
  ...studentUsersFromAccounts,
];
// Mock groups
export const mockGroups: Group[] = [
  {
    id: 'group1',
    name: 'Lá»›p Láº­p TrÃ¬nh Web',
    description: 'Lá»›p há»c Láº­p TrÃ¬nh Web 2026',
    memberIds: ['user1', 'user2', 'user3'],
  },
  {
    id: 'group2',
    name: 'PhÃ²ng IT',
    description: 'PhÃ²ng cÃ´ng nghá»‡ thÃ´ng tin',
    memberIds: ['user1', 'user2'],
  },
];

// Mock attendance sessions
export const mockSessions: AttendanceSession[] = [
  {
    id: 'session1',
    name: 'Buá»•i há»c sá»‘ 1 - Láº­p TrÃ¬nh Web',
    token: 'ATT-2026-001',
    startTime: new Date('2026-04-16T08:00:00'),
    endTime: new Date('2026-04-16T10:00:00'),
    groupId: 'group1',
    createdBy: 'admin1',
    status: 'active',
  },
  {
    id: 'session2',
    name: 'Há»p team IT',
    token: 'ATT-2026-002',
    startTime: new Date('2026-04-15T14:00:00'),
    endTime: new Date('2026-04-15T16:00:00'),
    groupId: 'group2',
    createdBy: 'admin1',
    status: 'expired',
  },
];

// Mock attendance records
export const mockRecords: AttendanceRecord[] = [
  {
    id: 'record1',
    sessionId: 'session1',
    userId: 'user1',
    timestamp: new Date('2026-04-16T08:05:00'),
    status: 'valid',
  },
  {
    id: 'record2',
    sessionId: 'session1',
    userId: 'user2',
    timestamp: new Date('2026-04-16T08:10:00'),
    status: 'valid',
  },
  {
    id: 'record3',
    sessionId: 'session2',
    userId: 'user1',
    timestamp: new Date('2026-04-15T14:05:00'),
    status: 'valid',
  },
];

// Storage keys
const STORAGE_KEYS = {
  CURRENT_USER: 'attendance_current_user',
  SESSIONS: 'attendance_sessions',
  RECORDS: 'attendance_records',
  GROUPS: 'attendance_groups',
  USERS: 'attendance_users',
  STUDENT_ACCOUNTS: 'attendance_student_accounts',
};

const GROUPS_COLLECTION = 'groups';
const SESSIONS_COLLECTION = 'sessions';
const STUDENT_ACCOUNTS_COLLECTION = 'studentAccounts';

const adminSeedUsers: User[] = mockUsers.filter((user) => user.role === 'admin');

// Initialize localStorage with mock data
export const initializeMockData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.STUDENT_ACCOUNTS)) {
    localStorage.setItem(STORAGE_KEYS.STUDENT_ACCOUNTS, JSON.stringify(studentAccounts));
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const storedAccounts = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.STUDENT_ACCOUNTS) || '[]'
    ) as StudentAccount[];
    localStorage.setItem(
      STORAGE_KEYS.USERS,
      JSON.stringify([...adminSeedUsers, ...mapStudentAccountsToUsers(storedAccounts)])
    );
  }
  if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(mockGroups));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(mockSessions));
  }
  if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(mockRecords));
  }
};

export const getStudentAccounts = (): StudentAccount[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_ACCOUNTS) || '[]');
};

const setStudentAccounts = (accounts: StudentAccount[]) => {
  localStorage.setItem(STORAGE_KEYS.STUDENT_ACCOUNTS, JSON.stringify(accounts));
};

export const getStudentAccountsFromFirebase = async (): Promise<StudentAccount[]> => {
  const snapshot = await getDocs(collection(firebaseDb, STUDENT_ACCOUNTS_COLLECTION));
  const accounts: StudentAccount[] = snapshot.docs.map((accountDoc) => {
    const data = accountDoc.data() as Partial<StudentAccount>;
    return {
      studentId: String(data.studentId || accountDoc.id).trim(),
      fullName: String(data.fullName || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      password: String(data.password || ''),
      userId: String(data.userId || `sv_${String(data.studentId || accountDoc.id).trim()}`),
    };
  });

  setStudentAccounts(accounts);
  return accounts;
};

// Auth functions
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

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  return user;
};

export const loginAdminWithFirebase = async (email: string, password: string): Promise<User | null> => {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
    const firebaseEmail = credential.user.email ?? normalizedEmail;
    const adminUser: User = {
      id: `firebase-admin-${credential.user.uid}`,
      name: credential.user.displayName || 'Quản trị viên',
      email: firebaseEmail,
      role: 'admin',
      password: '',
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(adminUser));
    return adminUser;
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  signOut(firebaseAuth).catch(() => undefined);
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return userStr ? JSON.parse(userStr) : null;
};

// Session functions
export const getSessions = (): AttendanceSession[] => {
  const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');
  return sessions.map((s: any) => ({
    ...s,
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime),
  }));
};

export const createSession = async (
  session: Omit<AttendanceSession, 'id' | 'token'>
): Promise<AttendanceSession> => {
  const sessions = getSessions();
  const token = `ATT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const sessionRef = await addDoc(collection(firebaseDb, SESSIONS_COLLECTION), {
    name: session.name,
    token,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    groupId: session.groupId,
    createdBy: session.createdBy,
    status: session.status,
  });

  const newSession: AttendanceSession = {
    ...session,
    id: sessionRef.id,
    token,
  };
  sessions.push(newSession);
  setSessionsCache(sessions);
  return newSession;
};

export const getSessionByToken = (token: string): AttendanceSession | null => {
  const sessions = getSessions();
  return sessions.find(s => s.token === token) || null;
};

export const getSessionByTokenFromFirebase = async (token: string): Promise<AttendanceSession | null> => {
  const sessions = await getSessionsFromFirebase();
  return sessions.find((s) => s.token === token) || null;
};

// Record functions
export const getRecords = (): AttendanceRecord[] => {
  const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS) || '[]');
  return records.map((r: any) => ({
    ...r,
    timestamp: new Date(r.timestamp),
  }));
};

export const createRecord = (
  sessionId: string,
  userId: string
): { success: boolean; message: string; record?: AttendanceRecord } => {
  const session = getSessions().find((s) => s.id === sessionId);
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

  const records = getRecords();
  const existingRecord = records.find((r) => r.sessionId === sessionId && r.userId === userId);
  if (existingRecord) {
    return { success: false, message: 'Bạn đã điểm danh cho phiên này rồi' };
  }

  const newRecord: AttendanceRecord = {
    id: `record${Date.now()}`,
    sessionId,
    userId,
    timestamp: now,
    status: 'valid',
  };

  records.push(newRecord);
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  return { success: true, message: 'Điểm danh thành công', record: newRecord };
};

export const getRecordsBySession = (sessionId: string): AttendanceRecord[] => {
  return getRecords().filter(r => r.sessionId === sessionId);
};

export const getRecordsByUser = (userId: string): AttendanceRecord[] => {
  return getRecords().filter(r => r.userId === userId);
};

// Group functions
export const getGroups = (): Group[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]');
};

const setGroupsCache = (groups: Group[]) => {
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
};

const setSessionsCache = (sessions: AttendanceSession[]) => {
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
};

const toDateValue = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(String(value));
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
    const now = new Date();
    const computedStatus: AttendanceSession['status'] = now > endTime ? 'expired' : 'active';

    return {
      id: sessionDoc.id,
      name: data.name || '',
      token: data.token || '',
      startTime,
      endTime,
      groupId: data.groupId || '',
      createdBy: data.createdBy || '',
      status: data.status || computedStatus,
    };
  });

  setSessionsCache(sessions);
  return sessions;
};

export const getUsers = (): User[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
};

export const getUserById = (userId: string): User | undefined => {
  return getUsers().find(u => u.id === userId);
};

export const importStudentsToGroup = async (
  groupId: string,
  rows: ImportedStudentRow[]
): Promise<{ added: number; updated: number; linkedToGroup: number }> => {
  const groups = getGroups();
  const groupIndex = groups.findIndex((g) => g.id === groupId);
  if (groupIndex === -1) {
    return { added: 0, updated: 0, linkedToGroup: 0 };
  }

  const existingAccounts = await getStudentAccountsFromFirebase();
  const users = getUsers();
  const nextAccounts = [...existingAccounts];
  const nextUsers = [...users];

  let added = 0;
  let updated = 0;
  let linkedToGroup = 0;

  const findAccountIndex = (studentId: string) =>
    nextAccounts.findIndex((a) => a.studentId.trim().toLowerCase() === studentId.trim().toLowerCase());

  rows.forEach((row) => {
    const normalizedStudentId = row.studentId.trim();
    if (!normalizedStudentId) return;
    const normalizedUserId = `sv_${normalizedStudentId}`;

    const accountIndex = findAccountIndex(normalizedStudentId);
    let userId = normalizedUserId;

    if (accountIndex >= 0) {
      nextAccounts[accountIndex] = {
        ...nextAccounts[accountIndex],
        fullName: row.fullName.trim(),
        email: row.email.trim().toLowerCase(),
        password: row.password,
        userId: normalizedUserId,
      };
      updated += 1;
    } else {
      nextAccounts.push({
        studentId: normalizedStudentId,
        fullName: row.fullName.trim(),
        email: row.email.trim().toLowerCase(),
        password: row.password,
        userId: normalizedUserId,
      });
      added += 1;
    }

    const existingUserIndex = nextUsers.findIndex((u) => u.id === userId);
    const nextUser: User = {
      id: userId,
      name: row.fullName.trim(),
      email: row.email.trim().toLowerCase(),
      role: 'user',
      password: row.password,
    };

    if (existingUserIndex >= 0) {
      nextUsers[existingUserIndex] = { ...nextUsers[existingUserIndex], ...nextUser };
    } else {
      nextUsers.push(nextUser);
    }

    if (!groups[groupIndex].memberIds.includes(userId)) {
      groups[groupIndex].memberIds.push(userId);
      linkedToGroup += 1;
    }
  });

  setStudentAccounts(nextAccounts);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
  setGroupsCache(groups);

  await Promise.all(
    rows
      .map((row) => {
        const normalizedStudentId = row.studentId.trim();
        if (!normalizedStudentId) {
          return null;
        }
        const accountPayload: StudentAccount = {
          studentId: normalizedStudentId,
          fullName: row.fullName.trim(),
          email: row.email.trim().toLowerCase(),
          password: row.password,
          userId: `sv_${normalizedStudentId}`,
        };
        return setDoc(doc(firebaseDb, STUDENT_ACCOUNTS_COLLECTION, normalizedStudentId), accountPayload);
      })
      .filter((promise): promise is Promise<void> => Boolean(promise))
  );

  await updateDoc(doc(firebaseDb, GROUPS_COLLECTION, groupId), {
    memberIds: groups[groupIndex].memberIds,
  });

  return { added, updated, linkedToGroup };
};

// User management functions
export const createUser = (user: Omit<User, 'id'>): User => {
  const users = getUsers();
  const newUser: User = {
    ...user,
    id: `user${Date.now()}`,
  };
  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  return newUser;
};

export const updateUser = (userId: string, updates: Partial<User>): User | null => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  return users[index];
};

export const deleteUser = (userId: string): boolean => {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== userId);
  if (filtered.length === users.length) return false;
  
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
  return true;
};

// Group management functions
export const createGroup = async (group: Omit<Group, 'id'>): Promise<Group> => {
  const groups = getGroups();
  const groupRef = await addDoc(collection(firebaseDb, GROUPS_COLLECTION), {
    name: group.name,
    description: group.description,
    memberIds: group.memberIds,
  });

  const newGroup: Group = { ...group, id: groupRef.id };
  groups.push(newGroup);
  setGroupsCache(groups);
  return newGroup;
};

export const updateGroup = async (groupId: string, updates: Partial<Group>): Promise<Group | null> => {
  const groups = getGroups();
  const index = groups.findIndex(g => g.id === groupId);
  if (index === -1) return null;
  
  groups[index] = { ...groups[index], ...updates };
  setGroupsCache(groups);
  await updateDoc(doc(firebaseDb, GROUPS_COLLECTION, groupId), {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.memberIds !== undefined ? { memberIds: updates.memberIds } : {}),
  });
  return groups[index];
};

export const deleteGroup = async (groupId: string): Promise<boolean> => {
  const groups = getGroups();
  const filtered = groups.filter(g => g.id !== groupId);
  if (filtered.length === groups.length) return false;
  
  setGroupsCache(filtered);
  await deleteDoc(doc(firebaseDb, GROUPS_COLLECTION, groupId));
  return true;
};

export const addMemberToGroup = async (groupId: string, userId: string): Promise<boolean> => {
  const group = getGroups().find(g => g.id === groupId);
  if (!group) return false;
  
  if (group.memberIds.includes(userId)) return false;
  
  group.memberIds.push(userId);
  await updateGroup(groupId, { memberIds: group.memberIds });
  return true;
};

export const removeMemberFromGroup = async (groupId: string, userId: string): Promise<boolean> => {
  const group = getGroups().find(g => g.id === groupId);
  if (!group) return false;
  
  const filtered = group.memberIds.filter(id => id !== userId);
  if (filtered.length === group.memberIds.length) return false;
  
  await updateGroup(groupId, { memberIds: filtered });
  return true;
};




