import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

type Lead = {
  id: string;
  leadType:
    | "Demand"
    | "Supply"
    | "SaaS";

  title: string;
  name?: string;
  company?: string;

  description?: string;
  skill?: string;
  category?: string;
  subcategory?: string;

  country?: string;
  city?: string;

  budget?: string | number;
  salary?: string | number;
  currency?: string;

  email?: string;
  phone?: string;
  contact?: string;

  source?: string;
  openUrl?: string;
  createdAt?: string;
};

type LeadFilter =
  | "All"
  | "Demand"
  | "Supply"
  | "SaaS";

function normalizeCountry(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function skillMatches(
  preferredSkill: string,
  leadSkill: string
) {
  const preferred =
    preferredSkill
      .trim()
      .toLowerCase();

  const actual =
    leadSkill
      .trim()
      .toLowerCase();

  if (!preferred || !actual) {
    return false;
  }

  return (
    actual.includes(preferred) ||
    preferred.includes(actual)
  );
}

function formatDate(
  value: string
) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString();
}

function openLink(
  url: string
) {
  if (!url) return;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

function callPhone(
  phone: string
) {
  if (!phone) return;

  const cleaned =
    phone.replace(
      /[^\d+]/g,
      ""
    );

  if (!cleaned) return;

  window.open(
    `https://wa.me/${cleaned.replace(
      /^\+/,
      ""
    )}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function sendEmail(
  email: string
) {
  if (!email) return;

  window.location.href =
    `mailto:${email}`;
}

export default function Leads() {
  const navigate =
    useNavigate();

  const [leads, setLeads] =
    useState<Lead[]>([]);

  const [
    preferredCountry,
    setPreferredCountry,
  ] = useState("");

  const [
    preferredSkills,
    setPreferredSkills,
  ] = useState<string[]>(
    []
  );

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<LeadFilter>(
    "All"
  );

  const [loading, setLoading] =
    useState(true);

  const [
    preferencesLoading,
    setPreferencesLoading,
  ] = useState(true);

  const [errorMsg, setErrorMsg] =
    useState("");

  const [
    preferencesError,
    setPreferencesError,
  ] = useState("");

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      setLoading(true);
      setPreferencesLoading(
        true
      );
      setErrorMsg("");
      setPreferencesError("");

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          authError.message
        );
      }

      const user =
        authData.user;

      if (!user) {
        throw new Error(
          "Please log in before viewing your leads."
        );
      }

      const {
        data: userData,
        error: userError,
      } =
        await supabase
          .from("users")
          .select(
            "country, skill_preference"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (userError) {
        throw new Error(
          `Unable to load your preferences: ${userError.message}`
        );
      }

      const savedCountry =
        String(
          userData?.country || ""
        ).trim();
            const {
        data: skillRows,
        error: skillsError,
      } = await supabase
        .from("user_skills")
        .select("skill")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true,
        });

      if (skillsError) {
        throw new Error(
          `Unable to load your skills: ${skillsError.message}`
        );
      }

      const currentSkills =
        Array.isArray(skillRows)
          ? skillRows
              .map((row: any) =>
                String(
                  row?.skill || ""
                ).trim()
              )
              .filter(Boolean)
          : [];

      let oldSkills: string[] =
        [];

      const oldPreference =
        userData?.skill_preference;

      if (
        Array.isArray(
          oldPreference
        )
      ) {
        oldSkills =
          oldPreference
            .map(
              (skill: any) =>
                String(
                  skill || ""
                ).trim()
            )
            .filter(Boolean);
      } else if (
        typeof oldPreference ===
        "string"
      ) {
        const cleaned =
          oldPreference.trim();

        if (cleaned) {
          try {
            const parsed =
              JSON.parse(
                cleaned
              );

            if (
              Array.isArray(
                parsed
              )
            ) {
              oldSkills =
                parsed
                  .map(
                    (skill: any) =>
                      String(
                        skill || ""
                      ).trim()
                  )
                  .filter(Boolean);
            } else {
              oldSkills =
                cleaned
                  .split(",")
                  .map(
                    (skill) =>
                      skill.trim()
                  )
                  .filter(Boolean);
            }
          } catch {
            oldSkills =
              cleaned
                .split(",")
                .map(
                  (skill) =>
                    skill.trim()
                )
                .filter(Boolean);
          }
        }
      }

      const mergedSkills = [
        ...currentSkills,
        ...oldSkills,
      ].filter(
        (
          skill,
          index,
          array
        ) =>
          array.findIndex(
            (item) =>
              item
                .toLowerCase() ===
              skill
                .toLowerCase()
          ) === index
      );

      setPreferredCountry(
        savedCountry
      );

      setPreferredSkills(
        mergedSkills
      );

      console.log(
        "LEAD PREFERENCES:",
        {
          userId: user.id,
          country: savedCountry,
          currentSkills,
          oldSkills,
          mergedSkills,
        }
      );

      setPreferencesLoading(
        false
      );

      const response =
        await fetch(
          "/api/leads"
        );

      if (!response.ok) {
        throw new Error(
          `Unable to load leads (${response.status}).`
        );
      }

      const result =
        await response.json();

      const rows =
        Array.isArray(result)
          ? result
          : Array.isArray(
              result?.leads
            )
          ? result.leads
          : Array.isArray(
              result?.data
            )
          ? result.data
          : [];

      const mapped: Lead[] =
        rows.map(
          (row: any) => ({
            id: String(
              row.id || ""
            ),

            leadType:
              row.lead_type ||
              row.leadType ||
              "Demand",

            title:
              row.title ||
              row.name ||
              "Opportunity",

            name:
              row.contact_name ||
              row.name ||
              "",

            company:
              row.company ||
              row.company_name ||
              "",

            description:
              row.description ||
              row.content ||
              "",

            skill:
              row.skill ||
              "",

            category:
              row.category ||
              "",

            subcategory:
              row.subcategory ||
              "",

            country:
              row.country ||
              "",

            city:
              row.city ||
              "",

            budget:
              row.budget ??
              "",

            salary:
              row.salary ??
              "",

            currency:
              row.currency ||
              "",

            email:
              row.contact_email ||
              row.email ||
              "",

            phone:
              row.contact_phone ||
              row.phone ||
              "",

            contact:
              row.contact ||
              "",

            source:
              row.source ||
              "",

            openUrl:
              row.apply_url ||
              row.landing_url ||
              row.company_website ||
              "",

            createdAt:
              row.created_at ||
              "",
          })
        );

      setLeads(mapped);
          } catch (error: any) {
      console.error(
        "Leads page error:",
        error
      );

      const message =
        error?.message ||
        "Unable to load leads.";

      setErrorMsg(message);

      if (
        message
          .toLowerCase()
          .includes("preference") ||
        message
          .toLowerCase()
          .includes("country") ||
        message
          .toLowerCase()
          .includes("skill")
      ) {
        setPreferencesError(
          message
        );
      }

      setLeads([]);
    } finally {
      setLoading(false);
      setPreferencesLoading(
        false
      );
    }
  }

  const filteredLeads =
    useMemo(() => {
      if (!preferredCountry) {
        return [];
      }

      if (
        preferredSkills.length ===
        0
      ) {
        return [];
      }

      const selectedCountry =
        normalizeCountry(
          preferredCountry
        );

      return leads.filter(
        (lead) => {
          const typeMatch =
            typeFilter === "All" ||
            lead.leadType ===
              typeFilter;

          if (!typeMatch) {
            return false;
          }

          const leadCountry =
            normalizeCountry(
              lead.country || ""
            );

          if (
            leadCountry !==
            selectedCountry
          ) {
            return false;
          }

          return preferredSkills.some(
            (preferredSkill) =>
              skillMatches(
                preferredSkill,
                lead.skill || ""
              )
          );
        }
      );
    }, [
      leads,
      preferredCountry,
      preferredSkills,
      typeFilter,
    ]);

  const needsPreferences =
    !preferredCountry ||
    preferredSkills.length ===
      0;

  const buttonStyle: React.CSSProperties =
    {
      padding: "9px 13px",
      borderRadius: 7,
      border: "1px solid #444",
      background: "#222",
      color: "#fff",
      cursor: "pointer",
    };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
          style={{
            background:
              "transparent",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems:
              "center",
            gap: 6,
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <h1>Leads</h1>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 20,
            marginBottom: 20,
          }}
        >
          {(
            [
              "All",
              "Demand",
              "Supply",
              "SaaS",
            ] as LeadFilter[]
          ).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() =>
                setTypeFilter(
                  filter
                )
              }
              style={{
                padding:
                  "10px 16px",
                borderRadius: 8,
                border:
                  "1px solid #444",
                background:
                  typeFilter ===
                  filter
                    ? "#00ffae"
                    : "#1a1a1a",
                color:
                  typeFilter ===
                  filter
                    ? "#000"
                    : "#fff",
                cursor:
                  "pointer",
                fontWeight: 600,
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        <div
          style={{
            background: "#151515",
            border:
              "1px solid #333",
            borderRadius: 10,
            padding: 18,
            marginBottom: 20,
          }}
        >
          <h2>
            Your Lead Preferences
          </h2>

          {preferencesLoading ? (
            <p
              style={{
                color: "#aaa",
              }}
            >
              Loading your
              preferences...
            </p>
          ) : needsPreferences ? (
            <p
              style={{
                color: "#ffcc66",
              }}
            >
              Please select at least
              one skill and your
              country in My Skills,
              then save your
              preferences before
              viewing leads.
            </p>
          ) : (
            <div
              style={{
                color: "#aaa",
                lineHeight: 1.6,
              }}
            >
              <div>
                <strong>
                  Country:
                </strong>{" "}
                {preferredCountry}
              </div>

              <div>
                <strong>
                  Skills:
                </strong>{" "}
                {preferredSkills.join(
                  ", "
                )}
              </div>
            </div>
          )}

          {preferencesError && (
            <p
              style={{
                color: "#ff8888",
                marginTop: 10,
              }}
            >
              {preferencesError}
            </p>
          )}
        </div>
                {errorMsg && (
          <div
            style={{
              background: "#2a1111",
              border: "1px solid #662222",
              borderRadius: 10,
              padding: 15,
              marginBottom: 20,
              color: "#ff8888",
            }}
          >
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 30,
            }}
          >
            <p>Loading leads...</p>
          </div>
        ) : needsPreferences ? (
          <div
            style={{
              background: "#151515",
              border: "1px solid #333",
              borderRadius: 10,
              padding: 20,
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "#aaa",
              }}
            >
              Go to My Skills and save
              your country and at least
              one skill.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard/skills"
                )
              }
              style={{
                marginTop: 10,
                padding:
                  "10px 18px",
                borderRadius: 8,
                border: "none",
                background:
                  "#00ffae",
                color: "#000",
                cursor:
                  "pointer",
                fontWeight: 600,
              }}
            >
              Go to My Skills
            </button>
          </div>
        ) : filteredLeads.length ===
          0 ? (
          <div
            style={{
              background: "#151515",
              border: "1px solid #333",
              borderRadius: 10,
              padding: 20,
              textAlign: "center",
            }}
          >
            <h2>
              No matching leads
            </h2>

            <p
              style={{
                color: "#aaa",
                lineHeight: 1.5,
              }}
            >
              There are currently no{" "}
              {typeFilter === "All"
                ? ""
                : typeFilter.toLowerCase() +
                  " "}
              leads matching your
              selected country and
              skills.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 15,
            }}
          >
            {filteredLeads.map(
              (lead) => (
                <div
                  key={lead.id}
                  style={{
                    background:
                      "#151515",
                    border:
                      "1px solid #333",
                    borderRadius:
                      10,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: 10,
                      flexWrap:
                        "wrap",
                      marginBottom:
                        10,
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                      }}
                    >
                      {lead.title}
                    </h2>

                    <span
                      style={{
                        padding:
                          "4px 8px",
                        borderRadius:
                          6,
                        background:
                          "#333",
                        fontSize:
                          12,
                      }}
                    >
                      {lead.leadType}
                    </span>
                  </div>

                  {lead.company && (
                    <div
                      style={{
                        color:
                          "#ddd",
                        marginBottom:
                          6,
                      }}
                    >
                      <strong>
                        Company:
                      </strong>{" "}
                      {lead.company}
                    </div>
                  )}

                  {lead.name && (
                    <div
                      style={{
                        color:
                          "#ddd",
                        marginBottom:
                          6,
                      }}
                    >
                      <strong>
                        Contact:
                      </strong>{" "}
                      {lead.name}
                    </div>
                  )}

                  {lead.description && (
                    <div
                      style={{
                        color:
                          "#ccc",
                        lineHeight:
                          1.5,
                        marginBottom:
                          10,
                      }}
                    >
                      {
                        lead.description
                      }
                    </div>
                  )}

                  <div
                    style={{
                      display:
                        "grid",
                      gap: 5,
                      color:
                        "#bbb",
                      fontSize:
                        14,
                      marginBottom:
                        12,
                    }}
                  >
                    {lead.skill && (
                      <div>
                        <strong>
                          Skill:
                        </strong>{" "}
                        {lead.skill}
                      </div>
                    )}

                    {lead.category && (
                      <div>
                        <strong>
                          Category:
                        </strong>{" "}
                        {lead.category}
                      </div>
                    )}

                    {lead.subcategory && (
                      <div>
                        <strong>
                          Subcategory:
                        </strong>{" "}
                        {
                          lead.subcategory
                        }
                      </div>
                    )}

                    {lead.country && (
                      <div>
                        <strong>
                          Country:
                        </strong>{" "}
                        {lead.country}
                      </div>
                    )}

                    {lead.city && (
                      <div>
                        <strong>
                          City:
                        </strong>{" "}
                        {lead.city}
                      </div>
                    )}

                    {lead.budget !==
                      "" &&
                      lead.budget !==
                        undefined && (
                        <div>
                          <strong>
                            Budget:
                          </strong>{" "}
                          {lead.currency
                            ? `${lead.currency} `
                            : ""}
                          {String(
                            lead.budget
                          )}
                        </div>
                      )}

                    {lead.salary !==
                      "" &&
                      lead.salary !==
                        undefined && (
                        <div>
                          <strong>
                            Salary:
                          </strong>{" "}
                          {lead.currency
                            ? `${lead.currency} `
                            : ""}
                          {String(
                            lead.salary
                          )}
                        </div>
                      )}

                    {lead.createdAt && (
                      <div>
                        <strong>
                          Date:
                        </strong>{" "}
                        {formatDate(
                          lead.createdAt
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: 8,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    {lead.phone && (
                      <button
                        type="button"
                        onClick={() =>
                          callPhone(
                            lead.phone ||
                              ""
                          )
                        }
                        style={
                          buttonStyle
                        }
                      >
                        WhatsApp / Call
                      </button>
                    )}

                    {lead.email && (
                      <button
                        type="button"
                        onClick={() =>
                          sendEmail(
                            lead.email ||
                              ""
                          )
                        }
                        style={
                          buttonStyle
                        }
                      >
                        Email
                      </button>
                    )}

                    {lead.contact && (
                      <button
                        type="button"
                        onClick={() =>
                          openLink(
                            lead.contact ||
                              ""
                          )
                        }
                        style={
                          buttonStyle
                        }
                      >
                        Contact
                      </button>
                    )}

                    {lead.openUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          openLink(
                            lead.openUrl ||
                              ""
                          )
                        }
                        style={
                          buttonStyle
                        }
                      >
                        Open Opportunity
                      </button>
                    )}

                    {lead.source && (
                      <button
                        type="button"
                        onClick={() =>
                          openLink(
                            lead.source ||
                              ""
                          )
                        }
                        style={
                          buttonStyle
                        }
                      >
                        Source
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
            }
