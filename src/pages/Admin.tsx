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
import { supabase } from "../lib/supabase";

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
  invite_code: string | null;
  plan: string;
  is_active: boolean;
  created_at: string;
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
          ? `Invite created successfully. Code: ${code}`
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
                className={loading ? "animate-spin" : ""}
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
            description="Referral tracking is ready for connection to the referral records."
          />
        )}

        {activeSection === "resellers" && (
          <Placeholder
            title="Resellers"
            description="Reseller commission tracking is ready for connection to the reseller records."
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
    ["Users", data?.users ?? "—", "Allowed accounts", Users],
    [
      "Active Users",
      data?.activeUsers ?? "—",
      "Currently enabled",
      UserPlus,
    ],
    [
      "Active Leads",
      data?.activeLeads ?? "—",
      "Fresh opportunities",
      Target,
    ],
    [
      "Resellers",
      data?.resellers ?? "—",
      "Reseller accounts",
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
        {cards.map(([label, value, description, Icon]) => (
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

            <p className="mt-2 text-[11px] text-[#666]">
              {description}
            </p>
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
              Administrative requests are sent through the
              protected Vercel API using the authenticated
              Supabase session.
            </p>
          </div>
        </div>
      </div>
    </section>
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
        <h2 className="text-2xl font-semibold">
          Users
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Manage customer invites, plans and access.
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

      <div className="overflow-hidden rounded-xl border border-[#272727] bg-[#141414]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#272727] bg-[#101010]">
              <tr>
                <th className="p-3 text-left text-xs text-[#777]">
                  Email
                </th>
                <th className="p-3 text-left text-xs text-[#777]">
                  Plan
                </th>
                <th className="p-3 text-left text-xs text-[#777]">
                  Status
                </th>
                <th className="p-3 text-left text-xs text-[#777]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[#222] last:border-0"
                >
                  <td className="max-w-[220px] truncate p-3">
                    {user.email}
                  </td>

                  <td className="p-3">
                    <select
                      value={user.plan || "Basic"}
                      onChange={(event) =>
                        updateUser(
                          user,
                          event.target.value,
                          user.is_active
                        )
                      }
                      className="rounded-md border border-[#333] bg-[#101010] px-2 py-1.5 text-xs"
                    >
                      <option>Basic</option>
                      <option>Premium</option>
                      <option>Gold</option>
                    </select>
                  </td>

                  <td className="p-3 text-xs">
                    <span
                      className={
                        user.is_active
                          ? "text-[#00c98b]"
                          : "text-red-400"
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
                      className="rounded-md border border-[#333] px-3 py-1.5 text-xs hover:bg-[#222]"
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
                    className="p-8 text-center text-xs text-[#666]"
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
  createInvite: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#272727] bg-[#141414] p-4">
      <h3 className="text-sm font-semibold">
        Create Customer Invite
      </h3>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={inviteEmail}
          onChange={(event) =>
            setInviteEmail(event.target.value)
          }
          placeholder="customer@email.com"
          type="email"
          className="h-10 rounded-lg border border-[#333] bg-[#101010] px-3 text-sm outline-none focus:border-[#00c98b]"
        />

        <select
          value={invitePlan}
          onChange={(event) =>
            setInvitePlan(event.target.value)
          }
          className="h-10 rounded-lg border border-[#333] bg-[#101010] px-3 text-sm"
        >
          <option>Basic</option>
          <option>Premium</option>
          <option>Gold</option>
        </select>

        <button
          type="button"
          onClick={createInvite}
          disabled={inviteLoading}
          className="h-10 rounded-lg bg-[#00c98b] px-4 text-sm font-semibold text-black disabled:opacity-50"
        >
          {inviteLoading ? "Creating..." : "Create Invite"}
        </button>
      </div>

      {inviteResult && (
        <p className="mt-3 break-all text-xs text-[#aaa]">
          {inviteResult}
        </p>
      )}
    </div>
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
        <h2 className="text-2xl font-semibold">
          Leads
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Fresh opportunities available to the system.
        </p>
      </div>

      {loading && (
        <p className="text-xs text-[#777]">
          Loading leads...
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-[#272727] bg-[#141414]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#272727] bg-[#101010]">
              <tr>
                <th className="p-3 text-left text-xs text-[#777]">
                  Type
                </th>
                <th className="p-3 text-left text-xs text-[#777]">
                  Title
                </th>
                <th className="p-3 text-left text-xs text-[#777]">
                  Skill
                </th>
                <th className="p-3 text-left text-xs text-[#777]">
                  Country
                </th>
                <th className="p-3 text-left text-xs text-[#777]">
                  Source
                </th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-[#222] last:border-0"
                >
                  <td className="p-3 text-xs">
                    {lead.type || "Demand"}
                  </td>

                  <td className="max-w-[260px] truncate p-3 text-xs">
                    {lead.title ||
                      lead.client_name ||
                      "Opportunity"}
                  </td>

                  <td className="p-3 text-xs">
                    {lead.skill_needed || "—"}
                  </td>

                  <td className="p-3 text-xs">
                    {lead.country || "—"}
                  </td>

                  <td className="p-3 text-xs">
                    {lead.source || "—"}
                  </td>
                </tr>
              ))}

              {leads.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-xs text-[#666]"
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
        <h2 className="text-2xl font-semibold">
          Referral Links
        </h2>

        <p className="mt-1 text-sm text-[#777]">
          Customer invite codes currently available.
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

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border border-[#272727] bg-[#141414] p-4"
          >
            <p className="text-sm font-medium">
              {user.email}
            </p>

            <p className="mt-1 text-xs text-[#777]">
              Invite code:{" "}
              <span className="text-[#00c98b]">
                {user.invite_code || "Not assigned"}
              </span>
            </p>

            {user.invite_code && (
              <p className="mt-2 break-all text-[11px] text-[#666]">
                {window.location.origin}/register?ref=
                {user.invite_code}
              </p>
            )}
          </div>
        ))}

        {users.length === 0 && (
          <div className="rounded-xl border border-[#272727] bg-[#141414] p-8 text-center text-xs text-[#666]">
            No referral links found.
          </div>
        )}
      </div>
    </section>
  );
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-xl border border-[#272727] bg-[#141414] p-6">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#777]">
        {description}
      </p>
    </section>
  );
}
