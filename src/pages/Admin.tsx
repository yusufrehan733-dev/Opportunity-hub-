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
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type AdminSection =
  | "overview"
  | "users"
  | "leads"
  | "referrals"
  | "resellers"
  | "subscription"
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

type LeadStats = {
  found: number;
  accepted: number;
  inserted: number;
  duplicate: number;
  stale: number;
  wrongType: number;
  noContact: number;
  noSkillMatch: number;
  blocked: number;
  insertErrors: number;
};

type LeadFetchDiagnostics = {
  Demand: LeadStats;
  Supply: LeadStats;
  SaaS: LeadStats;
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

  const response = await fetch(
    `/api/admin?action=${action}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization:
          `Bearer ${session.access_token}`,
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Admin API returned ${response.status} instead of JSON.`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        "Admin request failed."
    );
  }

  return data;
}

function dateText(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function defaultLeadStats(): LeadStats {
  return {
    found: 0,
    accepted: 0,
    inserted: 0,
    duplicate: 0,
    stale: 0,
    wrongType: 0,
    noContact: 0,
    noSkillMatch: 0,
    blocked: 0,
    insertErrors: 0,
  };
}

export default function Admin() {
  const navigate = useNavigate();

  const [section, setSection] =
    useState<AdminSection>("overview");

  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [leads, setLeads] =
    useState<AdminLead[]>([]);

  const [invites, setInvites] =
    useState<Invite[]>([]);

  const [overview, setOverview] =
    useState<OverviewData>({
      users: 0,
      activeUsers: 0,
      demand: 0,
      supply: 0,
      saas: 0,
      invites: 0,
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [fetchingLeads, setFetchingLeads] =
    useState(false);

  const [fetchResult, setFetchResult] =
    useState("");

  const [fetchDiagnostics, setFetchDiagnostics] =
    useState<LeadFetchDiagnostics | null>(
      null
    );

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const data =
        await adminRequest("overview");

      setOverview({
        users: data.users ?? 0,
        activeUsers:
          data.activeUsers ?? 0,
        demand: data.demand ?? 0,
        supply: data.supply ?? 0,
        saas: data.saas ?? 0,
        invites: data.invites ?? 0,
      });

      if (
        Array.isArray(data.usersList)
      ) {
        setUsers(data.usersList);
      }

      if (
        Array.isArray(data.leads)
      ) {
        setLeads(data.leads);
      }

      if (
        Array.isArray(data.invitesList)
      ) {
        setInvites(data.invitesList);
      }

      if (section === "users") {
        const userData =
          await adminRequest("users");

        if (
          Array.isArray(userData.users)
        ) {
          setUsers(userData.users);
        }
      }

      if (section === "leads") {
        const leadData =
          await adminRequest("leads");

        if (
          Array.isArray(leadData.leads)
        ) {
          setLeads(leadData.leads);
        }
      }

      if (section === "links") {
        const inviteData =
          await adminRequest("invites");

        if (
          Array.isArray(
            inviteData.invites
          )
        ) {
          setInvites(
            inviteData.invites
          );
        }
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load admin data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchRealLeads() {
    try {
      setFetchingLeads(true);
      setFetchResult("");
      setFetchDiagnostics(null);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Admin session not found."
        );
      }

      const response = await fetch(
        "/api/fetch-leads",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      const text =
        await response.text();

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Lead collector returned ${response.status} instead of JSON.`
        );
      }

      if (
        !response.ok ||
        data?.success === false
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Real lead collection failed."
        );
      }

      setFetchResult(
        `Added ${data.totalInserted ?? 0} leads — Demand: ${
          data.results?.Demand?.inserted ?? 0
        }, Supply: ${
          data.results?.Supply?.inserted ?? 0
        }, SaaS: ${
          data.results?.SaaS?.inserted ?? 0
        }`
      );

      if (data.results) {
        setFetchDiagnostics({
          Demand:
            data.results.Demand ??
            defaultLeadStats(),

          Supply:
            data.results.Supply ??
            defaultLeadStats(),

          SaaS:
            data.results.SaaS ??
            defaultLeadStats(),
        });
      }

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Real lead collection failed."
      );
    } finally {
      setFetchingLeads(false);
    }
  }

  async function updateUser(
    user: AdminUser,
    action:
      | "renew"
      | "upgrade"
      | "cancel"
      | "deactivate"
      | "activate",
    plan?: string
  ) {
    try {
      setError("");

      await adminRequest(
        "set_user",
        {
          method: "POST",
          body: JSON.stringify({
            id: user.id,
            action,
            plan,
          }),
        }
      );

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to update user."
      );
    }
  }

  useEffect(() => {
    void loadData();
  }, [section]);

  const sections: {
    id: AdminSection;
    label: string;
    icon: any;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: ShieldCheck,
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
    },
    {
      id: "leads",
      label: "Leads",
      icon: Target,
    },
    {
      id: "referrals",
      label: "Referrals",
      icon: UserPlus,
    },
    {
      id: "resellers",
      label: "Resellers",
      icon: Store,
    },
    {
      id: "subscription",
      label: "Subscription",
      icon: CreditCard,
    },
    {
      id: "links",
      label: "Links",
      icon: Link2,
     },
  ];

  return (
  <div className="min-h-screen bg-black text-white">
    <div className="border-b border-[#222] bg-black">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                navigate("/dashboard")
              }
              className="p-2 rounded-lg border border-[#333] bg-[#111]"
            >
                <ArrowLeft size={17} />
              </button>

              <div>
                <h1 className="text-xl font-semibold">
                  Admin Dashboard
                </h1>

                <p className="text-xs text-[#666] mt-1">
                  Opportunity Hub administration.
                </p>
              </div>
            </div>

            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#333] bg-[#111] text-xs disabled:opacity-50"
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
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          {sections.map((item) => {
            const Icon = item.icon;
            const active =
              section === item.id;

            return (
              <button
                key={item.id}
                onClick={() =>
                  setSection(item.id)
                }
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-medium border ${
                  active
                    ? "bg-white text-black border-white"
                    : "bg-[#111] text-[#aaa] border-[#333]"
                }`}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-900 bg-[#160808] p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {section === "overview" && (
          <OverviewSection
            overview={overview}
            onRefresh={loadData}
          />
        )}

        {section === "users" && (
          <UsersSection
            users={users}
            updateUser={updateUser}
            loading={loading}
          />
        )}

        {section === "leads" && (
          <LeadsSection
            leads={leads}
            fetchRealLeads={fetchRealLeads}
            fetchingLeads={fetchingLeads}
            fetchResult={fetchResult}
            fetchDiagnostics={
              fetchDiagnostics
            }
          />
        )}

        {section === "referrals" && (
          <SimpleSection
            icon={UserPlus}
            title="Referrals"
            text="Referral activity and referral benefits."
          />
        )}

        {section === "resellers" && (
          <SimpleSection
            icon={Store}
            title="Resellers"
            text="Reseller status and commission information."
          />
        )}

        {section === "subscription" && (
          <SimpleSection
            icon={CreditCard}
            title="Subscription"
            text="Manage user subscription plans and status."
          />
        )}

        {section === "links" && (
          <LinksSection
            invites={invites}
            reload={loadData}
          />
        )}
      </div>
    </div>
  );
}

function OverviewSection({
  overview,
  onRefresh,
}: {
  overview: OverviewData;
  onRefresh: () => Promise<void>;
}) {
  const cards = [
    {
      label: "Total Users",
      value: overview.users,
      icon: Users,
    },
    {
      label: "Active Users",
      value: overview.activeUsers,
      icon: ShieldCheck,
    },
    {
      label: "Demand Leads",
      value: overview.demand,
      icon: Target,
    },
    {
      label: "Supply Leads",
      value: overview.supply,
      icon: Target,
    },
    {
      label: "SaaS Leads",
      value: overview.saas,
      icon: Store,
    },
    {
      label: "Invites",
      value: overview.invites,
      icon: Link2,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Overview
          </h2>

          <p className="text-sm text-[#777] mt-1">
            Current Opportunity Hub activity.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-2 rounded-lg border border-[#333] bg-[#111] text-xs"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border border-[#222] bg-[#111] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#777]">
                  {card.label}
                </div>

                <Icon
                  size={17}
                  className="text-[#888]"
                />
              </div>

              <div className="text-2xl font-semibold mt-3">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
        }

  ];
function UsersSection({
  users,
  updateUser,
  loading,
}: {
  users: AdminUser[];
  updateUser: (
    user: AdminUser,
    action:
      | "renew"
      | "upgrade"
      | "cancel"
      | "deactivate"
      | "activate",
    plan?: string
  ) => Promise<void>;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          Users
        </h2>

        <p className="text-sm text-[#777] mt-1">
          Manage user plans and account status.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 text-sm text-[#777]">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 text-sm text-[#777]">
          No users found.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-[#222] bg-[#111] p-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {user.name ||
                      "Unnamed User"}
                  </div>

                  <div className="text-xs text-[#777] mt-1 break-all">
                    {user.email}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2 py-1 rounded-md bg-black border border-[#333] text-xs text-[#aaa]">
                      Plan:{" "}
                      {user.plan || "—"}
                    </span>

                    <span
                      className={`px-2 py-1 rounded-md bg-black border border-[#333] text-xs ${
                        user.active
                          ? "text-[#00c98b]"
                          : "text-red-400"
                      }`}
                    >
                      {user.active
                        ? "Active"
                        : "Inactive"}
                    </span>

                    {user.status && (
                      <span className="px-2 py-1 rounded-md bg-black border border-[#333] text-xs text-[#aaa]">
                        Status:{" "}
                        {user.status}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#666] mt-3">
                    Trial:{" "}
                    {dateText(
                      user.trial_start
                    )}{" "}
                    →{" "}
                    {dateText(
                      user.trial_end
                    )}
                  </div>

                  <div className="text-xs text-[#666] mt-1">
                    Subscription ends:{" "}
                    {dateText(
                      user.subscription_end
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    onClick={() =>
                      updateUser(
                        user,
                        "renew"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-[#1b1b1b] border border-[#333] text-xs"
                  >
                    Renew
                  </button>

                  <button
                    onClick={() =>
                      updateUser(
                        user,
                        "upgrade",
                        "Premium"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-[#1b1b1b] border border-[#333] text-xs"
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
                    className="px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold"
                  >
                    Gold
                  </button>

                  <button
                    onClick={() =>
                      updateUser(
                        user,
                        "cancel"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-[#1b1b1b] border border-[#333] text-xs text-yellow-400"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() =>
                      updateUser(
                        user,
                        "deactivate"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-[#1b1b1b] border border-[#333] text-xs text-red-400"
                  >
                    Deactivate
                  </button>

                  <button
                    onClick={() =>
                      updateUser(
                        user,
                        "activate"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-[#1b1b1b] border border-[#333] text-xs text-[#00c98b]"
                  >
                    Activate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadsSection({
  leads,
  fetchRealLeads,
  fetchingLeads,
  fetchResult,
  fetchDiagnostics,
}: {
  leads: AdminLead[];
  fetchRealLeads: () => Promise<void>;
  fetchingLeads: boolean;
  fetchResult: string;
  fetchDiagnostics:
    | LeadFetchDiagnostics
    | null;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            Real Lead Collection
          </h2>

          <p className="text-sm text-[#777] mt-1">
            Fetch fresh Demand, Supply and SaaS leads from the real lead collector.
          </p>
        </div>

        <button
          onClick={fetchRealLeads}
          disabled={fetchingLeads}
          className="flex items-center justify-center gap-2 rounded-lg bg-white text-black px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              fetchingLeads
                ? "animate-spin"
                : ""
            }
          />

          {fetchingLeads
            ? "Fetching..."
            : "Fetch Real Leads"}
        </button>
      </div>

      {fetchResult && (
        <div className="rounded-xl border border-[#333] bg-[#111] p-4 text-sm text-[#ddd]">
          {fetchResult}
        </div>
      )}

      {fetchDiagnostics && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Collector Diagnostics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(
              [
                "Demand",
                "Supply",
                "SaaS",
              ] as const
            ).map((type) => {
              const stats =
                fetchDiagnostics[type];

              return (
                <div
                  key={type}
                  className="rounded-xl border border-[#222] bg-[#111] p-4"
                >
                  <div className="text-sm font-semibold mb-3">
                    {type}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="text-[#777]">
                      Found
                    </div>
                    <div className="text-right">
                      {stats.found}
                    </div>

                    <div className="text-[#777]">
                      Accepted
                    </div>
                    <div className="text-right">
                      {stats.accepted}
                    </div>

                    <div className="text-[#777]">
                      Inserted
                    </div>
                    <div className="text-right">
                      {stats.inserted}
                    </div>

                    <div className="text-[#777]">
                      Duplicate
                    </div>
                    <div className="text-right">
                      {stats.duplicate}
                    </div>

                    <div className="text-[#777]">
                      Stale
                    </div>
                    <div className="text-right">
                      {stats.stale}
                    </div>

                    <div className="text-[#777]">
                      Wrong Type
                    </div>
                    <div className="text-right">
                      {stats.wrongType}
                    </div>

                    <div className="text-[#777]">
                      No Contact
                    </div>
                    <div className="text-right">
                      {stats.noContact}
                    </div>

                    <div className="text-[#777]">
                      No Skill
                    </div>
                    <div className="text-right">
                      {stats.noSkillMatch}
                    </div>

                    <div className="text-[#777]">
                      Blocked
                    </div>
                    <div className="text-right">
                      {stats.blocked}
                    </div>

                    <div className="text-[#777]">
                      Insert Errors
                    </div>
                    <div className="text-right">
                      {stats.insertErrors}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        <div>
        <h3 className="text-sm font-semibold mb-3">
          Current Leads
        </h3>

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
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {lead.title ||
                        lead.client_name ||
                        "Untitled lead"}
                    </div>

                    <div className="text-xs text-[#888] mt-1">
                      {lead.skill_needed ||
                        "—"}{" "}
                      {lead.country
                        ? `· ${lead.country}`
                        : ""}
                    </div>

                    {lead.description && (
                      <div className="text-sm text-[#aaa] mt-3">
                        {lead.description}
                      </div>
                    )}

                    <div className="text-xs text-[#666] mt-3">
                      {lead.source ||
                        "Unknown source"}{" "}
                      ·{" "}
                      {dateText(
                        lead.created_at
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SimpleSection({
  icon: Icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg border border-[#333] bg-[#111]">
          <Icon
            size={18}
            className="text-[#aaa]"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold">
            {title}
          </h2>

          <p className="text-sm text-[#777] mt-1">
            {text}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#222] bg-[#111] p-5">
        <div className="text-sm text-[#aaa]">
          This section is available from the Admin dashboard.
        </div>
      </div>
    </div>
  );
}

function LinksSection({
  invites,
  reload,
}: {
  invites: Invite[];
  reload: () => Promise<void>;
}) {
  const [email, setEmail] =
    useState("");

  const [plan, setPlan] =
    useState("Basic");

  const [creating, setCreating] =
    useState(false);

  const [inviteUrl, setInviteUrl] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [error, setError] =
    useState("");

  async function createInvite() {
    try {
      setCreating(true);
      setError("");
      setInviteUrl("");
      setCopied(false);

      const data =
        await adminRequest(
          "create_invite",
          {
            method: "POST",
            body: JSON.stringify({
              email: email.trim(),
              plan,
            }),
          }
        );

      setInviteUrl(
        data.inviteUrl ||
          data.url ||
          ""
      );

      setEmail("");

      await reload();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to create referral link."
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "Could not copy the referral URL."
      );
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          Referral Links
        </h2>

        <p className="text-sm text-[#777] mt-1">
          Create valid invite and referral links.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-[#160808] p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-4">
        <div>
          <label className="block text-xs text-[#777] mb-2">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="user@example.com"
            className="w-full rounded-lg border border-[#333] bg-black px-3 py-3 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-[#777] mb-2">
            Plan
          </label>

          <select
            value={plan}
            onChange={(event) =>
              setPlan(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-[#333] bg-black px-3 py-3 text-sm text-white outline-none"
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
        </div>

        <button
          onClick={createInvite}
          disabled={
            creating ||
            !email.trim()
          }
          className="w-full rounded-lg bg-white text-black py-3 text-sm font-semibold disabled:opacity-50"
        >
          {creating
            ? "Creating..."
            : "Create Referral Link"}
        </button>

        {inviteUrl && (
          <div className="rounded-lg border border-[#333] bg-black p-3">
            <div className="text-xs text-[#777] mb-2">
              Referral URL
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 text-xs text-white break-all">
                {inviteUrl}
              </div>

              <button
                onClick={copyInvite}
                className="shrink-0 p-2 rounded-lg border border-[#333] bg-[#111]"
              >
                {copied ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#222] bg-[#111] p-4">
        <h3 className="text-sm font-semibold">
          Existing Referral Links
        </h3>

        <div className="mt-3 space-y-2">
          {invites.length === 0 ? (
            <div className="text-sm text-[#777]">
              No referral links found.
            </div>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-lg border border-[#222] bg-black p-3"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-sm">
                      {invite.email}
                    </div>

                    <div className="text-xs text-[#777] mt-1">
                      Plan:{" "}
                      {invite.plan}
                    </div>

                    <div className="text-xs text-[#666] mt-1 break-all">
                      Token:{" "}
                      {invite.token}
                    </div>
                  </div>

                  <div className="text-xs">
                    {invite.used_at ? (
                      <span className="text-[#777]">
                        Used{" "}
                        {dateText(
                          invite.used_at
                        )}
                      </span>
                    ) : (
                      <span className="text-[#00c98b]">
                        Available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
            }
