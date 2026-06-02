"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export type TeamUserRow = {
  id: string;
  email: string | null;
  role: "admin" | "member";
  fullName: string;
  createdAt: string;
  lastSignInAt: string | null;
};

type Props = {
  currentUserId: string;
};

export function TeamSettingsPanel({ currentUserId }: Props) {
  const [users, setUsers] = useState<TeamUserRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [resetBusyUserId, setResetBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<{ id: string; label: string } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/admin/users");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(typeof data.error === "string" ? data.error : "Could not load team");
      setUsers([]);
      return;
    }
    setUsers(Array.isArray(data.users) ? data.users : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInvite() {
    setMessage(null);
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter an email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role: inviteRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Invite failed");
        return;
      }
      setEmail("");
      setMessage(
        "Invitation sent. They will receive an email to set their password and sign in."
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(userId: string, role: "admin" | "member") {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not update role");
      return;
    }
    setMessage("Role updated.");
    await load();
  }

  async function executeRemoveUser() {
    if (!userToRemove) return;
    const userId = userToRemove.id;
    setRemoveBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Could not remove user");
        return;
      }
      setUserToRemove(null);
      setMessage("User removed.");
      await load();
    } finally {
      setRemoveBusy(false);
    }
  }

  async function sendPasswordReset(userId: string) {
    setError(null);
    setMessage(null);
    setResetBusyUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not send password reset link");
        return;
      }
      setMessage("Password reset link sent.");
    } finally {
      setResetBusyUserId(null);
    }
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={userToRemove !== null}
        title="Remove user?"
        description={
          userToRemove
            ? `${userToRemove.label} will lose access immediately and won’t be able to sign in. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove user"
        cancelLabel="Cancel"
        variant="danger"
        busy={removeBusy}
        onCancel={() => !removeBusy && setUserToRemove(null)}
        onConfirm={() => void executeRemoveUser()}
      />
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-surface">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Invite teammate
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          They get an email to confirm and set a password. Choose their access level below.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Email
            </span>
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-surface"
            />
          </label>
          <label className="block sm:w-40">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Role
            </span>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value === "admin" ? "admin" : "member")
              }
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-surface"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendInvite()}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </div>
      </section>

      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-surface">
        <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">People</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Admins manage integrations and this team list. Members can create summaries and use
            shared ClickUp data.
          </p>
        </div>
        {loadError ? (
          <p className="px-6 py-8 text-sm text-red-700 dark:text-red-300">{loadError}</p>
        ) : users === null ? (
          <p className="px-6 py-8 text-sm text-zinc-500">Loading…</p>
        ) : users.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const adminCount = users.filter((x) => x.role === "admin").length;
                  const soleAdminLocked =
                    u.role === "admin" && adminCount <= 1;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/80"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {u.email ?? "—"}
                        </span>
                        {u.fullName?.trim() ? (
                          <span className="mt-0.5 block text-xs text-zinc-500">{u.fullName}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={soleAdminLocked}
                          onChange={(e) =>
                            void updateRole(
                              u.id,
                              e.target.value === "admin" ? "admin" : "member"
                            )
                          }
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-surface disabled:opacity-50"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            disabled={!u.email || resetBusyUserId === u.id}
                            onClick={() => void sendPasswordReset(u.id)}
                            className="cursor-pointer text-xs font-medium text-zinc-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-200"
                          >
                            {resetBusyUserId === u.id ? "Sending…" : "Send password reset link"}
                          </button>
                          <button
                            type="button"
                            disabled={u.id === currentUserId}
                            onClick={() =>
                              setUserToRemove({
                                id: u.id,
                                label: u.email?.trim() || u.fullName?.trim() || "This user",
                              })
                            }
                            className="cursor-pointer text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
