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
  CalendarDays,
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
  created_at?: string;
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
  created_at?: string;
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
            body: JSON.stringify(options?.body || {}),
          }
        : {}),
    }
  );

  let result: any;

  try {
    result = await response.json();
  } catch {
    throw new Error("Admin API returned an invalid response.");
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

  return isUserActive(user) ? "active" : "inactive";
}

function getStatusClass(user: AdminUser) {
  const status = getStatus(user).toLowerCase();

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [overview, setOverview] =
    useState<OverviewData | null>(null);

  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [leads, setLeads] =
    useState<AdminLead[]>([]);

  const [invites, setInvites] =
    useState<Invite[]>([]);

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [invitePlan, setInvitePlan] =
    useState("Basic");

  const [inviteLoading, setInviteLoading] =
    useState(false);

  const [inviteResult, setInviteResult] =
    useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      if (section === "overview") {
        const result = await adminRequest("overview");

        setOverview(result.overview || null);
      }

      if (section === "users") {
        const result = await adminRequest("users");

        setUsers(result.users || []);
      }

      if (section === "links") {
        const result = await adminRequest("invites");

        setInvites(result.invites || []);
      }

      if (section === "leads") {
        const result = await adminRequest("leads");

        setLeads(result.leads || []);
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

  async function createInvite() {
    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      setInviteResult("Enter an email address.");
      return;
    }

    setInviteLoading(true);
    setInviteResult("");
    setError("");

    try {
      const result = await adminRequest(
        "create_invite",
        {
          method: "POST",
          body: {
            email,
            plan: invitePlan,
          },
        }
      );

      const token = result.invite?.token;

      setInviteEmail("");

      setInviteResult(
        token
          ? `Invite ready. Token: ${token}`
          : "Invite created successfully."
      );

      if (section === "links") {
        const refreshed =
          await adminRequest("invites");

        setInvites(
          refreshed.invites || []
        );
      }
    } catch (err) {
      setInviteResult(
        err instanceof Error
          ? err.message
          : "Could not create invite."
      );
    } finally {
      setInviteLoading(false);
    }
  }

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
          ...(plan ? { plan } : {}),
        },
      });

      const result =
        await adminRequest("users");

      setUsers(result.users || []);
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
            inviteEmail={inviteEmail}
            setInviteEmail={
              setInviteEmail
            }
            invitePlan={invitePlan}
            setInvitePlan={
              setInvitePlan
            }
            inviteLoading={
              inviteLoading
            }
            inviteResult={inviteResult}
            createInvite={
              createInvite
            }
            updateUser={updateUser}
          />
        )}

        {section === "leads" && (
          <LeadsSection
            leads={leads}
            loading={loading}
          />
        )}

        {section === "links" && (
          <LinksSection
            invites={invites}
            inviteEmail={inviteEmail}
            setInviteEmail={
              setInviteEmail
            }
            invitePlan={invitePlan}
            setInvitePlan={
              setInvitePlan
            }
            inviteLoading={
              inviteLoading
            }
            inviteResult={inviteResult}
            createInvite={
              createInvite
            }
          />
        )}

        {section === "referrals" && (
          <Placeholder
            title="Referrals"
            description="Referral tracking records are available through the admin system."
          />
        )}

        {section === "resellers" && (
          <Placeholder
            title="Resellers"
            description="Reseller commission records are available through the admin system."
          />
        )}
      </main>
    </div>
  );
}

