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
        Authorization: `Bearer ${session.access_token}`,
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

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.error || "Admin request failed."
    );
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
  if (user.status) return user.status;

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

  if (!user.active) return "inactive";

  return "expired";
}

function getStatusClass(status: string) {
  if (
    status === "active" ||
    status === "trial"
  ) {
    return "text-[#00c98b]";
  }

  if (status === "expired") {
    return "text-yellow-400";
  }

  if (status === "inactive") {
    return "text-red-400";
  }

  return "text-[#aaa]";
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

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const data =
        await adminRequest("overview");

      setOverview({
        users: data.users ?? 0,
        activeUsers: data.activeUsers ?? 0,
        demand: data.demand ?? 0,
        supply: data.supply ?? 0,
        saas: data.saas ?? 0,
        invites: data.invites ?? 0,
      });

      if (Array.isArray(data.usersList)) {
        setUsers(data.usersList);
      }

      if (Array.isArray(data.leads)) {
        setLeads(data.leads);
      }

      if (Array.isArray(data.invitesList)) {
        setInvites(data.invitesList);
      }

      if (section === "users") {
        const userData =
          await adminRequest("users");

        if (Array.isArray(userData.users)) {
          setUsers(userData.users);
        }
      }

      if (section === "leads") {
        const leadData =
          await adminRequest("leads");

        if (Array.isArray(leadData.leads)) {
          setLeads(leadData.leads);
        }
      }

      if (section === "links") {
        const inviteData =
          await adminRequest("invites");

        if (Array.isArray(inviteData.invites)) {
          setInvites(inviteData.invites);
        }
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Could not load admin data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchRealLeads() {
    try {
      setFetchingLeads(true);
      setFetchResult("");
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

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Could not fetch real leads."
      );
    } finally {
      setFetchingLeads(false);
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
          "Could not update user."
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
      id: "subscription" as AdminSection,
      label: "Subscription",
      icon: CreditCard,
    },
    {
      id: "links" as AdminSection,
      label: "Referral Links",
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
                onClick={() => navigate("/dashboard")}
                className="p-2 rounded-lg border border-[#333] bg-[#111]"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <div className="text-lg font-semibold">
                  Admin Dashboard
                </div>

                <div className="text-xs text-[#777]">
                  Opportunity Hub administration
                </div>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#333] bg-[#111] text-xs disabled:opacity-50"
            >
              <RefreshCw
                size={14}
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
    <div className="rounded-xl border border-[#222] bg-[#111] p-5">
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <h2 className="text-lg font-semibold">
          {title}
        </h2>
      </div>

      <p className="text-sm text-[#777] mt-3">
        {text}
      </p>
    </div>
  );
   }
function UsersSection({
  users,
  updateUser,
  loading,
}: {
  users: AdminUser[];
  updateUser: (
    user: AdminUser,
    action: string,
    plan?: string
  ) => Promise<void>;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Users
          </h2>

          <p className="text-sm text-[#777] mt-1">
            Manage plans and account status.
          </p>
        </div>

        {loading && (
          <div className="text-xs text-[#777]">
            Updating...
          </div>
        )}
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 text-sm text-[#888]">
          No users found.
        </div>
      ) : (
        users.map((user) => {
          const status =
            getStatus(user);

          return (
            <div
              key={user.id}
              className="rounded-xl border border-[#222] bg-[#111] p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="font-semibold">
                    {user.name ||
                      "Unnamed User"}
                  </div>

                  <div className="text-xs text-[#777] mt-1">
                    {user.email}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-3 text-xs">
                    <span className="text-[#aaa]">
                      Plan:{" "}
                      <span className="text-white">
                        {user.plan ||
                          "Basic"}
                      </span>
                    </span>

                    <span
                      className={getStatusClass(
                        status
                      )}
                    >
                      Status: {status}
                    </span>
                  </div>

                  <div className="text-xs text-[#666] mt-2">
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

                <div className="flex flex-wrap gap-2">
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
                        "Basic"
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-[#1b1b1b] border border-[#333] text-xs"
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
          );
        })
      )}
    </div>
  );
}

function LeadsSection({
  leads,
  fetchRealLeads,
  fetchingLeads,
  fetchResult,
}: {
  leads: AdminLead[];
  fetchRealLeads: () => Promise<void>;
  fetchingLeads: boolean;
  fetchResult: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#222] bg-[#111] p-4">
        <div className="font-semibold">
          Real Lead Collection
        </div>

        <div className="text-xs text-[#777] mt-1">
          Fetch fresh Demand, Supply and SaaS
          leads from the real lead collector.
        </div>

        <button
          onClick={fetchRealLeads}
          disabled={fetchingLeads}
          className="mt-4 w-full rounded-lg bg-white text-black py-3 text-sm font-semibold disabled:opacity-50"
        >
          {fetchingLeads
            ? "Fetching Real Leads..."
            : "Fetch Real Leads"}
        </button>

        {fetchResult && (
          <div className="mt-3 rounded-lg border border-[#333] bg-[#0a0a0a] p-3 text-xs text-[#aaa]">
            {fetchResult}
          </div>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 text-sm text-[#888]">
          No leads found.
        </div>
      ) : (
        leads.map((lead) => (
          <div
            key={lead.id}
            className="rounded-xl border border-[#222] bg-[#111] p-4"
          >
            <div className="font-semibold">
              {lead.title ||
                lead.client_name ||
                "Untitled Lead"}
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
        ))
      )}
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

  const [inviteUrl, setInviteUrl] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  async function createInvite() {
    if (!email.trim()) return;

    try {
      setCreating(true);

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
        data.invite_url || ""
      );

      await reload();
    } catch (err: any) {
      alert(
        err?.message ||
          "Could not create invite."
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;

    await navigator.clipboard.writeText(
      inviteUrl
    );

    setCopied(true);

    setTimeout(
      () => setCopied(false),
      1500
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          Referral Links
        </h2>

        <p className="text-sm text-[#777] mt-1">
          Create unique invitation links for
          new users.
        </p>
      </div>

      <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-4">
        <div>
          <label className="text-xs text-[#888]">
            Email
          </label>

          <input
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="user@example.com"
            className="mt-2 w-full rounded-lg border border-[#333] bg-black px-3 py-3 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-[#888]">
            Plan
          </label>

          <select
            value={plan}
            onChange={(event) =>
              setPlan(event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-[#333] bg-black px-3 py-3 text-sm text-white outline-none"
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
              Generated link
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 break-all text-xs text-[#aaa]">
                {inviteUrl}
              </div>

              <button
                onClick={copyInvite}
                className="shrink-0 rounded-lg border border-[#333] bg-[#111] p-2"
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
        <div className="font-semibold">
          Existing Invites
        </div>

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
    
