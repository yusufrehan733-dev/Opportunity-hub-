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
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
          style={{
            background: "transparent",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <h1>My Skills</h1>

        <p
          style={{
            color: "#aaa",
          }}
        >
          Choose your skills and country.
          These preferences control which
          Demand, Supply and SaaS leads
          you see.
        </p>

        <div
          style={{
            background: "#151515",
            border: "1px solid #333",
            borderRadius: "10px",
            padding: "18px",
            marginTop: "20px",
          }}
        >
          <h2>
            My Skills ({mySkills.length})
          </h2>

          {mySkills.length === 0 ? (
            <p
              style={{
                color: "#aaa",
              }}
            >
              No skills selected yet.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {mySkills.map(
                (skill) => (
                  <div
                    key={skill.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#222",
                      border: "1px solid #444",
                      borderRadius: "8px",
                      padding:
                        "8px 10px",
                    }}
                  >
                    <span>
                      {skill.skill}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeSkill(
                          skill.id
                        )
                      }
                      style={{
                        background:
                          "transparent",
                        color: "#ff6b6b",
                        border: "none",
                        cursor:
                          "pointer",
                        fontSize:
                          "16px",
                      }}
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <p
            style={{
              color: "#aaa",
              marginTop: "12px",
            }}
          >
            Plan: {planName} · Skill limit:{" "}
            {Number.isFinite(skillLimit)
              ? skillLimit
              : "Unlimited"}
          </p>
        </div>

        <div
          style={{
            background: "#151515",
            border: "1px solid #333",
            borderRadius: "10px",
            padding: "18px",
            marginTop: "20px",
          }}
        >
          <h2>Your Country</h2>

          <select
            value={country}
            onChange={(e) =>
              setCountry(e.target.value)
            }
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "11px",
              background: "#111",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "8px",
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
            onClick={savePreferences}
            disabled={
              savingPreferences
            }
            style={{
              marginTop: "15px",
              padding: "11px 18px",
              background: "#00ffae",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              cursor:
                savingPreferences
                  ? "wait"
                  : "pointer",
              fontWeight: 600,
            }}
          >
            {savingPreferences
              ? "Saving..."
              : "Save Preferences"}
          </button>

          {preferencesMessage && (
            <p
              style={{
                marginTop: "12px",
                color: "#00ffae",
              }}
            >
              {preferencesMessage}
            </p>
          )}
        </div>
                {skillsError && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              background: "#2a1111",
              border: "1px solid #662222",
              borderRadius: "8px",
              color: "#ff8888",
            }}
          >
            Could not load the skill list:
            <br />
            {skillsError}
          </div>
        )}

        {loading ? (
          <div
            style={{
              marginTop: "25px",
              textAlign: "center",
            }}
          >
            <p>Loading skills...</p>
          </div>
        ) : (
          <>
            <div
              style={{
                background: "#151515",
                border: "1px solid #333",
                borderRadius: "10px",
                padding: "18px",
                marginTop: "20px",
              }}
            >
              <h2>Add Your Own Skill</h2>

              <p
                style={{
                  color: "#aaa",
                }}
              >
                If your skill is not listed,
                you can type it here.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  value={typedSkill}
                  onChange={(e) =>
                    setTypedSkill(
                      e.target.value
                    )
                  }
                  placeholder="Type a skill"
                  style={{
                    flex: "1 1 250px",
                    padding: "11px",
                    background: "#111",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                  }}
                />

                <button
                  type="button"
                  onClick={addTypedSkill}
                  style={{
                    padding:
                      "11px 18px",
                    background: "#00ffae",
                    color: "#000",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Add Skill
                </button>
              </div>

              {skillLimitReached && (
                <p
                  style={{
                    color: "#ffaa00",
                    marginTop: "12px",
                  }}
                >
                  You have reached your{" "}
                  {planName} skill limit.
                  Skill buttons remain
                  visible, but you must
                  remove a skill or upgrade
                  your plan before adding
                  another one.
                </p>
              )}
            </div>

            <div
              style={{
                background: "#151515",
                border: "1px solid #333",
                borderRadius: "10px",
                padding: "18px",
                marginTop: "20px",
              }}
            >
              <h2>Main Categories</h2>

              {mainCategories.length ===
              0 ? (
                <p
                  style={{
                    color: "#aaa",
                  }}
                >
                  No main categories found
                  in the skills table.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
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
                          borderRadius: "8px",
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
                          cursor: "pointer",
                        }}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {selectedMain && (
              <div
                style={{
                  background: "#151515",
                  border: "1px solid #333",
                  borderRadius: "10px",
                  padding: "18px",
                  marginTop: "20px",
                }}
              >
                <h2>
                  Categories in{" "}
                  {selectedMain}
                </h2>

                {categories.length ===
                0 ? (
                  <p
                    style={{
                      color: "#aaa",
                    }}
                  >
                    No categories found
                    for this selection.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
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
                            borderRadius:
                              "8px",
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
                          }}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedMain &&
              selectedCategory && (
                <div
                  style={{
                    background: "#151515",
                    border: "1px solid #333",
                    borderRadius: "10px",
                    padding: "18px",
                    marginTop: "20px",
                    marginBottom: "30px",
                  }}
                >
                  <h2>
                    Subcategories / Skills
                  </h2>

                  <p
                    style={{
                      color: "#aaa",
                    }}
                  >
                    Tap a skill to add it to
                    My Skills.
                  </p>

                  {subcategories.length ===
                  0 ? (
                    <p
                      style={{
                        color: "#aaa",
                      }}
                    >
                      No subcategories found
                      for this category.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      {subcategories.map(
                        (item) => (
                          <button
                            type="button"
                            key={item}
                            onClick={() =>
                              addSkill(item)
                            }
                            style={{
                              padding:
                                "11px 17px",
                              borderRadius:
                                "8px",
                              border:
                                "1px solid #444",
                              background:
                                "#151515",
                              color: "#fff",
                              cursor:
                                "pointer",
                            }}
                          >
                            + {item}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
  }
