import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  leadType: "Demand" | "Supply" | "SaaS";

  title?: string;
  name?: string;
  company?: string;

  description?: string;
  skill?: string;
  category?: string;
  subcategory?: string;

  country?: string;
  city?: string;

  budget?: string | number;
  currency?: string;
  salary?: string | number;

  contactName?: string;
  email?: string;
  phone?: string;
  contact?: string;

  source?: string;
  openUrl?: string;

  createdAt?: string;
};

const countries = [
  "USA",
  "Canada",
  "UK",
  "UAE",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Australia",
  "Norway",
  "Finland",
  "Pakistan",
  "India",
  "Bangladesh",
];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [typeFilter, setTypeFilter] =
    useState("All");

  const [countryFilter, setCountryFilter] =
    useState("All");

  const [skillFilter, setSkillFilter] =
    useState("All");

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(
        "/api/leads",
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        }
      );

      const result =
        await response.json();

      console.log(
        "Leads API response:",
        result
      );

      if (
        !response.ok ||
        !result?.success
      ) {
        const apiError =
          typeof result?.error ===
          "string"
            ? result.error
            : JSON.stringify(
                result?.error ||
                  result
              );

        throw new Error(
          apiError ||
            "Unable to load leads."
        );
      }

      const rows =
        Array.isArray(result.leads)
          ? result.leads
          : [];

      const mapped: Lead[] =
        rows.map((row: any) => ({
          id: String(row.id),

          leadType:
            row.type === "Supply"
              ? "Supply"
              : row.type === "SaaS"
              ? "SaaS"
              : "Demand",

          title:
            row.title ||
            row.name ||
            "Opportunity",

          name:
            row.name ||
            row.contact_name ||
            null,

          company:
            row.company_name ||
            row.company ||
            null,

          description:
            row.description || "",

          skill:
            row.skill ||
            row.required_skill ||
            "",

          category:
            row.category || "",

          subcategory:
            row.subcategory || "",

          country:
            row.country ||
            "Global",

          city:
            row.city || "",

          budget:
            row.budget || null,

          currency:
            row.currency || "",

          salary:
            row.salary_range ||
            null,

          contactName:
            row.contact_name ||
            null,

          email:
            row.contact_email ||
            null,

          phone:
            row.contact_phone ||
            null,

          contact:
            row.contact || null,

          source:
            row.source || "",

          openUrl:
            row.apply_url ||
            row.landing_url ||
            row.company_website ||
            row.source ||
            row.contact ||
            null,

          createdAt:
            row.created_at ||
            null,
        }));

      setLeads(mapped);
    } catch (error: any) {
      console.error(
        "Leads loading error:",
        error
      );

      setLeads([]);

      const message =
        typeof error?.message ===
        "string"
          ? error.message
          : JSON.stringify(error);

      setErrorMsg(
        message ||
          "Could not load leads. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const skillGroups = useMemo(() => {
    const groups: Record<
      string,
      Set<string>
    > = {};

    for (const lead of leads) {
      const skill =
        lead.skill?.trim();

      if (!skill) continue;

      const category =
        lead.category?.trim() ||
        "Other";

      if (!groups[category]) {
        groups[category] =
          new Set<string>();
      }

      groups[category].add(skill);
    }

    return Object.entries(groups)
      .map(
        ([category, skillsSet]) => ({
          category,
          skills:
            Array.from(
              skillsSet
            ).sort((a, b) =>
              a.localeCompare(b)
            ),
        })
      )
      .sort((a, b) =>
        a.category.localeCompare(
          b.category
        )
      );
  }, [leads]);

  const filteredLeads =
    useMemo(() => {
      return leads.filter(
        (lead) => {
          const typeMatches =
            typeFilter === "All" ||
            lead.leadType ===
              typeFilter;

          const countryMatches =
            countryFilter ===
              "All" ||
            lead.country ===
              countryFilter;

          const skillMatches =
            skillFilter === "All" ||
            lead.skill ===
              skillFilter;

          return (
            typeMatches &&
            countryMatches &&
            skillMatches
          );
        }
      );
    }, [
      leads,
      typeFilter,
      countryFilter,
      skillFilter,
    ]);

  function formatDate(
    value?: string
  ) {
    if (!value) return "";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleDateString();
  }

  function displayMoney(
    value:
      | string
      | number
      | null
      | undefined,
    currency?: string
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "";
    }

    return `${currency || ""} ${value}`.trim();
  }

  function callPhone(
    phone?: string
  ) {
    if (!phone) return;

    window.location.href =
      `tel:${phone}`;
  }

  function openWhatsApp(
    phone?: string
  ) {
    if (!phone) return;

    const cleaned =
      phone.replace(
        /[^\d+]/g,
        ""
      );

    window.open(
      `https://wa.me/${cleaned.replace(
        "+",
        ""
      )}`,
      "_blank"
    );
  }

  function sendEmail(
    email?: string
  ) {
    if (!email) return;

    window.location.href =
      `mailto:${email}`;
  }

  function openLink(
    url?: string
  ) {
    if (!url) return;

    const finalUrl =
      /^https?:\/\//i.test(url)
        ? url
        : `https://${url}`;

    window.open(
      finalUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }
  const tagStyle = {
    background: "#202020",
    border: "1px solid #333",
    color: "#ccc",
    padding: "5px 9px",
    borderRadius: 6,
    fontSize: 12,
  };

  const buttonStyle = {
    padding: "9px 13px",
    borderRadius: 7,
    border: "1px solid #444",
    background: "#222",
    color: "#fff",
    cursor: "pointer",
  };

  const selectStyle = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#181818",
    color: "#fff",
    fontSize: "15px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          <div>
            <h1
              style={{
                marginTop: 0,
                marginBottom: 6,
                fontSize: "28px",
              }}
            >
              Leads
            </h1>

            <p
              style={{
                color: "#999",
                marginTop: 0,
                marginBottom: 0,
              }}
            >
              Find real opportunities
              and contact them
              directly.
            </p>
          </div>

          <button
            onClick={loadLeads}
            disabled={loading}
            style={{
              padding:
                "9px 14px",
              borderRadius: 7,
              border:
                "1px solid #444",
              background:
                "#181818",
              color: "#fff",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              opacity: loading
                ? 0.6
                : 1,
            }}
          >
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>
        </div>

        {/* CATEGORY FILTER */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {[
            "All",
            "Demand",
            "Supply",
            "SaaS",
          ].map((type) => (
            <button
              key={type}
              onClick={() =>
                setTypeFilter(
                  type
                )
              }
              style={{
                padding:
                  "9px 16px",
                borderRadius: 8,
                border:
                  "1px solid #333",
                background:
                  typeFilter ===
                  type
                    ? "#00c98b"
                    : "#181818",
                color:
                  typeFilter ===
                  type
                    ? "#000"
                    : "#fff",
                cursor:
                  "pointer",
                fontWeight: 600,
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* FILTERS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {/* COUNTRY */}
          <select
            value={countryFilter}
            onChange={(e) =>
              setCountryFilter(
                e.target.value
              )
            }
            style={selectStyle}
          >
            <option value="All">
              All Countries
            </option>

            {countries.map(
              (country) => (
                <option
                  key={country}
                  value={country}
                >
                  {country}
                </option>
              )
            )}
          </select>

          {/* SKILL */}
          <select
            value={skillFilter}
            onChange={(e) =>
              setSkillFilter(
                e.target.value
              )
            }
            style={selectStyle}
          >
            <option value="All">
              All Skills
            </option>

            {skillGroups.map(
              (group) => (
                <optgroup
                  key={group.category}
                  label={
                    group.category
                  }
                >
                  {group.skills.map(
                    (skill) => (
                      <option
                        key={`${group.category}-${skill}`}
                        value={skill}
                      >
                        {skill}
                      </option>
                    )
                  )}
                </optgroup>
              )
            )}
          </select>
        </div>

        {/* STATUS */}
        {loading && (
          <div
            style={{
              padding: 18,
              border:
                "1px solid #292929",
              borderRadius: 10,
              background:
                "#121212",
              color: "#aaa",
              marginBottom: 18,
            }}
          >
            Loading Gold-quality
            leads...
          </div>
        )}

        {errorMsg && !loading && (
          <div
            style={{
              padding: 18,
              border:
                "1px solid #5a2525",
              borderRadius: 10,
              background:
                "#211111",
              color: "#ff9b9b",
              marginBottom: 18,
            }}
          >
            {errorMsg}
          </div>
        )}

        {!loading &&
          !errorMsg &&
          filteredLeads.length ===
            0 && (
            <div
              style={{
                padding: 24,
                border:
                  "1px solid #292929",
                borderRadius: 10,
                background:
                  "#121212",
                color: "#aaa",
                textAlign:
                  "center",
              }}
            >
              No Gold-quality
              leads match these
              filters.
            </div>
          )}

        {!loading &&
          !errorMsg && (
            <div
              style={{
                color: "#888",
                marginBottom: 14,
                fontSize: 14,
              }}
            >
              Showing{" "}
              {filteredLeads.length}{" "}
              Gold-quality leads
            </div>
          )}

        {/* LEADS */}
        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          {filteredLeads.map(
            (lead) => (
              <div
                key={lead.id}
                style={{
                  border:
                    "1px solid #292929",
                  borderRadius: 12,
                  background:
                    "#121212",
                  padding: 18,
                }}
              >
                {/* TOP */}
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: 12,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display:
                          "flex",
                        gap: 8,
                        alignItems:
                          "center",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "4px 8px",
                          borderRadius:
                            6,
                          background:
                            lead.leadType ===
                            "Demand"
                              ? "#182c24"
                              : lead.leadType ===
                                "Supply"
                              ? "#222438"
                              : "#30251a",
                          color:
                            "#fff",
                          fontSize:
                            12,
                          fontWeight:
                            700,
                        }}
                      >
                        {lead.leadType}
                      </span>

                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "4px 8px",
                          borderRadius:
                            6,
                          background:
                            "#183326",
                          color:
                            "#00c98b",
                          fontSize:
                            12,
                          fontWeight:
                            700,
                        }}
                      >
                        GOLD
                      </span>
                    </div>

                    <h2
                      style={{
                        margin:
                          "10px 0 5px",
                        fontSize:
                          "20px",
                        color:
                          "#fff",
                      }}
                    >
                      {lead.title ||
                        "Opportunity"}
                    </h2>

                    {lead.company &&
                      lead.leadType !==
                        "Supply" && (
                        <div
                          style={{
                            color:
                              "#bbb",
                            fontSize:
                              14,
                          }}
                        >
                          {lead.company}
                        </div>
                      )}
                  </div>

                  {lead.createdAt && (
                    <div
                      style={{
                        color:
                          "#777",
                        fontSize:
                          12,
                      }}
                    >
                      {formatDate(
                        lead.createdAt
                      )}
                    </div>
                  )}
                </div>

                {/* DETAILS */}
                <div
                  style={{
                    marginTop: 14,
                    display:
                      "flex",
                    gap: 8,
                    flexWrap:
                      "wrap",
                  }}
                >
                  {lead.country && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      🌍{" "}
                      {lead.country}
                    </span>
                  )}

                  {lead.city && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      📍{" "}
                      {lead.city}
                    </span>
                  )}

                  {lead.skill && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      🛠{" "}
                      {lead.skill}
                    </span>
                  )}

                  {lead.category && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      {lead.category}
                    </span>
                  )}

                  {lead.subcategory && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      {lead.subcategory}
                    </span>
                  )}
                </div>

                {/* NAME / COMPANY */}
                {(lead.name ||
                  lead.company) && (
                  <div
                    style={{
                      marginTop: 14,
                      color: "#ddd",
                    }}
                  >
                    <strong>
                      {lead.leadType ===
                      "Supply"
                        ? "Company:"
                        : "Name:"}
                    </strong>{" "}
                    {lead.name ||
                      lead.company}
                  </div>
                )}

                {/* DESCRIPTION */}
                {lead.description && (
                  <p
                    style={{
                      color: "#bbb",
                      lineHeight:
                        1.55,
                      marginBottom:
                        0,
                    }}
                  >
                    {lead.description}
                  </p>
                )}

                {/* MONEY */}
                {(lead.budget ||
                  lead.salary) && (
                  <div
                    style={{
                      marginTop: 12,
                      color:
                        "#00c98b",
                      fontWeight:
                        600,
                    }}
                  >
                    {lead.budget && (
                      <div>
                        Budget:{" "}
                        {displayMoney(
                          lead.budget,
                          lead.currency
                        )}
                      </div>
                    )}

                    {lead.salary && (
                      <div>
                        Salary:{" "}
                        {displayMoney(
                          lead.salary,
                          lead.currency
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* CONTACT */}
                {(lead.contactName ||
                  lead.email ||
                  lead.phone ||
                  lead.contact) && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop:
                        "1px solid #292929",
                    }}
                  >
                    {lead.contactName && (
                      <div
                        style={{
                          color:
                            "#ddd",
                          marginBottom:
                            8,
                        }}
                      >
                        Contact:{" "}
                        {
                          lead.contactName
                        }
                      </div>
                    )}

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
                        <>
                          <button
                            onClick={() =>
                              callPhone(
                                lead.phone
                              )
                            }
                            style={
                              buttonStyle
                            }
                          >
                            📞 Call
                          </button>

                          <button
                            onClick={() =>
                              openWhatsApp(
                                lead.phone
                              )
                            }
                            style={
                              buttonStyle
                            }
                          >
                            WhatsApp
                          </button>
                        </>
                      )}

                      {lead.email && (
                        <button
                          onClick={() =>
                            sendEmail(
                              lead.email
                            )
                          }
                          style={
                            buttonStyle
                          }
                        >
                          ✉ Email
                        </button>
                      )}

                      {lead.contact &&
                        !lead.email &&
                        !lead.phone && (
                          <button
                            onClick={() =>
                              openLink(
                                lead.contact
                              )
                            }
                            style={
                              buttonStyle
                            }
                          >
                            Contact
                          </button>
                        )}
                    </div>
                  </div>
                )}
             {filteredLeads.map(
            (lead) => (
              <div
                key={lead.id}
                style={{
                  border:
                    "1px solid #292929",
                  borderRadius: 12,
                  background:
                    "#121212",
                  padding: 18,
                }}
              >
                {/* TOP */}
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: 12,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display:
                          "flex",
                        gap: 8,
                        alignItems:
                          "center",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "4px 8px",
                          borderRadius:
                            6,
                          background:
                            lead.leadType ===
                            "Demand"
                              ? "#182c24"
                              : lead.leadType ===
                                "Supply"
                              ? "#222438"
                              : "#30251a",
                          color:
                            "#fff",
                          fontSize:
                            12,
                          fontWeight:
                            700,
                        }}
                      >
                        {lead.leadType}
                      </span>

                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "4px 8px",
                          borderRadius:
                            6,
                          background:
                            "#183326",
                          color:
                            "#00c98b",
                          fontSize:
                            12,
                          fontWeight:
                            700,
                        }}
                      >
                        GOLD
                      </span>
                    </div>

                    <h2
                      style={{
                        margin:
                          "10px 0 5px",
                        fontSize:
                          "20px",
                        color:
                          "#fff",
                      }}
                    >
                      {lead.title ||
                        "Opportunity"}
                    </h2>

                    {lead.company &&
                      lead.leadType !==
                        "Supply" && (
                        <div
                          style={{
                            color:
                              "#bbb",
                            fontSize:
                              14,
                          }}
                        >
                          {lead.company}
                        </div>
                      )}
                  </div>

                  {lead.createdAt && (
                    <div
                      style={{
                        color:
                          "#777",
                        fontSize:
                          12,
                      }}
                    >
                      {formatDate(
                        lead.createdAt
                      )}
                    </div>
                  )}
                </div>

                {/* DETAILS */}
                <div
                  style={{
                    marginTop: 14,
                    display:
                      "flex",
                    gap: 8,
                    flexWrap:
                      "wrap",
                  }}
                >
                  {lead.country && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      🌍{" "}
                      {lead.country}
                    </span>
                  )}

                  {lead.city && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      📍{" "}
                      {lead.city}
                    </span>
                  )}

                  {lead.skill && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      🛠{" "}
                      {lead.skill}
                    </span>
                  )}

                  {lead.category && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      {lead.category}
                    </span>
                  )}

                  {lead.subcategory && (
                    <span
                      style={
                        tagStyle
                      }
                    >
                      {lead.subcategory}
                    </span>
                  )}
                </div>

                {/* NAME / COMPANY */}
                {(lead.name ||
                  lead.company) && (
                  <div
                    style={{
                      marginTop: 14,
                      color: "#ddd",
                    }}
                  >
                    <strong>
                      {lead.leadType ===
                      "Supply"
                        ? "Company:"
                        : "Name:"}
                    </strong>{" "}
                    {lead.name ||
                      lead.company}
                  </div>
                )}

                {/* DESCRIPTION */}
                {lead.description && (
                  <p
                    style={{
                      color: "#bbb",
                      lineHeight:
                        1.55,
                      marginBottom:
                        0,
                    }}
                  >
                    {lead.description}
                  </p>
                )}

                {/* MONEY */}
                {(lead.budget ||
                  lead.salary) && (
                  <div
                    style={{
                      marginTop: 12,
                      color:
                        "#00c98b",
                      fontWeight:
                        600,
                    }}
                  >
                    {lead.budget && (
                      <div>
                        Budget:{" "}
                        {displayMoney(
                          lead.budget,
                          lead.currency
                        )}
                      </div>
                    )}

                    {lead.salary && (
                      <div>
                        Salary:{" "}
                        {displayMoney(
                          lead.salary,
                          lead.currency
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* CONTACT */}
                {(lead.contactName ||
                  lead.email ||
                  lead.phone ||
                  lead.contact) && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop:
                        "1px solid #292929",
                    }}
                  >
                    {lead.contactName && (
                      <div
                        style={{
                          color:
                            "#ddd",
                          marginBottom:
                            8,
                        }}
                      >
                        Contact:{" "}
                        {
                          lead.contactName
                        }
                      </div>
                    )}

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
                        <>
                          <button
                            onClick={() =>
                              callPhone(
                                lead.phone
                              )
                            }
                            style={
                              buttonStyle
                            }
                          >
                            📞 Call
                          </button>

                          <button
                            onClick={() =>
                              openWhatsApp(
                                lead.phone
                              )
                            }
                            style={
                              buttonStyle
                            }
                          >
                            WhatsApp
                          </button>
                        </>
                      )}

                      {lead.email && (
                        <button
                          onClick={() =>
                            sendEmail(
                              lead.email
                            )
                          }
                          style={
                            buttonStyle
                          }
                        >
                          ✉ Email
                        </button>
                      )}

                      {lead.contact &&
                        !lead.email &&
                        !lead.phone && (
                          <button
                            onClick={() =>
                              openLink(
                                lead.contact
                              )
                            }
                            style={
                              buttonStyle
                            }
                          >
                            Contact
                          </button>
                        )}
                    </div>
                  </div>
                )}
               {/* APPLY / SOURCE */}
                {(lead.openUrl ||
                  lead.source) && (
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {lead.openUrl && (
                      <button
                        onClick={() =>
                          openLink(
                            lead.openUrl
                          )
                        }
                        style={{
                          ...buttonStyle,
                          background:
                            "#fff",
                          color: "#000",
                          border:
                            "1px solid #fff",
                        }}
                      >
                        View / Apply
                      </button>
                    )}

                    {lead.source &&
                      lead.source !==
                        lead.openUrl && (
                        <button
                          onClick={() =>
                            openLink(
                              lead.source
                            )
                          }
                          style={
                            buttonStyle
                          }
                        >
                          Open Source
                        </button>
                      )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
} 
          
          
