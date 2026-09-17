import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Target,
  UserPlus,
  Store,
  Link2,
  RefreshCw,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type AdminSection =
  | "overview"
  | "users"
  | "leads"
  | "referrals"
  | "resellers"
  | "links";

type AdminUser = {
  id: string;
  email: string;
  name?: string | null;
  plan?: string | null;
  active?: boolean;
  is_active?: boolean;
  status?: string | null;
  subscription_end?: string | null;
  trial_start?: string | null;
  trial_end?: string | null;
};

type AdminLead = {
  id: string;
  type?: string | null;
  title?: string | null;
  client_name?: string | null;
  skill_needed?: string | null;
  country?: string | null;
  source?: string | null;
  created_at?: string | null;
  status?: string | null;
};

type Invite = {
  id: string | number;
  email: string;
  token: string;
  name?: string | null;
  phone?: string | null;
  plan?: string | null;
  trial_days?: number | null;
  created_at?: string | null;
  used_at?: string | null;
  user_id?: string | null;
};

type OverviewData = {
  users: number;
  activeUsers: number;
  activeLeads: number;
  resellers: number;
  demandLeads?: number;
  supplyLeads?: number;
  referrals?: number;
  referralLinks?: number;
  subscriptions?: number;
};

const sections = [
  {
    id: "overview" as const,
    label: "Overview",
    icon: ShieldCheck,
  },
  {
    id: "users" as const,
    label: "Users",
    icon: Users,
  },
  {
    id: "leads" as const,
    label: "Leads",
    icon: Target,
  },
  {
    id: "referrals" as const,
    label: "Referrals",
    icon: UserPlus,
  },
  {
    id: "resellers" as const,
    label: "Resellers",
    icon: Store,
  },
  {
    id: "links" as const,
    label: "Referral Links",
    icon: Link2,
  },
];

