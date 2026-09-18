import { User } from '@/types';
import { useStore } from './store';

const JWT_SECRET = 'demo-secret-key-change-in-production';

// Simple hash for demo (not secure for production)
export async function hashPassword(password: string): Promise<string> {
  // For demo purposes, we'll use a simple base64 encoding
  // In production, use proper bcrypt on the server
  return btoa(password);
}

// Simple verify for demo (not secure for production)
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return btoa(password) === hash;
}

// Simple token generation for demo
export function generateToken(user: User): string {
  const tokenData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    teamId: user.team_id,
    timestamp: Date.now(),
  };
  return btoa(JSON.stringify(tokenData));
}

// Simple token verification for demo
export function verifyToken(token: string): any {
  try {
    const decoded = JSON.parse(atob(token));
    // Check if token is expired (24 hours)
    if (Date.now() - decoded.timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  const store = useStore.getState();
  const user = store.users.find((u) => u.username === username);
  
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  // Check if user is a participant and team is active
  if (user.role === 'participant') {
    const team = store.teams.find((t) => t.id === user.team_id);
    if (!team || !team.active) {
      return { success: false, error: 'Team is not active' };
    }
  }
  
  return { success: true, user };
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

export function isParticipant(user: User | null): boolean {
  return user?.role === 'participant';
}

export function saveSession(user: User): void {
  if (typeof window === 'undefined') return;
  const token = generateToken(user);
  sessionStorage.setItem('arkk_user_token', token);
  sessionStorage.setItem('arkk_current_user', JSON.stringify(user));
  localStorage.setItem('token', token);
  localStorage.setItem(`arkk_user_${user.role}`, JSON.stringify(user));
}

export function getSavedSession(expectedRole?: 'admin' | 'participant'): User | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem('arkk_current_user');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.id && parsed?.role) {
        if (!expectedRole || parsed.role === expectedRole) {
          return parsed;
        }
      }
    }
  } catch (e) {
    // Ignore JSON error
  }

  // Fallback to role-specific cache from localStorage
  if (expectedRole) {
    try {
      const roleCached = localStorage.getItem(`arkk_user_${expectedRole}`);
      if (roleCached) {
        const parsed = JSON.parse(roleCached);
        if (parsed?.id && parsed?.role === expectedRole) {
          sessionStorage.setItem('arkk_current_user', JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch (e) {}
  }

  const token = sessionStorage.getItem('arkk_user_token') || localStorage.getItem('token');
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  if (expectedRole && decoded.role !== expectedRole) {
    return null;
  }

  const store = useStore.getState();
  const user = store.users.find((u) => u.id === decoded.userId);
  if (user) {
    sessionStorage.setItem('arkk_current_user', JSON.stringify(user));
    return user;
  }

  const restored: User = {
    id: decoded.userId,
    username: decoded.username,
    role: decoded.role,
    team_id: decoded.teamId,
    password_hash: '',
  };
  sessionStorage.setItem('arkk_current_user', JSON.stringify(restored));
  return restored;
}

export function clearSession(role?: 'admin' | 'participant'): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('arkk_user_token');
  sessionStorage.removeItem('arkk_current_user');
  localStorage.removeItem('token');
  if (role) {
    localStorage.removeItem(`arkk_user_${role}`);
  } else {
    localStorage.removeItem('arkk_user_admin');
    localStorage.removeItem('arkk_user_participant');
  }
}
