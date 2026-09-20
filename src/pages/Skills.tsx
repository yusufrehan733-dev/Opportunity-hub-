import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const countries = [
  "Pakistan",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "India",
  "Bangladesh",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
];

type SkillItem = {
  id?: string;
  skill: string;
};

const mainCategories = [
  "Quran",
  "Teaching",
  "Coaching",
  "Freelancing",
  "Business",
];

const categoryMap: Record<string, string[]> = {
  Quran: [
    "Quran Tafseer",
    "Tajweed",
    "Hifz",
    "Qirat",
    "Fiqh",
    "Arabic",
    "Islamic Studies",
  ],

  Teaching: [
    "Teaching Arabic",
    "English Teaching",
    "Math Teaching",
    "Science Teaching",
    "Online Tutor",
    "Primary Teaching",
  ],

  Coaching: [
    "Life Coaching",
    "Career Coaching",
    "Business Coaching",
    "Fitness Coaching",
    "Study Coaching",
  ],

  Freelancing: [
    "Virtual Assistant",
    "Data Entry",
    "Content Writing",
    "Graphic Design",
    "Web Development",
    "Social Media",
    "Customer Support",
  ],

  Business: [
    "Food Business",
    "Online Business",
    "Reselling",
    "Digital Products",
    "Small Business",
  ],
};

