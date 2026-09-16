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
  id: number | string;
  email: string;
  name?: string | null;
  invite_code?: string | null;
  plan: string;
  is_active: boolean;
  status?: string | null;
  subscription_status?: string | null;
  subscription_end?: string | null;
  subscription_app?: string | null;
  trial_start?: string | null;
  trial_end?: string | null;
  created_at?: string;
};

type AdminLead = {
  id: string;
  type: string | null;
  title: string | null;
  client_name: string | null;
  skill_needed: string | null;
  country: string | null;
  source: string | null;
  created_at: string;
  status: string | null;
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

const sections: {
  id: AdminSection;
  label: string;
  icon: typeof Users;
}[] = [
  { id: "overview", label: "Overview", icon: ShieldCheck },
  { id: "users", label: "Users", icon: Users },
  { id: "leads", label: "Leads", icon: Target },
  { id: "referrals", label: "Referrals", icon: UserPlus },
  { id: "resellers", label: "Resellers", icon: Store },
  { id: "links", label: "Referral Links", icon: Link2 },
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
    throw new Error(result.error || "Admin request failed.");
  }

  return result;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

function statusLabel(user: AdminUser) {
  return (
    user.status ||
    user.subscription_status ||
    (user.is_active ? "active" : "inactive")
  );
}

function statusClass(user: AdminUser) {
  const status = statusLabel(user).toLowerCase();

  if (status === "active") {
    return "text-[#00c98b]";
  }

  if (status === "trial") {
    return "text-yellow-400";
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

  const [activeSection, setActiveSection] =
    useState<AdminSection>("overview");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [overview, setOverview] =
    useState<OverviewData | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePlan, setInvitePlan] = useState("Basic");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState("");

  const loadOverview = async () => {
    const result = await adminRequest("overview");
    setOverview(result.overview || null);
  };

  const loadUsers = async () => {
    const result = await adminRequest("users");
    setUsers(result.users || []);
  };

  const loadLeads = async () => {
    const result = await adminRequest("leads");
    setLeads(result.leads || []);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      if (activeSection === "overview") {
        await loadOverview();
      }

      if (
        activeSection === "users" ||
        activeSection === "links"
      ) {
        await loadUsers();
      }

      if (activeSection === "leads") {
        await loadLeads();
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
  };

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const createInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      setInviteResult("Enter an email address.");
      return;
    }

    setInviteLoading(true);
    setInviteResult("");

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

      const code =
        result.user?.invite_code ||
        result.invite?.token;

      setInviteEmail("");

      setInviteResult(
        code
          ? `Invite created. Code: ${code}`
          : "Invite created successfully."
      );

      await loadUsers();
    } catch (err) {
      setInviteResult(
        err instanceof Error
          ? err.message
          : "Could not create invite."
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const updateUser = async (
    user: AdminUser,
    options: {
      action?: string;
      plan?: string;
      isActive?: boolean;
    }
  ) => {
    setLoading(true);
    setError("");

    try {
      await adminRequest("set_user", {
        method: "POST",
        body: {
          id: user.id,
          plan: options.plan || user.plan || "Basic",
          is_active:
            typeof options.isActive === "boolean"
              ? options.isActive
              : user.is_active,
          action: options.action || "",
        },
      });

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update user."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-[#272727] bg-[#111]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
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
                  loading ? "animate-spin" : ""
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
            {sections.map((section) => {
              const Icon = section.icon;
              const active =
                activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() =>
                    setActiveSection(section.id)
                  }
                  className={[
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium",
                    active
                      ? "bg-[#00c98b] text-black"
                      : "text-[#888] hover:bg-[#222] hover:text-white",
                  ].join(" ")}
                >
                  <Icon size={15} />
                  {section.label}
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

        {activeSection === "overview" && (
          <Overview
            data={overview}
            loading={loading}
          />
        )}

        {activeSection === "users" && (
          <UsersSection
            users={users}
            loading={loading}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            invitePlan={invitePlan}
            setInvitePlan={setInvitePlan}
            inviteLoading={inviteLoading}
            inviteResult={inviteResult}
            createInvite={createInvite}
            updateUser={updateUser}
          />
        )}

        {activeSection === "leads" && (
          <LeadsSection
            leads={leads}
            loading={loading}
          />
        )}

        {activeSection === "links" && (
          <LinksSection
            users={users}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            invitePlan={invitePlan}
            setInvitePlan={setInvitePlan}
            inviteLoading={inviteLoading}
            inviteResult={inviteResult}
            createInvite={createInvite}
          />
        )}

        {activeSection === "referrals" && (
          <Placeholder
            title="Referrals"
            description="Referral records can be viewed here. The core referral system remains separate from reseller commissions."
          />
        )}

        {activeSection === "resellers" && (
          <Placeholder
            title="Resellers"
            description="Reseller commission records can be connected here."
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
        {cards.map(([label, value, Icon]) => (
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
        ))}
      </div>

      <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
        <div className="flex gap-3">
          <ShieldCheck
            size={20}
            className="shrink-0 text-[#00c98b]"
          />

          <div>
            <h3 className="text-sm font-semibold">
              Protected Admin Access
            </h3>

            <p className="mt-1 text-xs leading-5 text-[#777]">
              Customer plans, trial periods and subscription
              access are controlled through the protected admin API.
            </p>
          </div>
        </div>
      </div>
    </section>
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
  setInviteEmail: (value: string) => void;
  invitePlan: string;
  setInvitePlan: (value: string) => void;
  inviteLoading: boolean;
  inviteResult: string;
  createInvite: () => void;
  updateUser: (
    user: AdminUser,
    options: {
      action?: string;
      plan?: string;
      isActive?: boolean;
    }
  ) => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">
          Users
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Manage customers, trials, plans and access.
        </p>
      </div>

      <InviteForm
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        invitePlan={invitePlan}
        setInvitePlan={setInvitePlan}
        inviteLoading={inviteLoading}
        inviteResult={inviteResult}
        createInvite={createInvite}
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
            updateUser={updateUser}
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
    options: {
      action?: string;
      plan?: string;
      isActive?: boolean;
    }
  ) => void;
}) {
  const status = statusLabel(user);

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

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-medium capitalize ${statusClass(
                  user
                )}`}
              >
                {status}
              </span>

              <span className="text-[#444]">•</span>

              <span className="text-xs text-[#aaa]">
                {user.plan || "Basic"}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-[#292929] bg-[#101010] px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <CreditCard
                size={14}
                className="text-[#00c98b]"
              />
              <span>
                Plan:{" "}
                <strong className="text-white">
                  {user.plan || "Basic"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <InfoBox
            label="Trial Start"
            value={formatDate(user.trial_start)}
          />

          <InfoBox
            label="Trial Expiry"
            value={formatDate(user.trial_end)}
          />

          <InfoBox
            label="Subscription Expiry"
            value={formatDate(
              user.subscription_end
            )}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[#252525] pt-3">
          <select
            defaultValue={user.plan || "Basic"}
            onChange={(event) =>
              updateUser(user, {
                plan: event.target.value,
                action: "upgrade",
              })
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
              updateUser(user, {
                action: "trial",
              })
            }
            className="rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs hover:bg-[#222]"
          >
            Start 14-Day Trial
          </button>

          <button
            type="button"
            onClick={() =>
              updateUser(user, {
                action: "renew",
              })
            }
            className="rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs hover:bg-[#222]"
          >
            Renew 30 Days
          </button>

          <button
            type="button"
            onClick={() =>
              updateUser(user, {
                action: "upgrade",
                plan: user.plan || "Premium",
                isActive: true,
              })
            }
            className="rounded-lg bg-[#00c98b] px-3 py-2 text-xs font-semibold text-black hover:opacity-90"
          >
            Upgrade / Activate
          </button>

          <button
            type="button"
            onClick={() =>
              updateUser(user, {
                action: "cancel",
                isActive: false,
              })
            }
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#252525] bg-[#101010] p-3">
      <div className="flex items-center gap-2">
        <CalendarDays
          size={13}
          className="text-[#666]"
        />
        <p className="text-[10px] uppercase tracking-wider text-[#666]">
          {label}
        </p>
      </div>

      <p className="mt-1 text-xs font-medium text-[#aaa]">
        {value}
      </p>
    </div>
  );
}

function InviteForm({
  inviteEmail,
  setInviteEmail,
  invitePlan,
  setInvitePlan,
  inviteLoading,
  inviteResult,
  createInvite,
}: {
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  invitePlan: string;
  setInvitePlan: (value: string) => void;
  inviteLoading: boolean;
  inviteResult: string;
  cimport { useEffect, useState } from "react";
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
  id: number | string;
  email: string;
  name?: string | null;
  invite_code?: string | null;
  plan: string;
  is_active: boolean;
  status?: string | null;
  subscription_status?: string | null;
  subscription_end?: string | null;
  subscription_app?: string | null;
  trial_start?: string | null;
  trial_end?: string | null;
  created_at?: string;
};

type AdminLead = {
  id: string;
  type: string | null;
  title: string | null;
  client_name: string | null;
  skill_needed: string | null;
  country: string | null;
  source: string | null;
  created_at: string;
  status: string | null;
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

const sections: {
  id: AdminSection;
  label: string;
  icon: typeof Users;
}[] = [
  { id: "overview", label: "Overview", icon: ShieldCheck },
  { id: "users", label: "Users", icon: Users },
  { id: "leads", label: "Leads", icon: Target },
  { id: "referrals", label: "Referrals", icon: UserPlus },
  { id: "resellers", label: "Resellers", icon: Store },
  { id: "links", label: "Referral Links", icon: Link2 },
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
    throw new Error(result.error || "Admin request failed.");
  }

  return result;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

function statusLabel(user: AdminUser) {
  return (
    user.status ||
    user.subscription_status ||
    (user.is_active ? "active" : "inactive")
  );
}

function statusClass(user: AdminUser) {
  const status = statusLabel(user).toLowerCase();

  if (status === "active") {
    return "text-[#00c98b]";
  }

  if (status === "trial") {
    return "text-yellow-400";
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

  const [activeSection, setActiveSection] =
    useState<AdminSection>("overview");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [overview, setOverview] =
    useState<OverviewData | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePlan, setInvitePlan] = useState("Basic");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState("");

  const loadOverview = async () => {
    const result = await adminRequest("overview");
    setOverview(result.overview || null);
  };

  const loadUsers = async () => {
    const result = await adminRequest("users");
    setUsers(result.users || []);
  };

  const loadLeads = async () => {
    const result = await adminRequest("leads");
    setLeads(result.leads || []);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      if (activeSection === "overview") {
        await loadOverview();
      }

      if (
        activeSection === "users" ||
        activeSection === "links"
      ) {
        await loadUsers();
      }

      if (activeSection === "leads") {
        await loadLeads();
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
  };

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const createInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      setInviteResult("Enter an email address.");
      return;
    }

    setInviteLoading(true);
    setInviteResult("");

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

      const code =
        result.user?.invite_code ||
        result.invite?.token;

      setInviteEmail("");

      setInviteResult(
        code
          ? `Invite created. Code: ${code}`
          : "Invite created successfully."
      );

      await loadUsers();
    } catch (err) {
      setInviteResult(
        err instanceof Error
          ? err.message
          : "Could not create invite."
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const updateUser = async (
    user: AdminUser,
    options: {
      action?: string;
      plan?: string;
      isActive?: boolean;
    }
  ) => {
    setLoading(true);
    setError("");

    try {
      await adminRequest("set_user", {
        method: "POST",
        body: {
          id: user.id,
          plan: options.plan || user.plan || "Basic",
          is_active:
            typeof options.isActive === "boolean"
              ? options.isActive
              : user.is_active,
          action: options.action || "",
        },
      });

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update user."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-[#272727] bg-[#111]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
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
                  loading ? "animate-spin" : ""
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
            {sections.map((section) => {
              const Icon = section.icon;
              const active =
                activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() =>
                    setActiveSection(section.id)
                  }
                  className={[
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium",
                    active
                      ? "bg-[#00c98b] text-black"
                      : "text-[#888] hover:bg-[#222] hover:text-white",
                  ].join(" ")}
                >
                  <Icon size={15} />
                  {section.label}
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

        {activeSection === "overview" && (
          <Overview
            data={overview}
            loading={loading}
          />
        )}

        {activeSection === "users" && (
          <UsersSection
            users={users}
            loading={loading}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            invitePlan={invitePlan}
            setInvitePlan={setInvitePlan}
            inviteLoading={inviteLoading}
            inviteResult={inviteResult}
            createInvite={createInvite}
            updateUser={updateUser}
          />
        )}

        {activeSection === "leads" && (
          <LeadsSection
            leads={leads}
            loading={loading}
          />
        )}

        {activeSection === "links" && (
          <LinksSection
            users={users}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            invitePlan={invitePlan}
            setInvitePlan={setInvitePlan}
            inviteLoading={inviteLoading}
            inviteResult={inviteResult}
            createInvite={createInvite}
          />
        )}

        {activeSection === "referrals" && (
          <Placeholder
            title="Referrals"
            description="Referral records can be viewed here. The core referral system remains separate from reseller commissions."
          />
        )}

        {activeSection === "resellers" && (
          <Placeholder
            title="Resellers"
            description="Reseller commission records can be connected here."
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
        {cards.map(([label, value, Icon]) => (
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
        ))}
      </div>

      <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
        <div className="flex gap-3">
          <ShieldCheck
            size={20}
            className="shrink-0 text-[#00c98b]"
          />

          <div>
            <h3 className="text-sm font-semibold">
              Protected Admin Access
            </h3>

            <p className="mt-1 text-xs leading-5 text-[#777]">
              Customer plans, trial periods and subscription
              access are controlled through the protected admin API.
            </p>
          </div>
        </div>
      </div>
    </section>
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
  setInviteEmail: (value: string) => void;
  invitePlan: string;
  setInvitePlan: (value: string) => void;
  inviteLoading: boolean;
  inviteResult: string;
  createInvite: () => void;
  updateUser: (
    user: AdminUser,
    options: {
      action?: string;
      plan?: string;
      isActive?: boolean;
    }
  ) => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">
          Users
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Manage customers, trials, plans and access.
        </p>
      </div>

      <InviteForm
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        invitePlan={invitePlan}
        setInvitePlan={setInvitePlan}
        inviteLoading={inviteLoading}
        inviteResult={inviteResult}
        createInvite={createInvite}
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
            updateUser={updateUser}
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
    options: {
      action?: string;
      plan?: string;
      isActive?: boolean;
    }
  ) => void;
}) {
  const status = statusLabel(user);

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

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-medium capitalize ${statusClass(
                  user
                )}`}
              >
                {status}
              </span>

              <span className="text-[#444]">•</span>

              <span className="text-xs text-[#aaa]">
                {user.plan || "Basic"}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-[#292929] bg-[#101010] px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <CreditCard
                size={14}
                className="text-[#00c98b]"
              />
              <span>
                Plan:{" "}
                <strong className="text-white">
                  {user.plan || "Basic"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <InfoBox
            label="Trial Start"
            value={formatDate(user.trial_start)}
          />

          <InfoBox
            label="Trial Expiry"
            value={formatDate(user.trial_end)}
          />

          <InfoBox
            label="Subscription Expiry"
            value={formatDate(
              user.subscription_end
            )}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[#252525] pt-3">
          <select
            defaultValue={user.plan || "Basic"}
            onChange={(event) =>
              updateUser(user, {
                plan: event.target.value,
                action: "upgrade",
              })
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
              updateUser(user, {
                action: "trial",
              })
            }
            className="rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs hover:bg-[#222]"
          >
            Start 14-Day Trial
          </button>

          <button
            type="button"
            onClick={() =>
              updateUser(user, {
                action: "renew",
              })
            }
            className="rounded-lg border border-[#333] bg-[#181818] px-3 py-2 text-xs hover:bg-[#222]"
          >
            Renew 30 Days
          </button>

          <button
            type="button"
            onClick={() =>
              updateUser(user, {
                action: "upgrade",
                plan: user.plan || "Premium",
                isActive: true,
              })
            }
            className="rounded-lg bg-[#00c98b] px-3 py-2 text-xs font-semibold text-black hover:opacity-90"
          >
            Upgrade / Activate
          </button>

          <button
            type="button"
            onClick={() =>
              updateUser(user, {
                action: "cancel",
                isActive: false,
              })
            }
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#252525] bg-[#101010] p-3">
      <div className="flex items-center gap-2">
        <CalendarDays
          size={13}
          className="text-[#666]"
        />
        <p className="text-[10px] uppercase tracking-wider text-[#666]">
          {label}
        </p>
      </div>

      <p className="mt-1 text-xs font-medium text-[#aaa]">
        {value}
      </p>
    </div>
  );
}

function InviteForm({
  inviteEmail,
  setInviteEmail,
  invitePlan,
  setInvitePlan,
  inviteLoading,
  inviteResult,
  createInvite,
}: {
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  invitePlan: string;
  setInvitePlan: (value: string) => void;
  inviteLoading: boolean;
  inviteResult: string;
  c
