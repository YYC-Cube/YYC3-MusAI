/**
 * 内存 DB 驱动（DB_DRIVER=memory）
 *
 * 仅用于本地开发 / 测试：musai.users 关系表的进程内实现，
 * 行结构与 db.ts 的 pg 查询列一致（snake_case），对外映射仍由 db.ts 负责。
 * 应用层鉴权（auth.ts）依赖 users 表判定用户存在与角色，
 * 内存驱动使离线测试可以走完整注册/会话/鉴权链路。
 * 进程重启后数据丢失，禁止用于生产。
 */

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  nickname: string;
  avatar: string;
  role: string;
  status: string;
  created_at: Date;
}

const users = new Map<string, UserRow>();

/** 按邮箱查用户（含 password_hash，语义同 pg 分支） */
export const getUserByEmail = async (email: string): Promise<any | null> => {
  for (const row of users.values()) {
    if (row.email === email) return { ...row };
  }
  return null;
};

/** 邮箱是否已存在（pg 分支不可用返回 null；内存驱动始终可判定） */
export const emailExists = async (email: string): Promise<boolean | null> => {
  for (const row of users.values()) {
    if (row.email === email) return true;
  }
  return false;
};

/** 查询用户基础信息（不含 password_hash，语义同 pg SELECT 列） */
export const getUserProfile = async (userId: string): Promise<any | null> => {
  const row = users.get(userId);
  if (!row) return null;
  const { password_hash: _passwordHash, ...rest } = row;
  return { ...rest };
};

/** 写入/更新用户基础信息（语义同 INSERT ... ON CONFLICT (id) DO UPDATE） */
export const upsertUserProfile = async (
  userId: string,
  data: { email?: string; nickname?: string; avatar?: string; role?: string },
): Promise<void> => {
  let row = users.get(userId);
  if (!row) {
    row = {
      id: userId,
      username: userId,
      email: "",
      password_hash: "",
      nickname: "",
      avatar: "",
      role: "user",
      status: "active",
      created_at: new Date(),
    };
    users.set(userId, row);
  }
  if (data.email !== undefined) row.email = data.email;
  if (data.nickname !== undefined) row.nickname = data.nickname;
  if (data.avatar !== undefined) row.avatar = data.avatar;
  if (data.role !== undefined) row.role = data.role;
};

/** 创建用户（事务语义：唯一 email 约束冲突返回 false） */
export const createUser = async (
  userId: string,
  data: { email: string; passwordHash: string; displayName: string },
): Promise<boolean> => {
  if (await emailExists(data.email)) return false;
  const base = (data.displayName || data.email.split("@")[0] || "user").slice(0, 40);
  const username = `${base}-${userId.slice(0, 6)}`.slice(0, 50);
  users.set(userId, {
    id: userId,
    username,
    email: data.email,
    password_hash: data.passwordHash,
    nickname: data.displayName || base,
    avatar: "",
    role: "user",
    status: "active",
    created_at: new Date(),
  });
  return true;
};

/** 测试辅助：清空内存用户表 */
export const clearAll = async (): Promise<void> => {
  users.clear();
};
