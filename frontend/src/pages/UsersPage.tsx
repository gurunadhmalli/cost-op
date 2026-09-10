import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Shield, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { Role, useAuthStore } from '../store/authStore';

interface ManagedUser {
  userId: string;
  email: string;
  role: Role;
  createdAt: string;
}

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-violet-100 text-violet-800 border-violet-300',
  operator: 'bg-sky-100 text-sky-800 border-sky-300',
  viewer: 'bg-slate-100 text-slate-600 border-slate-300',
};

export const UsersPage: React.FC = () => {
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('viewer');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createNotice, setCreateNotice] = useState('');

  const loadUsers = () => {
    setLoading(true);
    setLoadError('');
    api
      .listUsers()
      .then(setUsers)
      .catch((err) => setLoadError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateNotice('');
    setCreating(true);
    try {
      await api.createUser(email.trim(), password, role);
      setCreateNotice(`Account created for ${email.trim()}.`);
      setEmail('');
      setPassword('');
      setRole('viewer');
      loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setSavingId(userId);
    try {
      await api.updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 neu-card p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-800 font-sans">User Access Management</h2>
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-mono font-bold text-violet-800 border border-violet-300">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create accounts for your team and control who can view data vs. take action (implement
            recommendations, run What-If).
          </p>
        </div>
      </div>

      {/* Create Account */}
      <div className="neu-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <UserPlus className="h-4 w-4 text-sky-600" />
          Add Account
        </h3>
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full h-10 rounded-lg neu-inset px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Initial Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-10 rounded-lg neu-inset pl-3 pr-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full h-10 rounded-lg neu-inset px-2 text-xs text-slate-800 focus:outline-none"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="neu-btn-primary flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold disabled:opacity-60"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create
          </button>
        </form>
        {createError && (
          <p className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-600">
            {createError}
          </p>
        )}
        {createNotice && !createError && (
          <p className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-medium text-emerald-800">
            {createNotice}
          </p>
        )}
      </div>

      {/* Users Table */}
      <div className="neu-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Shield className="h-4 w-4 text-sky-600" />
          All Accounts
        </h3>

        {loading && <p className="mt-4 text-xs text-slate-400">Loading…</p>}
        {loadError && (
          <p className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-600">
            {loadError}
          </p>
        )}

        {!loading && !loadError && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-300/80 text-[11px] text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-2">Email</th>
                  <th className="py-2.5 px-2">Role</th>
                  <th className="py-2.5 px-2">Created</th>
                  <th className="py-2.5 px-2 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td className="py-2.5 px-2 font-mono text-slate-800">
                      {u.email}
                      {u.userId === currentUserId && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                          you
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${ROLE_BADGE[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <select
                        value={u.role}
                        disabled={savingId === u.userId}
                        onChange={(e) => handleRoleChange(u.userId, e.target.value as Role)}
                        className="neu-btn rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none disabled:opacity-60"
                        title={
                          u.userId === currentUserId
                            ? "You can't remove your own admin access"
                            : undefined
                        }
                      >
                        <option value="viewer">Viewer</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