export default function Skills() {
  const [user, setUser] =
    useState<any>(null);

  const [mySkills, setMySkills] =
    useState<SkillItem[]>([]);

  const [country, setCountry] =
    useState("");

  const [planName, setPlanName] =
    useState("Basic");

  const [skillLimit, setSkillLimit] =
    useState(2);

  const [selectedMain, setSelectedMain] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [typedSkill, setTypedSkill] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [savingPreferences, setSavingPreferences] =
    useState(false);

  const [preferencesMessage, setPreferencesMessage] =
    useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);

    try {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!currentUser) {
        setUser(null);
        return;
      }

      setUser(currentUser);

      await Promise.all([
        loadUserProfile(currentUser.id),
        loadUserSkills(currentUser.id),
        loadUserPlan(currentUser.id),
      ]);
    } catch (error: any) {
      console.error(
        "Skills load error:",
        error
      );

      setPreferencesMessage(
        error?.message ||
          "Could not load your skills."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(
    userId: string
  ) {
    const { data, error } =
      await supabase
        .from("users")
        .select(
          "country, skill_preference"
        )
        .eq("id", userId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      setCountry(
        String(data.country || "")
      );

      if (
        data.skill_preference &&
        typeof data.skill_preference === "string"
      ) {
        const legacySkill =
          data.skill_preference.trim();

        if (legacySkill) {
          setMySkills((current) => {
            if (
              current.some(
                (item) =>
                  item.skill
                    .trim()
                    .toLowerCase() ===
                  legacySkill.toLowerCase()
              )
            ) {
              return current;
            }

            return [
              ...current,
              {
                skill: legacySkill,
              },
            ];
          });
        }
      }
    }
  }

  async function loadUserSkills(
    userId: string
  ) {
    const { data, error } =
      await supabase
        .from("user_skills")
        .select("id, skill")
        .eq("user_id", userId)
        .order("created_at", {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    setMySkills(
      (data || []).map((item: any) => ({
        id: String(item.id),
        skill: String(item.skill || ""),
      }))
    );
  }
    async function loadUserPlan(
    userId: string
  ) {
    const { data, error } =
      await supabase
        .from("user_subscriptions")
        .select("plan_id")
        .eq("user_id", userId)
        .limit(1);

    if (error) {
      console.error(
        "Plan load error:",
        error
      );
      return;
    }

    const planId = String(
      data?.[0]?.plan_id || "basic"
    ).toLowerCase();

    if (planId.includes("gold")) {
      setPlanName("Gold");
      setSkillLimit(Infinity);
      return;
    }

    if (planId.includes("premium")) {
      setPlanName("Premium");
      setSkillLimit(5);
      return;
    }

    setPlanName("Basic");
    setSkillLimit(2);
  }

  async function addSkill(
    skill: string
  ) {
    if (!user) {
      alert("Please log in first.");
      return;
    }

    const cleanSkill = skill.trim();

    if (!cleanSkill) {
      return;
    }

    const alreadySelected =
      mySkills.some(
        (item) =>
          item.skill
            .trim()
            .toLowerCase() ===
          cleanSkill.toLowerCase()
      );

    if (alreadySelected) {
      return;
    }

    if (
      Number.isFinite(skillLimit) &&
      mySkills.length >= skillLimit
    ) {
      setPreferencesMessage(
        `${planName} plan allows a maximum of ${skillLimit} skills.`
      );
      return;
    }

    const { data, error } =
      await supabase
        .from("user_skills")
        .insert({
          user_id: user.id,
          skill: cleanSkill,
        })
        .select("id, skill")
        .single();

    if (error) {
      setPreferencesMessage(
        `Could not add skill: ${error.message}`
      );
      return;
    }

    setMySkills((current) => [
      ...current,
      {
        id: String(data.id),
        skill: String(data.skill),
      },
    ]);

    setPreferencesMessage("");
  }

  async function addTypedSkill() {
    const cleanSkill =
      typedSkill.trim();

    if (!cleanSkill) {
      return;
    }

    await addSkill(cleanSkill);
    setTypedSkill("");
  }

  async function removeSkill(
    skillId: string
  ) {
    if (!user) {
      return;
    }

    const { error } =
      await supabase
        .from("user_skills")
        .delete()
        .eq("id", skillId)
        .eq("user_id", user.id);

    if (error) {
      setPreferencesMessage(
        `Could not remove skill: ${error.message}`
      );
      return;
    }

    setMySkills((current) =>
      current.filter(
        (item) =>
          String(item.id) !==
          String(skillId)
      )
    );
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

    try {
      const cleanCountry =
        country.trim();

      const {
        data: updatedUser,
        error,
      } = await supabase
        .from("users")
        .update({
          country: cleanCountry,
        })
        .eq("id", user.id)
        .select("id, country")
        .maybeSingle();

      if (error) {
        console.error(
          "Save country error:",
          error
        );

        setPreferencesMessage(
          `Save failed: ${error.message}`
        );

        return;
      }

      if (!updatedUser) {
        setPreferencesMessage(
          "Save failed: Supabase did not update your user profile."
        );

        return;
      }

      const {
        data: verifiedUser,
        error: verifyError,
      } = await supabase
        .from("users")
        .select("id, country")
        .eq("id", user.id)
        .maybeSingle();

      if (verifyError) {
        setPreferencesMessage(
          `Verification failed: ${verifyError.message}`
        );

        return;
      }

      if (!verifiedUser) {
        setPreferencesMessage(
          "Save failed: your profile could not be verified."
        );

        return;
      }

      if (
        String(verifiedUser.country || "")
          .trim()
          .toLowerCase() !==
        cleanCountry.toLowerCase()
      ) {
        setPreferencesMessage(
          "Save failed: Supabase did not keep the selected country."
        );

        return;
      }

      setCountry(
        String(
          verifiedUser.country || ""
        )
      );

      setPreferencesMessage(
        "Preferences saved. Your Demand, Supply and SaaS leads will now use these preferences."
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  const categories =
    selectedMain
      ? categoryMap[selectedMain] || []
      : [];

  const subcategories =
    selectedCategory
      ? [selectedCategory]
      : [];
    if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <p>Loading skills...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <p>Please log in first.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#000",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: 8,
            color: "#fff",
          }}
        >
          My Skills
        </h1>

        <p
          style={{
            marginTop: 0,
            marginBottom: 20,
            color: "#bbb",
          }}
        >
          Select the skills you want to use
          for Opportunity Hub leads.
        </p>

        <div
          style={{
            background: "#111",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 6,
              color: "#fff",
            }}
          >
            My Skills ({mySkills.length})
          </h2>

          <p
            style={{
              marginTop: 0,
              color: "#bbb",
            }}
          >
            Plan: {planName} · Limit:{" "}
            {Number.isFinite(skillLimit)
              ? skillLimit
              : "Unlimited"}
          </p>

          {mySkills.length === 0 ? (
            <p
              style={{
                color: "#bbb",
              }}
            >
              No skills selected yet.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {mySkills.map((item) => (
                <div
                  key={
                    item.id ||
                    String(item.skill)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    border: "1px solid #555",
                    borderRadius: 20,
                    background: "#222",
                    color: "#fff",
                  }}
                >
                  <span>
                    {item.skill}
                  </span>

                  {item.id && (
                    <button
                      type="button"
                      onClick={() =>
                        removeSkill(
                          String(item.id)
                        )
                      }
                      style={{
                        border: "none",
                        background:
                          "transparent",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "bold",
                        padding: 0,
                        fontSize: 18,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <input
              type="text"
              value={typedSkill}
              onChange={(e) =>
                setTypedSkill(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addTypedSkill();
                }
              }}
              placeholder="Add another skill"
              style={{
                flex: "1 1 240px",
                padding: 11,
                border: "1px solid #ccc",
                borderRadius: 6,
                background: "#fff",
                color: "#111",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={addTypedSkill}
              style={{
                padding: "11px 18px",
                border: "none",
                borderRadius: 6,
                background: "#fff",
                color: "#111",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Add Skill
            </button>
          </div>

          <h2
            style={{
              color: "#fff",
              marginBottom: 10,
            }}
          >
            Lead Preferences
          </h2>

          <p
            style={{
              color: "#bbb",
              marginTop: 0,
            }}
          >
            Your selected country and skills
            will control the Demand, Supply
            and SaaS leads you see.
          </p>

          <select
            value={country}
            onChange={(e) =>
              setCountry(e.target.value)
            }
            style={{
              width: "100%",
              maxWidth: 400,
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 6,
              background: "#fff",
              color: "#111",
              marginBottom: 14,
              boxSizing: "border-box",
            }}
          >
            <option value="">
              Select your country
            </option>

            {countries.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <div>
            <p
              style={{
                color: "#bbb",
                marginBottom: 8,
              }}
            >
              Main Category
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {mainCategories.map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSelectedMain(item);
                      setSelectedCategory("");
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 6,
                      border:
                        selectedMain === item
                          ? "2px solid #fff"
                          : "1px solid #555",
                      background: "#fff",
                      color: "#111",
                      cursor: "pointer",
                      fontWeight:
                        selectedMain === item
                          ? "700"
                          : "500",
                    }}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>
                    {selectedMain && (
            <div style={{ marginTop: 24 }}>
              <h3
                style={{
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                Categories
              </h3>

              {categories.length === 0 ? (
                <p style={{ color: "#bbb" }}>
                  No categories available.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(item)
                      }
                      style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        border:
                          selectedCategory === item
                            ? "2px solid #fff"
                            : "1px solid #555",
                        background: "#fff",
                        color: "#111",
                        cursor: "pointer",
                        fontWeight:
                          selectedCategory === item
                            ? "700"
                            : "500",
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedCategory && (
            <div style={{ marginTop: 24 }}>
              <h3
                style={{
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                Skills
              </h3>

              {subcategories.length === 0 ? (
                <p style={{ color: "#bbb" }}>
                  No skills available.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {subcategories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        addSkill(item)
                      }
                      style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        border: "1px solid #555",
                        background: "#fff",
                        color: "#111",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid #333",
            }}
          >
            <button
              type="button"
              onClick={savePreferences}
              disabled={savingPreferences}
              style={{
                width: "100%",
                maxWidth: 260,
                padding: "12px 18px",
                border: "none",
                borderRadius: 7,
                background: "#fff",
                color: "#111",
                cursor: savingPreferences
                  ? "wait"
                  : "pointer",
                fontWeight: "700",
                fontSize: 15,
              }}
            >
              {savingPreferences
                ? "Saving..."
                : "Save Preferences"}
            </button>

            {preferencesMessage && (
              <p
                style={{
                  marginTop: 12,
                  color:
                    preferencesMessage.startsWith(
                      "Save failed"
                    ) ||
                    preferencesMessage.startsWith(
                      "Verification failed"
                    ) ||
                    preferencesMessage.startsWith(
                      "Could not"
                    )
                      ? "#ff8a8a"
                      : "#9cffb0",
                }}
              >
                {preferencesMessage}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            background: "#111",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#fff",
            }}
          >
            How Preferences Work
          </h2>

          <p style={{ color: "#bbb" }}>
            Your saved country and selected
            skills are used to filter your
            Opportunity Hub leads.
          </p>

          <p style={{ color: "#bbb" }}>
            Demand, Supply and SaaS leads will
            use the same saved preferences.
          </p>
        </div>
      </div>
    </div>
  );
}
