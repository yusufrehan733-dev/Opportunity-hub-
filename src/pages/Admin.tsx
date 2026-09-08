import { useState } from "react";
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

type AdminSection =
  | "overview"
  | "users"
  | "leads"
  | "referrals"
  | "resellers"
  | "links";

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

export default function Admin() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] =
    useState<AdminSection>("overview");

  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);

    // Backend connection will be added next.
    // Keeping this action here gives us a single place
    // to refresh all admin data once the API is connected.
    await new Promise((resolve) => setTimeout(resolve, 400));

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
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

      {/* ADMIN NAVIGATION */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
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

      {/* BODY */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeSection === "overview" && (
          <Overview />
        )}

        {activeSection === "users" && (
          <AdminPlaceholder
            title="Users"
            description="View users, plans, subscription status, and account status."
          />
        )}

        {activeSection === "leads" && (
          <AdminPlaceholder
            title="Leads"
            description="Review Demand, Supply, and SaaS leads and deactivate bad leads."
          />
        )}

        {activeSection === "referrals" && (
          <AdminPlaceholder
            title="Referrals"
            description="Track referrers, referred users, and referral reward status."
          />
        )}

        {activeSection === "resellers" && (
          <AdminPlaceholder
            title="Resellers"
            description="Manage reseller status, customers, sales, commissions, and earnings."
          />
        )}

        {activeSection === "links" && (
          <AdminPlaceholder
            title="Referral Links"
            description="Generate and manage permanent referral links for customers."
          />
        )}
      </main>
    </div>
  );
}

function Overview() {
  const cards = [
    {
      label: "Users",
      value: "—",
      description: "Registered accounts",
      icon: Users,
    },
    {
      label: "Active Leads",
      value: "—",
      description: "Demand + Supply + SaaS",
      icon: Target,
    },
    {
      label: "Referrals",
      value: "—",
      description: "Tracked referrals",
      icon: UserPlus,
    },
    {
      label: "Resellers",
      value: "—",
      description: "Active reseller accounts",
      icon: Store,
    },
  ];

  return (
    <div className="space-y-6">
      {/* INTRO */}
      <div>
        <h2 className="text-2xl font-bold">
          Admin Dashboard
        </h2>

        <p className="mt-1 text-muted-foreground">
          Monitor the core Opportunity Hub system from one place.
        </p>
      </div>

      {/* STAT CARDS */}
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

      {/* ADMIN PRIORITIES */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="text-lg font-semibold">
          Admin Controls
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminControl
            title="Users"
            description="Accounts, plans and subscription status"
          />

          <AdminControl
            title="Leads"
            description="Demand, Supply and SaaS lead management"
          />

          <AdminControl
            title="Referrals"
            description="Referral activity and rewards"
          />

          <AdminControl
            title="Resellers"
            description="Customers, sales and commissions"
          />

          <AdminControl
            title="Referral Links"
            description="Create permanent customer referral links"
          />

          <AdminControl
            title="Lead Quality"
            description="Remove or deactivate poor-quality leads"
          />
        </div>
      </div>

      {/* SECURITY NOTE */}
      <div className="rounded-xl border p-5 bg-card">
        <div className="flex gap-3">
          <ShieldCheck
            size={22}
            className="shrink-0"
          />

          <div>
            <h3 className="font-semibold">
              Admin access
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Admin authorization will be verified on the
              server. The frontend will never be trusted to
              decide whether an account is an administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
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
        <h2 className="text-2xl font-bold">
          {title}
        </h2>

        <p className="mt-1 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="bg-card border rounded-xl p-8 text-center">
        <p className="font-medium">
          {title} management
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Backend data connection will be connected next.
        </p>
      </div>
    </section>
  );
}

function AdminControl({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-medium">
        {title}
      </h4>

      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
