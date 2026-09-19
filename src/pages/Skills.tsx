import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type SkillItem = {
  id?: string;
  name?: string;
  skill?: string;
  category?: string;
  subcategory?: string;
};

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "United Arab Emirates",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Australia",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Pakistan",
  "India",
  "Bangladesh",
];

export default function Skills() {
  const [data, setData] = useState<any[]>([]);
  const [selectedMain, setSelectedMain] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );

  const [user, setUser] = useState<any>(null);
  const [mySkills, setMySkills] = useState<any[]>([]);

  const [skillLimit, setSkillLimit] = useState<number>(2);
  const [planName, setPlanName] = useState("Basic");

  const [country, setCountry] = useState("");
  const [typedSkill, setTypedSkill] = useState("");

  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [skillsError, setSkillsError] = useState("");

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
    const { data: skills, error } = await supabase
      .from("skills")
      .select("*");

    if (error) {
      console.error("Skills error:", error);
      setSkillsError(error.message);
      return;
    }

    setData(skills || []);
  }

  async function fetchUserSkills(userId: string) {
    const { data, error } = await supabase
      .from("user_skills")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("User skills error:", error);
      return;
    }

    setMySkills(data || []);
  }

  async function fetchUserCountry(userId: string) {
    const { data, error } = await supabase
      .from("users")
      .select("country")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("User country error:", error);
      return;
    }

    setCountry(data?.country || "");
  }

  async function fetchUserPlan(userId: string) {
    const {
      data: subscription,
      error,
    } = await supabase
      .from("user_subscriptions")
      .select("plan_id, skill_limit")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error || !subscription) {
      setPlanName("Basic");
      setSkillLimit(2);
      return;
    }

    const { data: plan } = await supabase
      .from("plans")
      .select("name")
      .eq("id", subscription.plan_id)
      .maybeSingle();

    const name = plan?.name?.toLowerCase() || "basic";

    if (name === "gold") {
      setPlanName("Gold");
      setSkillLimit(Infinity);
    } else if (name === "premium") {
      setPlanName("Premium");
      setSkillLimit(5);
    } else {
      setPlanName("Basic");
      setSkillLimit(2);
    }
    }
    async function savePreferences() {
    if (!user) {
      alert("Please log in first.");
      return;
    }

    if (!country) {
      setPreferencesMessage("Please select your country.");
      return;
    }

    if (mySkills.length === 0) {
      setPreferencesMessage("Please select at least one skill.");
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
      const cleanCountry = country.trim();

      console.log("SAVING PREFERENCES:", {
        userId: user.id,
        country: cleanCountry,
        skills: mySkills.map((item) => item.skill),
      });

      const { data: updatedUser, error: updateError } =
        await supabase
          .from("users")
          .update({
            country: cleanCountry,
          })
          .eq("id", user.id)
          .select("id, country")
          .maybeSingle();

      if (updateError) {
        console.error("Save country error:", updateError);
        setPreferencesMessage(
          `Save failed: ${updateError.message}`
        );
        return;
      }

      if (!updatedUser) {
        console.error(
          "Save country returned no updated row.",
          {
            userId: user.id,
            country: cleanCountry,
          }
        );

        setPreferencesMessage(
          "Save failed: Supabase did not update your user profile."
        );
        return;
      }

      console.log("UPDATED USER:", updatedUser);

      const { data: verifiedUser, error: verifyError } =
        await supabase
          .from("users")
          .select("id, country")
          .eq("id", user.id)
          .maybeSingle();

      if (verifyError) {
        console.error(
          "Preference verification error:",
          verifyError
        );

        setPreferencesMessage(
          `Saved, but verification failed: ${verifyError.message}`
        );
        return;
      }

      if (!verifiedUser) {
        setPreferencesMessage(
          "Save failed: the updated profile could not be verified."
        );
        return;
      }

      if (
        String(verifiedUser.country || "").trim().toLowerCase() !==
        cleanCountry.toLowerCase()
      ) {
        console.error("COUNTRY VERIFICATION FAILED:", {
          expected: cleanCountry,
          received: verifiedUser.country,
        });

        setPreferencesMessage(
          "Save failed: Supabase did not keep the selected country."
        );
        return;
      }

      setCountry(verifiedUser.country || "");

      setPreferencesMessage(
        "Preferences saved. Your Demand, Supply and SaaS leads will now use these preferences."
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function addSkill(skill: string) {
    if (!user) {
      alert("Please log in first.");
      return false;
    }

    const cleanSkill = skill.trim();

    if (!cleanSkill) {
      alert("Please enter a skill.");
      return false;
    }

    const exists = mySkills.some(
      (item) =>
        String(item.skill || "")
          .trim()
          .toLowerCase() === cleanSkill.toLowerCase()
    );

    if (exists) {
      alert("Skill already added.");
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

    const { error } = await supabase
      .from("user_skills")
      .insert({
        user_id: user.id,
        skill: cleanSkill,
      });

    if (error) {
      console.error("Add skill error:", error);
      alert(error.message);
      return false;
    }

    await fetchUserSkills(user.id);

    setPreferencesMessage("");

    return true;
  }

  async function addTypedSkill() {
    const cleanSkill = typedSkill.trim();

    if (!cleanSkill) {
      alert("Please enter a skill.");
      return;
    }

    const added = await addSkill(cleanSkill);

    if (added) {
      setTypedSkill("");
    }
  }

  async function removeSkill(skillId?: string) {
    if (!user || !skillId) return;

    const { error } = await supabase
      .from("user_skills")
      .delete()
      .eq("id", skillId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Remove skill error:", error);
      alert(error.message);
      return;
    }

    await fetchUserSkills(user.id);
  }

  const mainCategories = Array.from(
    new Set(
      data
        .map((item) => String(item?.name || "").trim())
        .filter(Boolean)
    )
  );

  const categories = selectedMain
    ? Array.from(
        new Set(
          data
            .filter(
              (item) =>
                String(item?.name || "").trim() === selectedMain
            )
            .map((item) =>
              String(item?.category || "").trim()
            )
            .filter(Boolean)
        )
      )
    : [];

  const subcategories = selectedCategory
    ? Array.from(
        new Set(
          data
            .filter(
              (item) =>
                String(item?.category || "").trim() ===
                selectedCategory
            )
            .map((item) =>
              String(item?.subcategory || "").trim()
            )
            .filter(Boolean)
        )
      )
    : [];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
        }}
      >
        <h2>My Skills</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (skillsError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
        }}
      >
        <h2>My Skills</h2>
        <p style={{ color: "#b00020" }}>{skillsError}</p>
      </div>
    );
                 }
    return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#f5f5f5",
        color: "#111",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 6,
            }}
          >
            My Skills ({mySkills.length})
          </h2>

          <p
            style={{
              marginTop: 0,
              color: "#555",
            }}
          >
            Plan: {planName} · Limit:{" "}
            {Number.isFinite(skillLimit)
              ? skillLimit
              : "Unlimited"}
          </p>

          {mySkills.length === 0 ? (
            <p style={{ color: "#666" }}>
              No skills selected yet.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {mySkills.map((item) => (
                <div
                  key={item.id || item.skill}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    border: "1px solid #ccc",
                    borderRadius: 20,
                    background: "#fafafa",
                  }}
                >
                  <span>{item.skill}</span>

                  {item.id && (
                    <button
                      type="button"
                      onClick={() =>
                        removeSkill(String(item.id))
                      }
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontWeight: "bold",
                        padding: 0,
                      }}
                      aria-label={`Remove ${item.skill}`}
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
              gap: 8,
              flexWrap: "wrap",
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
              placeholder="Type a skill"
              style={{
                flex: "1 1 220px",
                minWidth: 0,
                padding: 10,
                border: "1px solid #ccc",
                borderRadius: 6,
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={addTypedSkill}
              style={{
                padding: "10px 16px",
                border: "1px solid #111",
                borderRadius: 6,
                background: "#111",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Add Skill
            </button>
          </div>

          <div
            style={{
              borderTop: "1px solid #eee",
              paddingTop: 20,
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Lead Preferences
            </h3>

            <p
              style={{
                color: "#666",
                fontSize: 14,
              }}
            >
              Choose your country and saved skills. These
              preferences will control your Demand, Supply
              and SaaS leads.
            </p>

            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Country
            </label>

            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPreferencesMessage("");
              }}
              style={{
                width: "100%",
                maxWidth: 400,
                padding: 10,
                border: "1px solid #ccc",
                borderRadius: 6,
                background: "#fff",
                marginBottom: 14,
              }}
            >
              <option value="">
                Select your country
              </option>

              {COUNTRIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={savePreferences}
              disabled={savingPreferences}
              style={{
                padding: "10px 18px",
                border: "1px solid #111",
                borderRadius: 6,
                background: savingPreferences
                  ? "#777"
                  : "#111",
                color: "#fff",
                cursor: savingPreferences
                  ? "wait"
                  : "pointer",
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
                  marginBottom: 0,
                  color: preferencesMessage
                    .toLowerCase()
                    .includes("failed")
                    ? "#b00020"
                    : "#222",
                  fontWeight: 500,
                }}
              >
                {preferencesMessage}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Main Categories
          </h3>

          {mainCategories.length === 0 ? (
            <p style={{ color: "#666" }}>
              No skill categories are available.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {mainCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setSelectedMain(item);
                    setSelectedCategory(null);
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    border:
                      selectedMain === item
                        ? "2px solid #111"
                        : "1px solid #ccc",
                    background:
                      selectedMain === item
                        ? "#eee"
                        : "#fff",
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {selectedMain && (
            <div style={{ marginTop: 24 }}>
              <h3>Categories</h3>

              {categories.length === 0 ? (
                <p style={{ color: "#666" }}>
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
                            ? "2px solid #111"
                            : "1px solid #ccc",
                        background:
                          selectedCategory === item
                            ? "#eee"
                            : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
  
  
