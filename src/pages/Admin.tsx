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
  id: string;
  name: string;
  email: string;
  plan: string;
  trial_start: string | null;
  trial_end: string | null;
  subscription_end: string | null;
  active: boolean;
  status?: string;
};

type AdminLead = {
  id: string;
  title?: string;
  client_name?: string;
  skill_needed?: string;
  country?: string;
  source?: string;
  created_at?: string;
  description?: string;
};

type Invite = {
  id: string;
  email: string;
  plan: string;
  token: string;
  used_at?: string | null;
};

type OverviewData = {
  users: number;
  activeUsers: number;
  demand: number;
  supply: number;
  saas: number;
  invites: number;
};

async function adminRequest(
  action: string,
  options: RequestInit = {}
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Admin session not found.");
  }

  const response = await fetch(`/api/admin?action=${action}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || "Admin request failed.");
  }

  return data;
}

function dateText(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

function getStatus(user: AdminUser) {
  if (user.status) {
    return user.status;
  }

  if (!user.active) {
    return "inactive";
  }

  const now = new Date();

  if (
    user.trial_end &&
    new Date(user.trial_end) > now
  ) {
    return "trial";
  }

  if (
    user.subscription_end &&
    new Date(user.subscription_end) > now
  ) {
    return "active";
  }

  return "expired";
}

function getStatusClass(status: string) {
  if (status === "active" || status === "trial") {
    return "text-[#00c98b]";
  }

  if (status === "expired") {
    return "text-yellow-400";
  }

  return "text-red-400";
}

export default function Admin() {
  const navigate = useNavigate();

  const [section, setSection] =
    useState<AdminSection>("overview");

  const [overview, setOverview] =
    useState<OverviewData | null>(null);

  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [leads, setLeads] =
    useState<AdminLead[]>([]);

  const [invites, setInvites] =
    useState<Invite[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      if (section === "overview") {
        const data = await adminRequest("overview");
        setOverview(data);
      }

      if (section === "users") {
        const data = await adminRequest("users");
        setUsers(data.users || []);
      }

      if (section === "leads") {
        const data = await adminRequest("leads");
        setLeads(data.leads || []);
      }

      if (section === "links") {
        const data = await adminRequest("invites");
        setInvites(data.invites || []);
      }
    } catch (err: any) {
      setError(
        err?.message || "Could not load admin data."
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
    try {
      setLoading(true);
      setError("");

      await adminRequest("set_user", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          action,
          plan,
        }),
      });

      await loadData();
    } catch (err: any) {
      setError(
        err?.message || "Could not update user."
      );
      setLoading(false);
    }
  }

  const sections = [
    {
      id: "overview" as AdminSection,
      label: "Overview",
      icon: Target,
    },
    {
      id: "users" as AdminSection,
      label: "Users",
      icon: Users,
    },
    {
      id: "leads" as AdminSection,
      label: "Leads",
      icon: Target,
    },
    {
      id: "referrals" as AdminSection,
      label: "Referrals",
      icon: UserPlus,
    },
    {
      id: "resellers" as AdminSection,
      label: "Resellers",
      icon: Store,
    },
    {
      id: "links" as AdminSection,
      label: "Referral Links",
      icon: Link2,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-[#aaa]"
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>

          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={18} />
            Admin
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-[#222]"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
          {sections.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-xs border ${
                  section === item.id
                    ? "bg-white text-black border-white"
                    : "bg-[#111] text-[#aaa] border-[#222]"
                }`}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-4 text-xs text-[#777]">
            Loading...
          </div>
        )}

        {section === "overview" && (
          <Overview overview={overview} />
        )}

        {section === "users" && (
          <UsersSection
            users={users}
            updateUser={updateUser}
          />
        )}

        {section === "leads" && (
          <LeadsSection leads={leads} />
        )}

        {section === "links" && (
          <LinksSection invites={invites} />
        )}

        {(section === "referrals" ||
          section === "resellers") && (
          <Placeholder section={section} />
        )}
      </div>
    </div>
  );
}
function Overview({
  overview,
}: {
  overview: OverviewData | null;
}) {
  const cards = [
    {
      label: "Total Users",
      value: overview?.users ?? 0,
      icon: Users,
    },
    {
      label: "Active Users",
      value: overview?.activeUsers ?? 0,
      icon: ShieldCheck,
    },
    {
      label: "Demand Leads",
      value: overview?.demand ?? 0,
      icon: Target,
    },
    {
      label: "Supply Leads",
      value: overview?.supply ?? 0,
      icon: Store,
    },
    {
      label: "SaaS Leads",
      value: overview?.saas ?? 0,
      icon: UserPlus,
    },
    {
      label: "Invites",
      value: overview?.invites ?? 0,
      icon: Link2,
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Admin Overview
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border border-[#222] bg-[#111] p-4"
            >
              <div className="flex items-center justify-between">
                <Icon
                  size={18}
                  className="text-[#aaa]"
                />

                <span className="text-xl font-bold">
                  {card.value}
                </span>
              </div>

              <p className="mt-2 text-xs text-[#777]">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsersSection({
  users,
  updateUser,
}: {
  users: AdminUser[];
  updateUser: (
    user: AdminUser,
    action: string,
    plan?: string
  ) => Promise<void>;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Users
      </h2>

      {users.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 text-sm text-[#777]">
          No users found.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const status = getStatus(user);

            return (
              <div
                key={user.id}
                className="rounded-xl border border-[#222] bg-[#111] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">
                      {user.name || "Unnamed User"}
                    </h3>

                    <p className="text-xs text-[#777] break-all">
                      {user.email || "No email linked"}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-semibold capitalize ${getStatusClass(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="rounded-lg bg-[#0a0a0a] p-2">
                    <span className="text-[#666]">
                      Plan
                    </span>

                    <div className="font-semibold mt-1">
                      {user.plan || "Basic"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#0a0a0a] p-2">
                    <span className="text-[#666]">
                      Trial End
                    </span>

                    <div className="font-semibold mt-1">
                      {dateText(user.trial_end)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#0a0a0a] p-2">
                    <span className="text-[#666]">
                      Subscription End
                    </span>

                    <div className="font-semibold mt-1">
                      {dateText(
                        user.subscription_end
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#0a0a0a] p-2">
                    <span className="text-[#666]">
                      Active
                    </span>

                    <div className="font-semibold mt-1">
                      {user.active ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-[#666] mb-2">
                    Plan
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        updateUser(
                          user,
                          "upgrade",
                          "Basic"
                        )
                      }
                      className="px-3 py-2 rounded-lg border border-[#333] bg-[#181818] text-xs"
                    >
                      Basic
                    </button>

                    <button
                      onClick={() =>
                        updateUser(
                          user,
                          "upgrade",
                          "Premium"
                        )
                      }
                      className="px-3 py-2 rounded-lg border border-[#333] bg-[#181818] text-xs"
                    >
                      Premium
                    </button>

                    <button
                      onClick={() =>
                        updateUser(
                          user,
                          "upgrade",
                          "Gold"
                        )
                      }
                      className="px-3 py-2 rounded-lg border border-[#333] bg-[#181818] text-xs"
                    >
                      Gold
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-[#666] mb-2">
                    Subscription
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        updateUser(user, "trial")
                      }
                      className="px-3 py-2 rounded-lg bg-[#181818] border border-[#333] text-xs"
                    >
                      Trial
                    </button>

                    <button
                      onClick={() =>
                        updateUser(user, "renew")
                      }
                      className="px-3 py-2 rounded-lg bg-[#181818] border border-[#333] text-xs"
                    >
                      Renew
                    </button>

                    <button
                      onClick={() =>
                        updateUser(user, "cancel")
                      }
                      className="px-3 py-2 rounded-lg bg-[#181818] border border-[#333] text-xs text-yellow-300"
                    >
                      Cancel
                    </button>

                    {user.active ? (
                      <button
                        onClick={() =>
                          updateUser(
                            user,
                            "deactivate"
                          )
                        }
                        className="px-3 py-2 rounded-lg bg-[#181818] border border-[#333] text-xs text-red-300"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          updateUser(
                            user,
                            "activate"
                          )
                        }
                        className="px-3 py-2 rounded-lg bg-[#181818] border border-[#333] text-xs text-[#00c98b]"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  }
function LeadsSection({
  leads,
}: {
  leads: AdminLead[];
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Leads
      </h2>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 text-sm text-[#777]">
          No leads found.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border border-[#222] bg-[#111] p-4"
            >
              <h3 className="text-sm font-semibold">
                {lead.title ||
                  lead.client_name ||
                  "Opportunity"}
              </h3>

              {lead.skill_needed && (
                <p className="mt-1 text-xs text-[#aaa]">
                  Skill: {lead.skill_needed}
                </p>
              )}

              {lead.description && (
                <p className="mt-2 text-xs text-[#888]">
                  {lead.description}
                </p>
              )}

              <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-[#666]">
                {lead.country && (
                  <span>
                    Country: {lead.country}
                  </span>
                )}

                {lead.source && (
                  <span>
                    Source: {lead.source}
                  </span>
                )}

                {lead.created_at && (
                  <span>
                    Created: {dateText(lead.created_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LinksSection({
  invites,
}: {
  invites: Invite[];
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Referral Links
      </h2>

      {invites.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 text-sm text-[#777]">
          No referral links found.
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="rounded-xl border border-[#222] bg-[#111] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {invite.email}
                  </p>

                  <p className="text-xs text-[#777] mt-1">
                    Plan: {invite.plan}
                  </p>
                </div>

                <span className="text-xs text-[#888]">
                  {invite.used_at
                    ? "Used"
                    : "Unused"}
                </span>
              </div>

              <div className="mt-3 rounded-lg bg-[#0a0a0a] p-3">
                <p className="text-[11px] text-[#555] mb-1">
                  Token
                </p>

                <p className="text-xs text-[#aaa] break-all">
                  {invite.token}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Placeholder({
  section,
}: {
  section: AdminSection;
}) {
  const title =
    section === "referrals"
      ? "Referrals"
      : "Resellers";

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        {title}
      </h2>

      <div className="rounded-xl border border-[#222] bg-[#111] p-5">
        <p className="text-sm text-[#888]">
          This section is connected and ready for
          the next launch phase.
        </p>
      </div>
    </div>
  );
          }

