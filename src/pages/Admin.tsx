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

  const [fetchingLeads, setFetchingLeads] =
    useState(false);

  const [fetchResult, setFetchResult] =
    useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      if (section === "overview") {
        const data =
          await adminRequest("overview");

        const result = data.overview || {};

        setOverview({
          users: result.users ?? 0,
          activeUsers:
            result.activeUsers ?? 0,
          demand:
            result.demandLeads ?? 0,
          supply:
            result.supplyLeads ?? 0,
          saas: 0,
          invites:
            result.referralLinks ?? 0,
        });
      }

      if (
        section === "users" ||
        section === "subscription"
      ) {
        const data =
          await adminRequest("users");

        setUsers(
          (data.users || []).map(
            (user: any) => ({
              ...user,
              active:
                user.is_active ?? false,
            })
          )
        );
      }

      if (section === "leads") {
        const data =
          await adminRequest("leads");

        setLeads(data.leads || []);
      }

      if (section === "links") {
        const data =
          await adminRequest("invites");

        setInvites(data.invites || []);
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
    setFetchingLeads(true);
    setFetchResult("");
    setError("");

    try {
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
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        data?.success === false
      ) {
        throw new Error(
          data?.error ||
            "Real lead collection failed."
        );
      }

      setFetchResult(
        `Added ${data.count ?? 0} leads — Demand: ${
          data.demand ?? 0
        }, Supply: ${
          data.supply ?? 0
        }, SaaS: ${
          data.saas ?? 0
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

      await adminRequest("set_user", {
        method: "POST",
        body: JSON.stringify({
          id: user.id,
          action,
          plan,
        }),
      });

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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto p-4">

        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() =>
              navigate("/dashboard")
            }
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
                onClick={() =>
                  setSection(item.id)
                }
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
          <Overview
            overview={overview}
          />
        )}

        {section === "users" && (
          <UsersSection
            users={users}
            updateUser={updateUser}
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

        {section === "subscription" && (
          <SubscriptionSection
            users={users}
            updateUser={updateUser}
          />
        )}

        {section === "links" && (
          <LinksSection
            invites={invites}
            reload={loadData}
          />
        )}

        {(section === "referrals" ||
          section === "resellers") && (
          <Placeholder
            section={section}
          />
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
    ["Users", overview?.users ?? 0],
    ["Active Users", overview?.activeUsers ?? 0],
    ["Demand Leads", overview?.demand ?? 0],
    ["Supply Leads", overview?.supply ?? 0],
    ["SaaS Leads", overview?.saas ?? 0],
    ["Invites", overview?.invites ?? 0],
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map(([label, value]) => (
        <div
          key={String(label)}
          className="rounded-xl border border-[#222] bg-[#111] p-4"
        >
          <div className="text-xs text-[#777]">
            {label}
          </div>

          <div className="mt-2 text-2xl font-bold">
            {value}
          </div>
        </div>
      ))}
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
    <div className="space-y-3">
      {users.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#111] p-5 text-sm text-[#888]">
          No users found.
        </div>
      ) : (
        users.map((user) => {
          const status = getStatus(user);

          return (
            <div
              key={user.id}
              className="rounded-xl border border-[#222] bg-[#111] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">
                    {user.name || "Unnamed User"}
                  </div>

                  <div className="text-xs text-[#777] break-all mt-1">
                    {user.email}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold">
                    {user.plan}
                  </div>

                  <div
                    className={`text-xs mt-1 ${getStatusClass(
                      status
                    )}`}
                  >
                    {status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-[#888]">
                <div>
                  Trial end:{" "}
                  <span className="text-white">
                    {dateText(user.trial_end)}
                  </span>
                </div>

                <div>
                  Subscription:{" "}
                  <span className="text-white">
                    {dateText(
                      user.subscription_end
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() =>
                    updateUser(user, "trial")
                  }
                  className="px-3 py-2 rounded-lg bg-[#1b1b1b] border border-[#333] text-xs"
                >
                  Trial
                </button>

                <button
                  onClick={() =>
                    updateUser(user, "renew")
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
                    updateUser(user, "cancel")
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
          );
        })
      )}
    </div>
  );
}

function SubscriptionSection({
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
    <UsersSection
      users={users}
      updateUser={updateUser}
    />
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
              {lead.skill_needed || "—"}{" "}
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
              {lead.source || "Unknown source"} ·{" "}
              {dateText(lead.created_at)}
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
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("Basic");
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

      const data = await adminRequest(
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
      <div className="rounded-xl border border-[#222] bg-[#111] p-4">
        <div className="font-semibold mb-4">
          Generate Invite
        </div>

        <input
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          placeholder="User email"
          className="w-full rounded-lg bg-[#0a0a0a] border border-[#333] px-3 py-3 text-sm outline-none"
        />

        <select
          value={plan}
          onChange={(e) =>
            setPlan(e.target.value)
          }
          className="w-full mt-3 rounded-lg bg-[#0a0a0a] border border-[#333] px-3 py-3 text-sm"
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
          onClick={createInvite}
          disabled={creating}
          className="mt-3 w-full rounded-lg bg-white text-black py-3 text-sm font-semibold disabled:opacity-50"
        >
          {creating
            ? "Creating..."
            : "Create Invite"}
        </button>

        {inviteUrl && (
          <div className="mt-4">
            <div className="text-xs text-[#777] mb-2">
              Invite link
            </div>

            <div className="flex gap-2">
              <input
                value={inviteUrl}
                readOnly
                className="min-w-0 flex-1 rounded-lg bg-[#0a0a0a] border border-[#333] px-3 py-3 text-xs"
              />

              <button
                onClick={copyInvite}
                className="px-3 rounded-lg border border-[#333]"
              >
                {copied ? (
                  <Check size={17} />
                ) : (
                  <Copy size={17} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
            <div className="rounded-xl border border-[#222] bg-[#111] p-4">
        <div className="font-semibold mb-3">
          Existing Invites
        </div>

        <div className="space-y-2">
          {invites.length === 0 ? (
            <div className="text-sm text-[#777]">
              No invites yet.
            </div>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-lg border border-[#222] p-3"
              >
                <div className="text-sm">
                  {invite.email}
                </div>

                <div className="text-xs text-[#777] mt-1">
                  {invite.plan} ·{" "}
                  {invite.used_at
                    ? "Used"
                    : "Unused"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Placeholder({
  section,
}: {
  section: "referrals" | "resellers";
}) {
  return (
    <div className="rounded-xl border border-[#222] bg-[#111] p-6 text-center">
      <div className="font-semibold">
        {section === "referrals"
          ? "Referrals"
          : "Resellers"}
      </div>

      <div className="text-sm text-[#777] mt-2">
        This section is ready for the
        existing referral/reseller data
        integration.
      </div>
    </div>
  );
  
}