function Overview({
  data,
  loading,
}: {
  data: OverviewData | null;
  loading: boolean;
}) {
  const cards = [
    ["Users", data?.users ?? "—", Users],
    [
      "Active Users",
      data?.activeUsers ?? "—",
      UserPlus,
    ],
    [
      "Active Leads",
      data?.activeLeads ?? "—",
      Target,
    ],
    [
      "Resellers",
      data?.resellers ?? "—",
      Store,
    ],
  ] as const;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">
          Admin Dashboard
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Core Opportunity Hub controls.
        </p>

        {loading && (
          <p className="mt-2 text-xs text-[#777]">
            Loading...
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(
          ([label, value, Icon]) => (
            <div
              key={label}
              className="rounded-xl border border-[#272727] bg-[#141414] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#777]">
                    {label}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {value}
                  </p>
                </div>

                <div className="rounded-lg bg-[#202020] p-2.5 text-[#00c98b]">
                  <Icon size={18} />
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {data && (
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBox
            label="Demand Leads"
            value={
              data.demandLeads ?? 0
            }
          />

          <InfoBox
            label="Supply Leads"
            value={
              data.supplyLeads ?? 0
            }
          />

          <InfoBox
            label="Referral Links"
            value={
              data.referralLinks ?? 0
            }
          />

          <InfoBox
            label="Subscriptions"
            value={
              data.subscriptions ?? 0
            }
          />
        </div>
      )}
    </section>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
      <p className="text-xs text-[#777]">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function UsersSection({
  users,
  loading,
  inviteEmail,
  setInviteEmail,
  invitePlan,
  setInvitePlan,
  inviteLoading,
  inviteResult,
  createInvite,
  updateUser,
}: {
  users: AdminUser[];
  loading: boolean;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  invitePlan: string;
  setInvitePlan: (v: string) => void;
  inviteLoading: boolean;
  inviteResult: string;
  createInvite: () => void;
  updateUser: (
    user: AdminUser,
    action: string,
    plan?: string
  ) => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">
          Users
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Manage trials, subscriptions and access.
        </p>
      </div>

      <InviteForm
        inviteEmail={inviteEmail}
        setInviteEmail={
          setInviteEmail
        }
        invitePlan={invitePlan}
        setInvitePlan={
          setInvitePlan
        }
        inviteLoading={
          inviteLoading
        }
        inviteResult={
          inviteResult
        }
        createInvite={
          createInvite
        }
      />

      {loading && (
        <p className="text-xs text-[#777]">
          Updating...
        </p>
      )}

      <div className="space-y-3">
        {users.map((user) => (
          <UserCard
            key={String(user.id)}
            user={user}
            updateUser={
              updateUser
            }
          />
        ))}

        {users.length === 0 && (
          <div className="rounded-xl border border-[#272727] bg-[#141414] p-8 text-center text-sm text-[#666]">
            No users found.
          </div>
        )}
      </div>
    </section>
  );
}

function UserCard({
  user,
  updateUser,
}: {
  user: AdminUser;
  updateUser: (
    user: AdminUser,
    action: string,
    plan?: string
  ) => void;
}) {
  const active = isUserActive(user);

  return (
    <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="break-all text-sm font-semibold">
              {user.email || "No email"}
            </p>

            {user.name && (
              <p className="mt-1 text-xs text-[#777]">
                {user.name}
              </p>
            )}

            <p
              className={`mt-2 text-xs font-medium capitalize ${getStatusClass(
                user
              )}`}
            >
              {getStatus(user)}
            </p>
          </div>

          <div className="rounded-lg border border-[#292929] bg-[#101010] px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <CreditCard
                size={14}
                className="text-[#00c98b]"
              />

              <span>
                Plan:{" "}
                <strong>
                  {user.plan || "Basic"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <DateBox
            label="Trial Start"
            value={user.trial_start}
          />

          <DateBox
            label="Trial Expiry"
            value={user.trial_end}
          />

          <DateBox
            label="Subscription Expiry"
            value={user.subscription_end}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[#252525] pt-3">
          <select
            defaultValue={
              user.plan || "Basic"
            }
            onChange={(event) =>
              updateUser(
                user,
                "upgrade",
                event.target.value
              )
            }
            className="rounded-lg border border-[#333] bg-[#101010] px-3 py-2 text-xs"
          >
            <option>Basic</option>
            <option>Premium</option>
            <option>Gold</option>
          </select>

          <button
            type="button"
            onClick={() =>
              updateUser(user, "trial")
            }
            className="rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs hover:bg-[#222]"
          >
            14-Day Trial
          </button>

          <button
            type="button"
            onClick={() =>
              updateUser(user, "renew")
            }
            className="rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs hover:bg-[#222]"
          >
            Renew
          </button>

          <button
            type="button"
            onClick={() =>
              updateUser(
                user,
                "upgrade",
                "Premium"
              )
            }
            className="rounded-lg bg-[#00c98b] px-3 py-2 text-xs font-semibold text-black hover:opacity-90"
          >
            Upgrade
          </button>

          {active ? (
            <>
              <button
                type="button"
                onClick={() =>
                  updateUser(
                    user,
                    "cancel"
                  )
                }
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
              >
                Cancel
              </button>

                            <button
                type="button"
                onClick={() =>
                  updateUser(
                    user,
                    "deactivate"
                  )
                }
                className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300 hover:bg-yellow-500/20"
              >
                Deactivate
              </button>
        )}
      </div>
    </div>
  );
}

function DateBox({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 10,
        padding: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#777",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#ddd",
        }}
      >
        {dateText(value)}
      </div>
    </div>
  );
}

function InviteForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("Basic");
  const [trialDays, setTrialDays] = useState("14");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createInvite() {
    if (!email.trim()) {
      setMessage("Enter an email.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await adminRequest("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: "create_invite",
          email: email.trim().toLowerCase(),
          plan,
          trial_days: Number(trialDays),
        }),
      });

      const token = result.invite?.token;

      if (!token) {
        throw new Error("Invite was created but no token was returned.");
      }

      const link = `${window.location.origin}/invite-register/${token}`;

      await navigator.clipboard?.writeText(link);

      setMessage(`Invite created and copied: ${link}`);
      setEmail("");
      onCreated();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create invite."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: 14,
        }}
      >
        Create Invite
      </h3>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Customer email"
          type="email"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#0a0a0a",
            color: "#fff",
            border: "1px solid #333",
            borderRadius: 9,
            padding: "11px 12px",
          }}
        />

        <select
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
          style={{
            background: "#0a0a0a",
            color: "#fff",
            border: "1px solid #333",
            borderRadius: 9,
            padding: "11px 12px",
          }}
        >
          <option value="Basic">Basic</option>
          <option value="Premium">Premium</option>
          <option value="Gold">Gold</option>
        </select>

        <input
          value={trialDays}
          onChange={(event) => setTrialDays(event.target.value)}
          type="number"
          min="1"
          placeholder="Trial days"
          style={{
            background: "#0a0a0a",
            color: "#fff",
            border: "1px solid #333",
            borderRadius: 9,
            padding: "11px 12px",
          }}
        />

        <button
          type="button"
          onClick={createInvite}
          disabled={loading}
          style={{
            background: "#fff",
            color: "#000",
            border: 0,
            borderRadius: 9,
            padding: "11px 14px",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Creating..." : "Create Invite Link"}
        </button>

        {message && (
          <div
            style={{
              fontSize: 12,
              color: "#aaa",
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadsSection() {
  const [data, setData] = useState<{
    demand?: number;
    supply?: number;
    saas?: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const result = await adminRequest("/api/admin?section=leads");
      setData({
        demand: result.demand?.length ?? 0,
        supply: result.supply?.length ?? 0,
        saas: result.saas?.length ?? 0,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          color: "#aaa",
        }}
      >
        Loading leads...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      <InfoBox
        title="Demand Leads"
        value={String(data?.demand ?? 0)}
        icon={<Target size={18} />}
      />

      <InfoBox
        title="Supply Leads"
        value={String(data?.supply ?? 0)}
        icon={<Store size={18} />}
      />

      <InfoBox
        title="SaaS Leads"
        value={String(data?.saas ?? 0)}
        icon={<Users size={18} />}
      />

      <button
        type="button"
        onClick={load}
        style={{
          background: "#151515",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: 9,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          cursor: "pointer",
        }}
      >
        <RefreshCw size={15} />
        Refresh Leads
      </button>
    </div>
  );
}

function LinksSection() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const result = await adminRequest("/api/admin?section=invites");
      setInvites(result.invites ?? []);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          color: "#aaa",
        }}
      >
        Loading referral links...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      {invites.length === 0 ? (
        <div
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 12,
            padding: 16,
            color: "#888",
          }}
        >
          No invite links yet.
        </div>
      ) : (
        invites.map((invite) => (
          <div
            key={invite.id}
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 5,
              }}
            >
              {invite.email}
            </div>

            <div
              style={{
                color: "#999",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              Plan: {invite.plan || "Basic"} · Trial:{" "}
              {invite.trial_days ?? 14} days
            </div>

            <div
              style={{
                fontSize: 11,
                color: invite.used_at ? "#777" : "#aaa",
                wordBreak: "break-all",
              }}
            >
              {invite.used_at
                ? "Used"
                : `${window.location.origin}/invite-register/${invite.token}`}
            </div>
          </div>
        ))
      )}

      <button
        type="button"
        onClick={load}
        style={{
          background: "#151515",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: 9,
          padding: "10px 14px",
          cursor: "pointer",
        }}
      >
        Refresh Links
      </button>
    </div>
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
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <h3
        style={{
          marginTop: 0,
        }}
      >
        {title}
      </h3>

      <div
        style={{
          color: "#888",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
          }          >
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
}

function DateBox({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 10,
        padding: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#777",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#ddd",
        }}
      >
        {dateText(value)}
      </div>
    </div>
  );
}

function InviteForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("Basic");
  const [trialDays, setTrialDays] = useState("14");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createInvite() {
    if (!email.trim()) {
      setMessage("Enter an email.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await adminRequest("/api/admin", {
        method: "POST",
        body: JSON.stringify({
          action: "create_invite",
          email: email.trim().toLowerCase(),
          plan,
          trial_days: Number(trialDays),
        }),
      });

      const token = result.invite?.token;

      if (!token) {
        throw new Error("Invite was created but no token was returned.");
      }

      const link = `${window.location.origin}/invite-register/${token}`;

      await navigator.clipboard?.writeText(link);

      setMessage(`Invite created and copied: ${link}`);
      setEmail("");
      onCreated();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create invite."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: 14,
        }}
      >
        Create Invite
      </h3>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Customer email"
          type="email"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#0a0a0a",
            color: "#fff",
            border: "1px solid #333",
            borderRadius: 9,
            padding: "11px 12px",
          }}
        />

        <select
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
          style={{
            background: "#0a0a0a",
            color: "#fff",
            border: "1px solid #333",
            borderRadius: 9,
            padding: "11px 12px",
          }}
        >
          <option value="Basic">Basic</option>
          <option value="Premium">Premium</option>
          <option value="Gold">Gold</option>
        </select>

        <input
          value={trialDays}
          onChange={(event) => setTrialDays(event.target.value)}
          type="number"
          min="1"
          placeholder="Trial days"
          style={{
            background: "#0a0a0a",
            color: "#fff",
            border: "1px solid #333",
            borderRadius: 9,
            padding: "11px 12px",
          }}
        />

        <button
          type="button"
          onClick={createInvite}
          disabled={loading}
          style={{
            background: "#fff",
            color: "#000",
            border: 0,
            borderRadius: 9,
            padding: "11px 14px",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Creating..." : "Create Invite Link"}
        </button>

        {message && (
          <div
            style={{
              fontSize: 12,
              color: "#aaa",
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadsSection() {
  const [data, setData] = useState<{
    demand?: number;
    supply?: number;
    saas?: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const result = await adminRequest("/api/admin?section=leads");
      setData({
        demand: result.demand?.length ?? 0,
        supply: result.supply?.length ?? 0,
        saas: result.saas?.length ?? 0,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          color: "#aaa",
        }}
      >
        Loading leads...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      <InfoBox
        title="Demand Leads"
        value={String(data?.demand ?? 0)}
        icon={<Target size={18} />}
      />

      <InfoBox
        title="Supply Leads"
        value={String(data?.supply ?? 0)}
        icon={<Store size={18} />}
      />

      <InfoBox
        title="SaaS Leads"
        value={String(data?.saas ?? 0)}
        icon={<Users size={18} />}
      />

      <button
        type="button"
        onClick={load}
        style={{
          background: "#151515",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: 9,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          cursor: "pointer",
        }}
      >
        <RefreshCw size={15} />
        Refresh Leads
      </button>
    </div>
  );
}

function LinksSection() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const result = await adminRequest("/api/admin?section=invites");
      setInvites(result.invites ?? []);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          color: "#aaa",
        }}
      >
        Loading referral links...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      {invites.length === 0 ? (
        <div
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 12,
            padding: 16,
            color: "#888",
          }}
        >
          No invite links yet.
        </div>
      ) : (
        invites.map((invite) => (
          <div
            key={invite.id}
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 5,
              }}
            >
              {invite.email}
            </div>

            <div
              style={{
                color: "#999",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              Plan: {invite.plan || "Basic"} · Trial:{" "}
              {invite.trial_days ?? 14} days
            </div>

            <div
              style={{
                fontSize: 11,
                color: invite.used_at ? "#777" : "#aaa",
                wordBreak: "break-all",
              }}
            >
              {invite.used_at
                ? "Used"
                : `${window.location.origin}/invite-register/${invite.token}`}
            </div>
          </div>
        ))
      )}

      <button
        type="button"
        onClick={load}
        style={{
          background: "#151515",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: 9,
          padding: "10px 14px",
          cursor: "pointer",
        }}
      >
        Refresh Links
      </button>
    </div>
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
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <h3
        style={{
          marginTop: 0,
        }}
      >
        {title}
      </h3>

      <div
        style={{
          color: "#888",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
                }
      
