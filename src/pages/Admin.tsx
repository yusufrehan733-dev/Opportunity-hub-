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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AdminSection =
  | "overview"
  | "users"
  | "leads"
  | "referrals"
  | "resellers"
  | "links";

type AdminUser = {
  id: number;
  email: string;
  invite_code: string;
  plan: string;
  is_active: boolean;
  created_at: string;
};

type AdminLead = {
  id: string;
  type: string;
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

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "Admin request failed.");
  }

  return result;
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
    setOverview(result.overview);
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

      if (activeSection === "users") {
        await loadUsers();
      }

      if (activeSection === "leads") {
        await loadLeads();
      }

      if (activeSection === "links") {
        await loadUsers();
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

  const handleRefresh = async () => {
    await loadData();
  };

  const createInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      setInviteResult("Enter an email address.");
      return;
    }

    setInviteLoading(true);
    setInviteResult("");

    try {
      const result = await adminRequest("create_invite", {
        method: "POST",
        body: {
          email,
          plan: invitePlan,
        },
      });

      const code = result.user?.invite_code;

      setInviteEmail("");
      setInviteResult(
        code
          ? `Invite created: ${code}`
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
    plan: string,
    isActive: boolean
  ) => {
    setLoading(true);
    setError("");

    try {
      await adminRequest("set_user", {
        method: "POST",
        body: {
          id: user.id,
          plan,
          is_active: isActive,
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Admin Panel
                </h1>

                <p className="text-sm text-muted-foreground">
                  Opportunity Hub administration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">
                {loading ? "Refreshing..." : "Refresh"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4">
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
                    "flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary text-muted-foreground",
                  ].join(" ")}
                >
                  <Icon size={16} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
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
          <AdminPlaceholder
            title="Referrals"
            description="Referral tracking will be connected after the core admin controls."
          />
        )}

        {activeSection === "resellers" && (
          <AdminPlaceholder
            title="Resellers"
            description="Reseller commission tracking will be connected after the core admin controls."
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
    {
      label: "Users",
      value: data?.users ?? "—",
      description: "Allowed accounts",
      icon: Users,
    },
    {
      label: "Active Leads",
      value: data?.activeLeads ?? "—",
      description: "Fresh 72-hour leads",
      icon: Target,
    },
    {
      label: "Active Users",
      value: data?.activeUsers ?? "—",
      description: "Currently enabled",
      icon: UserPlus,
    },
    {
      label: "Resellers",
      value: data?.resellers ?? "—",
      description: "Active reseller accounts",
      icon: Store,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Admin Dashboard
        </h2>

        <p className="mt-1 text-muted-foreground">
          Core Opportunity Hub controls.
        </p>

        {loading && (
          <p className="mt-2 text-sm text-muted-foreground">
            Loading...
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-card border rounded-xl p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {card.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {card.value}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-secondary">
                  <Icon size={20} />
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex gap-3">
          <ShieldCheck size={22} className="shrink-0" />

          <div>
            <h3 className="font-semibold">
              Server-protected admin
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Admin actions are authorized by the Vercel API
              using the authenticated Supabase account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersSection({
  users,
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
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  invitePlan: string;
  setInvitePlan: (value: string) => void;
  inviteLoading: boolean;
  inviteResult: string;
  createInvite: () => void;
  updateUser: (
    user: AdminUser,
    plan: string,
    isActive: boolean
  ) => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Users</h2>

        <p className="mt-1 text-muted-foreground">
          Manage invites, plans and account access.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">
          Create customer invite
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={inviteEmail}
            onChange={(event) =>
              setInviteEmail(event.target.value)
            }
            placeholder="customer@email.com"
            type="email"
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          />

          <select
            value={invitePlan}
            onChange={(event) =>
              setInvitePlan(event.target.value)
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option>Basic</option>
            <option>Premium</option>
            <option>Gold</option>
          </select>

          <button
            type="button"
            onClick={createInvite}
            disabled={inviteLoading}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {inviteLoading
              ? "Creating..."
              : "Create Invite"}
          </button>
        </div>

        {inviteResult && (
          <p className="mt-3 text-sm">
            {inviteResult}
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/40">
              <tr>
                <th className="text-left p-3">
                  Email
                </th>
                <th className="text-left p-3">
                  Plan
                </th>
                <th className="text-left p-3">
                  Status
                </th>
                <th className="text-left p-3">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b last:border-0"
                >
                  <td className="p-3">
                    {user.email}
                  </td>

                  <td className="p-3">
                    <select
                      value={user.plan}
                      onChange={(event) =>
                        updateUser(
                          user,
                          event.target.value,
                          user.is_active
                        )
                      }
                      className="h-9 rounded-md border bg-background px-2"
                    >
                      <option>Basic</option>
                      <option>Premium</option>
                      <option>Gold</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <span
                      className={
                        user.is_active
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {user.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>

                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateUser(
                          user,
                          user.plan,
                          !user.is_active
                        )
                      }
                      className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      {user.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function LeadsSection({
  leads,
  loading,
}: {
  leads: AdminLead[];
  loading: boolean;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Leads</h2>

        <p className="mt-1 text-muted-foreground">
          Fresh Demand and Supply leads from the last 72
          hours.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Loading leads...
        </p>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/40">
              <tr>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Skill</th>
                <th className="text-left p-3">Country</th>
                <th className="text-left p-3">Source</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b last:border-0"
                >
                  <td className="p-3">
                    {lead.type || "Demand"}
                  </td>

                  <td className="p-3">
                    {lead.title ||
                      lead.client_name ||
                      "Opportunity"}
                  </td>

                  <td className="p-3">
                    {lead.skill_needed || "—"}
                  </td>

                  <td className="p-3">
                    {lead.country || "—"}
                  </td>

                  <td className="p-3">
                    {lead.source || "—"}
                  </td>
                </tr>
              ))}

              {leads.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No fresh leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function LinksSection({
  users,
  inviteEmail,
  setInviteEmail,
  invitePlan,
  setInvitePlan,
  inviteLoading,
  inviteResult,
  createInvite,
}: {
  users: AdminUser[];
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  invitePlan: string;
  setInvitePlan: (value: string) => void;
  inviteLoading: boolean;
  inviteResult: string;
  createInvite: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">
          Referral Links
        </h2>

        <p className="mt-1 text-muted-foreground">
          Create unique email-bound customer invites.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={inviteEmail}
            onChange={(event) =>
              setInviteEmail(event.target.value)
            }
            placeholder="customer@email.com"
            type="email"
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          />

          <select
            value={invitePlan}
            onChange={(event) =>
              setInvitePlan(event.target.value)
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          >
            <option>Basic</option>
            <option>Premium</option>
            <option>Gold</option>
          </select>

          <button
            type="button"
            onClick={createInvite}
            disabled={inviteLoading}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {inviteLoading
              ? "Creating..."
              : "Create Invite"}
          </button>
        </div>

        {inviteResult && (
          <p className="mt-3 text-sm">
            {inviteResult}
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/40">
              <tr>
                <th className="text-left p-3">
                  Email
                </th>
                <th className="text-left p-3">
                  Invite Code
                </th>
                <th className="text-left p-3">
                  Plan
                </th>
                <th className="text-left p-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b last:border-0"
                >
                  <td className="p-3">
                    {user.email}
                  </td>

                  <td className="p-3 font-mono text-xs">
                    {user.invite_code}
                  </td>

                  <td className="p-3">
                    {user.plan}
                  </td>

                  <td className="p-3">
                    {user.is_active
                      ? "Active"
                      : "Inactive"}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No referral links yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AdminPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>

        <p className="mt-1 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="bg-card border rounded-xl p-8 text-center">
        <p className="font-medium">
          {title} management
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          This section will be connected after the core
          admin controls.
        </p>
      </div>
    </section>
  );
}

Important: this frontend expects the "api/admin.ts" file from my previous step to exist. If you haven't saved that API file yet, save it first.

For now, only replace "src/pages/Admin.tsx". Don't touch the other pages.

After saving, tell me DONE. Then we'll do the fastest possible build check and fix only an actual error—no debugging loop.
