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

// Mock users
export const mockUsers: User[] = [
  {
    id: 'admin1',
    name: 'Nguyá»…n VÄƒn An',
    email: 'admin@example.com',
    role: 'admin',
    password: 'admin123',
  },
  {
    id: 'user1',
    name: 'Tráº§n Thá»‹ BÃ¬nh',
    email: 'user1@example.com',
    role: 'user',
    password: 'user123',
  },
  {
    id: 'user2',
    name: 'LÃª VÄƒn CÆ°á»ng',
    email: 'user2@example.com',
    role: 'user',
    password: 'user123',
  },
  {
    id: 'user3',
    name: 'Pháº¡m Thá»‹ Dung',
    email: 'user3@example.com',
    role: 'user',
    password: 'user123',
  },
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
};

// Initialize localStorage with mock data
export const initializeMockData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mockUsers));
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

// Auth functions
export const login = (email: string, password: string): User | null => {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const user = users.find((u: User) => u.email === email && u.password === password);
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  }
  return null;
};

export const loginAdminWithFirebase = async (email: string, password: string): Promise<User | null> => {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getUsers();
  const adminUser = users.find(
    (u) => u.role === 'admin' && u.email.trim().toLowerCase() === normalizedEmail
  );
  if (!adminUser) {
    return null;
  }
  try {
    await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
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

export const createSession = (session: Omit<AttendanceSession, 'id' | 'token'>): AttendanceSession => {
  const sessions = getSessions();
  const newSession: AttendanceSession = {
    ...session,
    id: `session${Date.now()}`,
    token: `ATT-${new Date().getFullYear()}-${String(sessions.length + 1).padStart(3, '0')}`,
  };
  sessions.push(newSession);
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  return newSession;
};

export const getSessionByToken = (token: string): AttendanceSession | null => {
  const sessions = getSessions();
  return sessions.find(s => s.token === token) || null;
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
  const session = getSessions().find(s => s.id === sessionId);
  if (!session) {
    return { success: false, message: 'PhiÃªn Ä‘iá»ƒm danh khÃ´ng tá»“n táº¡i' };
  }

  const now = new Date();
  if (now < session.startTime) {
    return { success: false, message: 'PhiÃªn Ä‘iá»ƒm danh chÆ°a báº¯t Ä‘áº§u' };
  }
  if (now > session.endTime) {
    return { success: false, message: 'PhiÃªn Ä‘iá»ƒm danh Ä‘Ã£ káº¿t thÃºc' };
  }

  const records = getRecords();
  const existingRecord = records.find(r => r.sessionId === sessionId && r.userId === userId);
  if (existingRecord) {
    return { success: false, message: 'Báº¡n Ä‘Ã£ Ä‘iá»ƒm danh cho phiÃªn nÃ y rá»“i' };
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
  return { success: true, message: 'Äiá»ƒm danh thÃ nh cÃ´ng', record: newRecord };
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

export const getUsers = (): User[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
};

export const getUserById = (userId: string): User | undefined => {
  return getUsers().find(u => u.id === userId);
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
export const createGroup = (group: Omit<Group, 'id'>): Group => {
  const groups = getGroups();
  const newGroup: Group = {
    ...group,
    id: `group${Date.now()}`,
  };
  groups.push(newGroup);
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  return newGroup;
};

export const updateGroup = (groupId: string, updates: Partial<Group>): Group | null => {
  const groups = getGroups();
  const index = groups.findIndex(g => g.id === groupId);
  if (index === -1) return null;
  
  groups[index] = { ...groups[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  return groups[index];
};

export const deleteGroup = (groupId: string): boolean => {
  const groups = getGroups();
  const filtered = groups.filter(g => g.id !== groupId);
  if (filtered.length === groups.length) return false;
  
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(filtered));
  return true;
};

export const addMemberToGroup = (groupId: string, userId: string): boolean => {
  const group = getGroups().find(g => g.id === groupId);
  if (!group) return false;
  
  if (group.memberIds.includes(userId)) return false;
  
  group.memberIds.push(userId);
  updateGroup(groupId, { memberIds: group.memberIds });
  return true;
};

export const removeMemberFromGroup = (groupId: string, userId: string): boolean => {
  const group = getGroups().find(g => g.id === groupId);
  if (!group) return false;
  
  const filtered = group.memberIds.filter(id => id !== userId);
  if (filtered.length === group.memberIds.length) return false;
  
  updateGroup(groupId, { memberIds: filtered });
  return true;
};
