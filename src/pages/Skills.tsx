import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Skills() {
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [selectedMain, setSelectedMain] =
    useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [mySkills, setMySkills] = useState<any[]>([]);

  const [skillLimit, setSkillLimit] =
    useState<number>(2);
  const [planName, setPlanName] =
    useState("Basic");

  const [country, setCountry] = useState("");
  const [typedSkill, setTypedSkill] =
    useState("");

  const [savingPreferences, setSavingPreferences] =
    useState(false);
  const [preferencesMessage, setPreferencesMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);
  const [skillsError, setSkillsError] =
    useState("");

  const countries = [
    "Pakistan",
    "India",
    "Bangladesh",
    "United Kingdom",
    "United States",
    "Canada",
    "Australia",
    "United Arab Emirates",
    "Qatar",
    "Saudi Arabia",
    "Kuwait",
    "Oman",
    "Bahrain",
    "Sweden",
    "Norway",
    "Denmark",
    "Finland",
    "Iceland",
    "Germany",
    "France",
    "Netherlands",
    "Other",
  ];

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setSkillsError("");
    setPreferencesMessage("");

    await fetchSkills();

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setLoading(false);
      return;
    }

    const currentUser = authData.user;

    setUser(currentUser);

    await fetchUserSkills(currentUser.id);
    await fetchUserPlan(currentUser.id);
    await fetchUserCountry(currentUser.id);

    setLoading(false);
  }

  async function fetchSkills() {
    const { data, error } = await supabase
      .from("skills")
      .select(
        "id, name, category, subcategory"
      )
      .order("name", {
        ascending: true,
      })
      .order("category", {
        ascending: true,
      })
      .order("subcategory", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Skills error:",
        error
      );
      setSkillsError(error.message);
      setData([]);
      return;
    }

    setData(data || []);
  }

  async function fetchUserSkills(
    userId: string
  ) {
    const { data, error } = await supabase
      .from("user_skills")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "User skills error:",
        error
      );
      return;
    }

    setMySkills(data || []);
  }

  async function fetchUserCountry(
    userId: string
  ) {
    const { data, error } = await supabase
      .from("users")
      .select("country")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "User country error:",
        error
      );
      return;
    }

    setCountry(data?.country || "");
      }
    async function savePreferences() {
    if (!user) {
      alert("Please log in first.");
      return;
    }

    if (!country) {
      setPreferencesMessage(
        "Please select your country."
      );
      return;
    }

    if (mySkills.length === 0) {
      setPreferencesMessage(
        "Please select at least one skill."
      );
      return;
    }

    if (
      Number.isFinite(skillLimit) &&
      mySkills.length > skillLimit
    ) {
      setPreferencesMessage(
        `${planName} plan allows a maximum of ${skillLimit} skills.`
      );
      return;
    }

    setSavingPreferences(true);
    setPreferencesMessage("");

    const { error } = await supabase
      .from("users")
      .update({
        country: country.trim(),
      })
      .eq("id", user.id);

    setSavingPreferences(false);

    if (error) {
      console.error(
        "Save preferences error:",
        error
      );

      setPreferencesMessage(
        error.message
      );
      return;
    }

    setPreferencesMessage(
      "Preferences saved. Your Demand, Supply and SaaS leads will now use these preferences."
    );
  }

  async function fetchUserPlan(
    userId: string
  ) {
    const {
      data: subscription,
      error,
    } = await supabase
      .from("user_subscriptions")
      .select(
        "plan_id, skill_limit"
      )
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error || !subscription) {
      setPlanName("Basic");
      setSkillLimit(2);
      return;
    }

    const { data: plan } =
      await supabase
        .from("plans")
        .select("name")
        .eq(
          "id",
          subscription.plan_id
        )
        .maybeSingle();

    const name =
      plan?.name
        ?.toLowerCase() || "basic";

    if (name === "gold") {
      setPlanName("Gold");
      setSkillLimit(Infinity);
    } else if (
      name === "premium"
    ) {
      setPlanName("Premium");
      setSkillLimit(5);
    } else {
      setPlanName("Basic");
      setSkillLimit(2);
    }
  }

  async function addSkill(
    skill: string
  ) {
    if (!user) {
      alert("Please log in first.");
      return false;
    }

    const cleanSkill =
      skill.trim();

    if (!cleanSkill) {
      alert(
        "Please enter a skill."
      );
      return false;
    }

    const exists =
      mySkills.some(
        (item) =>
          String(
            item.skill || ""
          )
            .trim()
            .toLowerCase() ===
          cleanSkill.toLowerCase()
      );

    if (exists) {
      alert(
        "Skill already added."
      );
      return false;
    }

    if (
      Number.isFinite(skillLimit) &&
      mySkills.length >= skillLimit
    ) {
      alert(
        `${planName} plan allows a maximum of ${skillLimit} saved skills. Remove a skill or upgrade your plan to add this one.`
      );
      return false;
    }

    const { error } =
      await supabase
        .from("user_skills")
        .insert({
          user_id: user.id,
          skill: cleanSkill,
        });

    if (error) {
      alert(error.message);
      return false;
    }

    await fetchUserSkills(
      user.id
    );

    setPreferencesMessage("");

    return true;
  }

  async function addTypedSkill() {
    const cleanSkill =
      typedSkill.trim();

    if (!cleanSkill) {
      alert(
        "Please type a skill first."
      );
      return;
    }

    const added =
      await addSkill(cleanSkill);

    if (added) {
      setTypedSkill("");
    }
  }

  async function removeSkill(
    id: string
  ) {
    const { error } =
      await supabase
        .from("user_skills")
        .delete()
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setMySkills(
      (previous) =>
        previous.filter(
          (skill) =>
            skill.id !== id
        )
    );

    setPreferencesMessage("");
  }
    const mainCategories = [
    ...new Set(
      data
        .map(
          (item) => item.name
        )
        .filter(Boolean)
    ),
  ];

  const categories =
    selectedMain
      ? [
          ...new Set(
            data
              .filter(
                (item) =>
                  item.name ===
                  selectedMain
              )
              .map(
                (item) =>
                  item.category
              )
              .filter(Boolean)
          ),
        ]
      : [];

  const subcategories =
    selectedMain &&
    selectedCategory
      ? [
          ...new Set(
            data
              .filter(
                (item) =>
                  item.name ===
                    selectedMain &&
                  item.category ===
                    selectedCategory
              )
              .map(
                (item) =>
                  item.subcategory
              )
              .filter(Boolean)
          ),
        ]
      : [];

  const skillLimitReached =
    Number.isFinite(skillLimit) &&
    mySkills.length >=
      skillLimit;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
      }}
    >
      <div
        style={{
          background: "#111",
          borderBottom:
            "1px solid #2a2a2a",
          padding:
            "16px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems:
              "center",
            gap: 14,
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
                "#1d1d1d",
              color: "#fff",
              border:
                "1px solid #333",
              borderRadius: 8,
              padding: 9,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <h1
            style={{
              margin: 0,
            }}
          >
            My Skills
          </h1>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding:
            "30px 20px",
        }}
      >
        <section
          style={{
            marginBottom: 35,
          }}
        >
          <h2>
            My Preferences
          </h2>

          <p
            style={{
              color: "#999",
            }}
          >
            Select your skills
            and country. These
            preferences control
            the leads shown to
            you in Demand,
            Supply and SaaS.
          </p>

          <div
            style={{
              background:
                "#151515",
              border:
                "1px solid #2d2d2d",
              borderRadius: 10,
              padding: 18,
              marginTop: 18,
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Country
            </label>

            <select
              value={country}
              onChange={(event) => {
                setCountry(
                  event.target.value
                );
                setPreferencesMessage(
                  ""
                );
              }}
              style={{
                width: "100%",
                maxWidth: 500,
                padding: 12,
                background:
                  "#222",
                color: "#fff",
                border:
                  "1px solid #444",
                borderRadius: 8,
                boxSizing:
                  "border-box",
              }}
            >
              <option value="">
                Select your country
              </option>

              {countries.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={
                savePreferences
              }
              disabled={
                savingPreferences
              }
              style={{
                marginTop: 15,
                padding:
                  "12px 18px",
                borderRadius: 8,
                border:
                  "1px solid #00ffae",
                background:
                  "#00ffae",
                color: "#000",
                cursor:
                  savingPreferences
                    ? "wait"
                    : "pointer",
                fontWeight: 700,
              }}
            >
              {savingPreferences
                ? "Saving..."
                : "Save Preferences"}
            </button>

            {preferencesMessage && (
              <div
                style={{
                  marginTop: 12,
                  color:
                    preferencesMessage.includes(
                      "saved"
                    )
                      ? "#00ffae"
                      : "#ff9999",
                  lineHeight: 1.5,
                }}
              >
                {
                  preferencesMessage
                }
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            marginBottom: 40,
          }}
        >
          <h2>
            My Skills ({mySkills.length})
          </h2>

          <p
            style={{
              color: "#999",
            }}
          >
            Plan: {planName} ·
            Limit:{" "}
            {Number.isFinite(
              skillLimit
            )
              ? skillLimit
              : "Unlimited"}
          </p>

          {skillLimitReached && (
            <p
              style={{
                color: "#ffcc66",
                marginTop: 8,
              }}
            >
              You have reached
              your {planName} skill
              limit. You can still
              type a custom skill
              below, but it cannot
              be saved until you
              have an available
              skill slot.
            </p>
          )}

          {mySkills.length ===
          0 ? (
            <div
              style={{
                background:
                  "#151515",
                border:
                  "1px solid #2d2d2d",
                borderRadius: 10,
                padding: 18,
                color: "#999",
              }}
            >
              No skills
              selected yet.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap:
                  "wrap",
                gap: 10,
              }}
            >
              {mySkills.map(
                (skill) => (
                  <div
                    key={
                      skill.id
                    }
                    style={{
                      background:
                        "#222",
                      border:
                        "1px solid #444",
                      borderRadius: 8,
                      padding:
                        "9px 12px",
                    }}
                  >
                    {skill.skill}

                    <button
                      type="button"
                      onClick={() =>
                        removeSkill(
                          skill.id
                        )
                      }
                      style={{
                        marginLeft: 8,
                        background:
                          "transparent",
                        color:
                          "#aaa",
                        border:
                          "none",
                        cursor:
                          "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>
                {skillsError && (
          <div
            style={{
              background: "#211010",
              border:
                "1px solid #6b3030",
              color: "#ff9999",
              padding: 16,
              borderRadius: 10,
              marginBottom: 25,
            }}
          >
            <strong>
              Skills database error:
            </strong>
            <br />
            {skillsError}
          </div>
        )}

        {loading ? (
          <div
            style={{
              color: "#aaa",
            }}
          >
            Loading skill categories...
          </div>
        ) : (
          <>
            <section
              style={{
                marginBottom: 35,
              }}
            >
              <h2>
                Add Your Own Skill
              </h2>

              <p
                style={{
                  color: "#999",
                }}
              >
                Can't find your
                skill in the
                categories? Type
                it below.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  maxWidth: 650,
                }}
              >
                <input
                  type="text"
                  value={
                    typedSkill
                  }
                  onChange={(event) => {
                    setTypedSkill(
                      event.target.value
                    );
                    setPreferencesMessage(
                      ""
                    );
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();
                      addTypedSkill();
                    }
                  }}
                  placeholder="Type your skill"
                  style={{
                    flex:
                      "1 1 300px",
                    padding: 12,
                    background:
                      "#222",
                    color: "#fff",
                    border:
                      "1px solid #444",
                    borderRadius: 8,
                    boxSizing:
                      "border-box",
                  }}
                />

                <button
                  type="button"
                  onClick={
                    addTypedSkill
                  }
                  style={{
                    padding:
                      "12px 18px",
                    borderRadius: 8,
                    border:
                      "1px solid #00ffae",
                    background:
                      "#00ffae",
                    color: "#000",
                    cursor:
                      "pointer",
                    fontWeight: 700,
                  }}
                >
                  Add Skill
                </button>
              </div>
            </section>

            <section
              style={{
                marginBottom: 35,
              }}
            >
              <h2>
                Main Categories
              </h2>

              <div
                style={{
                  display: "flex",
                  flexWrap:
                    "wrap",
                  gap: 10,
                }}
              >
                {mainCategories.map(
                  (item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => {
                        setSelectedMain(
                          item
                        );
                        setSelectedCategory(
                          null
                        );
                      }}
                      style={{
                        padding:
                          "11px 17px",
                        borderRadius: 8,
                        border:
                          "1px solid #444",
                        background:
                          selectedMain ===
                          item
                            ? "#00ffae"
                            : "#1a1a1a",
                        color:
                          selectedMain ===
                          item
                            ? "#000"
                            : "#fff",
                        cursor:
                          "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>

              {mainCategories.length ===
                0 &&
                !skillsError && (
                  <div
                    style={{
                      color: "#999",
                      marginTop: 15,
                    }}
                  >
                    No categories
                    returned from
                    the skills
                    table.
                  </div>
                )}
            </section>

            {selectedMain && (
              <section
                style={{
                  marginBottom: 35,
                }}
              >
                <h2>
                  Categories
                </h2>

                <div
                  style={{
                    display: "flex",
                    flexWrap:
                      "wrap",
                    gap: 10,
                  }}
                >
                  {categories.map(
                    (item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() =>
                          setSelectedCategory(
                            item
                          )
                        }
                        style={{
                          padding:
                            "11px 17px",
                          borderRadius: 8,
                          border:
                            "1px solid #444",
                          background:
                            selectedCategory ===
                            item
                              ? "#00ffae"
                              : "#1a1a1a",
                          color:
                            selectedCategory ===
                            item
                              ? "#000"
                              : "#fff",
                          cursor:
                            "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              </section>
            )}

            {selectedCategory && (
              <section>
                <h2>
                  Skills
                </h2>

                <div
                  style={{
                    display: "flex",
                    flexWrap:
                      "wrap",
                    gap: 10,
                  }}
                >
                  {subcategories.map(
                    (item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() =>
                          addSkill(
                            item
                          )
                        }
                        disabled={
                          skillLimitReached
                        }
                        style={{
                          padding:
                            "11px 17px",
                          borderRadius: 8,
                          border:
                            "1px solid #444",
                          background:
                            skillLimitReached
                              ? "#111"
                              : "#151515",
                          color:
                            skillLimitReached
                              ? "#555"
                              : "#fff",
                          cursor:
                            skillLimitReached
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        + {item}
                      </button>
                    )
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
 }
  