async function adminRequest(
  action: string,
  options?: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  }
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be logged in as admin.");
  }

  const method = options?.method || "GET";

  const response = await fetch(
    `/api/admin?action=${encodeURIComponent(action)}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      ...(method === "POST"
        ? {
            body: JSON.stringify(
              options?.body || {}
            ),
          }
        : {}),
    }
  );

  let result: any;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "Admin API returned an invalid response."
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || "Admin request failed."
    );
  }

  return result;
}

function dateText(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

function isUserActive(user: AdminUser) {
  if (typeof user.active === "boolean") {
    return user.active;
  }

  if (typeof user.is_active === "boolean") {
    return user.is_active;
  }

  return false;
}

function getStatus(user: AdminUser) {
  if (user.status) {
    return user.status;
  }

  return isUserActive(user)
    ? "active"
    : "inactive";
}

function getStatusClass(user: AdminUser) {
  const status =
    getStatus(user).toLowerCase();

  if (status === "active") {
    return "text-[#00c98b]";
  }

  if (status === "trial") {
    return "text-yellow-400";
  }

  if (status === "deactivated") {
    return "text-orange-400";
  }

  if (
    status === "expired" ||
    status === "cancelled" ||
    status === "inactive"
  ) {
    return "text-red-400";
  }

  return "text-[#aaa]";
}

export default function Admin() {
  const navigate = useNavigate();

  const [section, setSection] =
    useState<AdminSection>("overview");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [overview, setOverview] =
    useState<OverviewData | null>(null);

  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [leads, setLeads] =
    useState<AdminLead[]>([]);

  const [invites, setInvites] =
    useState<Invite[]>([]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      if (section === "overview") {
        const result =
          await adminRequest("overview");

        setOverview(
          result.overview || null
        );
      }

      if (section === "users") {
        const result =
          await adminRequest("users");

        setUsers(result.users || []);
      }

      if (section === "leads") {
        const result =
          await adminRequest("leads");

        setLeads(result.leads || []);
      }

      if (section === "links") {
        const result =
          await adminRequest("invites");

        setInvites(
          result.invites || []
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load admin data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [section]);

  async function updateUser(
    user: AdminUser,
    action: string,
    plan?: string
  ) {
    setLoading(true);
    setError("");

    try {
      await adminRequest("set_user", {
        method: "POST",
        body: {
          id: user.id,
          action,
          ...(plan
            ? { plan }
            : {}),
        },
      });

      const result =
        await adminRequest("users");

      setUsers(
        result.users || []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update user."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-[#272727] bg-[#111]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate("/dashboard")
                }
                className="rounded-lg p-2 text-[#aaa] hover:bg-[#222] hover:text-white"
              >
                <ArrowLeft size={19} />
              </button>

              <div>
                <h1 className="text-xl font-semibold">
                  Admin Panel
                </h1>

                <p className="text-xs text-[#777]">
                  Opportunity Hub administration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs font-medium hover:bg-[#222] disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-[#272727] bg-[#111]">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {sections.map((item) => {
              const Icon = item.icon;
              const active =
                section === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setSection(item.id)
                  }
                  className={[
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium",
                    active
                      ? "bg-[#00c98b] text-black"
                      : "text-[#888] hover:bg-[#222] hover:text-white",
                  ].join(" ")}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {section === "overview" && (
          <Overview
            data={overview}
            loading={loading}
          />
        )}

        {section === "users" && (
          <UsersSection
            users={users}
            loading={loading}
            updateUser={updateUser}
          />
        )}

        {section === "leads" && (
          <LeadsSection
            leads={leads}
            loading={loading}
            reload={loadData}
          />
        )}

        {section === "links" && (
          <LinksSection
            invites={invites}
            reload={loadData}
          />
        )}

        {section === "referrals" && (
          <Placeholder
            title="Referrals"
            text="Referral tracking records are available through the admin system."
          />
        )}

        {section === "resellers" && (
          <Placeholder
            title="Resellers"
            text="Reseller commission records are available through the admin system."
          />
        )}
      </main>
    </div>
  );
      }function LinksSection({
  invites,
  reload,
}: {
  invites: Invite[];
  reload: () => void;
}) {
  const [email, setEmail] =
    useState("");

  const [plan, setPlan] =
    useState("Basic");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const origin =
    typeof window !==
    "undefined"
      ? window.location.origin
      : "https://opportunity-hub-umber.vercel.app";

  async function createInvite() {
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage(
        "Enter an email address."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result =
        await adminRequest(
          "create_invite",
          {
            method: "POST",
            body: {
              email: cleanEmail,
              plan,
            },
          }
        );

      const token =
        result.invite?.token;

      const inviteUrl =
        result.invite_url ||
        (token
          ? `${origin}/invite-register/${encodeURIComponent(
              token
            )}`
          : "");

      if (!inviteUrl) {
        throw new Error(
          "Invite was created but no link was returned."
        );
      }

      try {
        await navigator.clipboard?.writeText(
          inviteUrl
        );
      } catch {
        // Clipboard may be unavailable on some mobile browsers.
      }

      setMessage(
        `Invite created: ${inviteUrl}`
      );

      setEmail("");

      reload();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not create invite."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">
          Referral Links
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Create email-bound customer invite links.
        </p>
      </div>

      <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
        <h3 className="mb-4 text-sm font-semibold">
          Create Invite
        </h3>

        <div className="grid gap-3">
          <input
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="Customer email"
            type="email"
            className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#555] focus:border-[#555]"
          />

          <select
            value={plan}
            onChange={(event) =>
              setPlan(
                event.target.value
              )
            }
            className="rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="Basic">
              Basic
            </option>

            <option value="Premium">
              Premium
            </option>

            <option value="Gold">
              Gold
            </option>
          </select>

          <button
            type="button"
            onClick={createInvite}
            disabled={loading}
            className="rounded-lg bg-[#00c98b] px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Invite Link"}
          </button>

          {message && (
            <div className="break-all rounded-lg border border-[#292929] bg-[#101010] p-3 text-xs text-[#aaa]">
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {invites.map((invite) => {
          const link =
            `${origin}/invite-register/` +
            encodeURIComponent(
              invite.token
            );

          return (
            <div
              key={String(
                invite.id
              )}
              className="rounded-xl border border-[#272727] bg-[#141414] p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="break-all text-sm font-medium">
                    {invite.email}
                  </p>

                  <p className="mt-1 text-xs text-[#777]">
                    {invite.plan ||
                      "Basic"}{" "}
                    • Trial:{" "}
                    {invite.trial_days ??
                      14}{" "}
                    days
                  </p>
                </div>

                <span className="text-[11px] text-[#666]">
                  {dateText(
                    invite.created_at
                  )}
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-[#252525] bg-[#101010] p-3">
                <p className="break-all text-xs text-[#aaa]">
                  {invite.used_at
                    ? "Used"
                    : link}
                </p>
              </div>
            </div>
          );
        })}

        {invites.length === 0 && (
          <div className="rounded-xl border border-[#272727] bg-[#141414] p-8 text-center text-sm text-[#666]">
            No invite links found.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={reload}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs hover:bg-[#222] disabled:opacity-50"
      >
        <RefreshCw
          size={14}
          className={
            loading
              ? "animate-spin"
              : ""
          }
        />
        Refresh Links
      </button>
    </section>
  );
}

function Placeholder({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Opportunity Hub administration.
        </p>
      </div>

      <div className="rounded-xl border border-[#272727] bg-[#141414] p-6">
        <p className="text-sm leading-6 text-[#888]">
          {text}
        </p>
      </div>
    </section>
  );
}function LinksSection({
  invites,
  reload,
}: {
  invites: Invite[];
  reload: () => void;
}) {
  const [email, setEmail] =
    useState("");

  const [plan, setPlan] =
    useState("Basic");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const origin =
    typeof window !==
    "undefined"
      ? window.location.origin
      : "https://opportunity-hub-umber.vercel.app";

  async function createInvite() {
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage(
        "Enter an email address."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result =
        await adminRequest(
          "create_invite",
          {
            method: "POST",
            body: {
              email: cleanEmail,
              plan,
            },
          }
        );

      const token =
        result.invite?.token;

      const inviteUrl =
        result.invite_url ||
        (token
          ? `${origin}/invite-register/${encodeURIComponent(
              token
            )}`
          : "");

      if (!inviteUrl) {
        throw new Error(
          "Invite was created but no link was returned."
        );
      }

      try {
        await navigator.clipboard?.writeText(
          inviteUrl
        );
      } catch {
        // Clipboard may be unavailable on some mobile browsers.
      }

      setMessage(
        `Invite created: ${inviteUrl}`
      );

      setEmail("");

      reload();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not create invite."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">
          Referral Links
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Create email-bound customer invite links.
        </p>
      </div>

      <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
        <h3 className="mb-4 text-sm font-semibold">
          Create Invite
        </h3>

        <div className="grid gap-3">
          <input
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="Customer email"
            type="email"
            className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#555] focus:border-[#555]"
          />

          <select
            value={plan}
            onChange={(event) =>
              setPlan(
                event.target.value
              )
            }
            className="rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="Basic">
              Basic
            </option>

            <option value="Premium">
              Premium
            </option>

            <option value="Gold">
              Gold
            </option>
          </select>

          <button
            type="button"
            onClick={createInvite}
            disabled={loading}
            className="rounded-lg bg-[#00c98b] px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Invite Link"}
          </button>

          {message && (
            <div className="break-all rounded-lg border border-[#292929] bg-[#101010] p-3 text-xs text-[#aaa]">
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {invites.map((invite) => {
          const link =
            `${origin}/invite-register/` +
            encodeURIComponent(
              invite.token
            );

          return (
            <div
              key={String(
                invite.id
              )}
              className="rounded-xl border border-[#272727] bg-[#141414] p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="break-all text-sm font-medium">
                    {invite.email}
                  </p>

                  <p className="mt-1 text-xs text-[#777]">
                    {invite.plan ||
                      "Basic"}{" "}
                    • Trial:{" "}
                    {invite.trial_days ??
                      14}{" "}
                    days
                  </p>
                </div>

                <span className="text-[11px] text-[#666]">
                  {dateText(
                    invite.created_at
                  )}
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-[#252525] bg-[#101010] p-3">
                <p className="break-all text-xs text-[#aaa]">
                  {invite.used_at
                    ? "Used"
                    : link}
                </p>
              </div>
            </div>
          );
        })}

        {invites.length === 0 && (
          <div className="rounded-xl border border-[#272727] bg-[#141414] p-8 text-center text-sm text-[#666]">
            No invite links found.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={reload}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs hover:bg-[#222] disabled:opacity-50"
      >
        <RefreshCw
          size={14}
          className={
            loading
              ? "animate-spin"
              : ""
          }
        />
        Refresh Links
      </button>
    </section>
  );
}

function Placeholder({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Opportunity Hub administration.
        </p>
      </div>

      <div className="rounded-xl border border-[#272727] bg-[#141414] p-6">
        <p className="text-sm leading-6 text-[#888]">
          {text}
        </p>
      </div>
    </section>
  );
}
