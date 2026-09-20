import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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

type SkillRow = {
  id?: string | number;
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

function cleanValue(value: any): string {
  return String(value ?? "").trim();
}

function getCategory(row: SkillRow): string {
  return cleanValue(row.category);
}

function getSubcategory(row: SkillRow): string {
  return cleanValue(row.subcategory);
}

function getSkillName(row: SkillRow): string {
  return cleanValue(row.name);
}

function getStoredSkillName(row: any): string {
  return cleanValue(
    row?.skill ??
      row?.skill_name ??
      row?.name ??
      row?.title
  );
}

export default function Skills() {
  const [data, setData] = useState<SkillRow[]>([]);
  const [user, setUser] = useState<any>(null);
  const [mySkills, setMySkills] = useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<string>("");

  const [selectedSubcategory, setSelectedSubcategory] =
    useState<string>("");

  const [country, setCountry] = useState<string>("");
  const [typedSkill, setTypedSkill] = useState<string>("");

  const [planName, setPlanName] =
    useState<string>("Basic");

  const [skillLimit, setSkillLimit] =
    useState<number>(2);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [skillsError, setSkillsError] =
    useState<string>("");

  const [savingPreferences, setSavingPreferences] =
    useState<boolean>(false);

  const [preferencesMessage, setPreferencesMessage] =
    useState<string>("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setSkillsError("");
    setPreferencesMessage("");

    try {
      await loadSkills();

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        return;
      }

      const currentUser = authData.user;

      setUser(currentUser);

      await Promise.all([
        loadUserSkills(currentUser.id),
        loadUserCountry(currentUser.id),
        loadUserPlan(currentUser.id),
      ]);
    } catch (error: any) {
      console.error(
        "Skills initialize error:",
        error
      );

      setSkillsError(
        error?.message ||
          "Could not load Skills."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSkills() {
    const {
      data: rows,
      error,
    } = await supabase
      .from("skills")
      .select("*");

    if (error) {
      console.error(
        "Skills error:",
        error
      );

      throw error;
    }

    setData((rows || []) as SkillRow[]);
  }

  async function loadUserSkills(
    userId: string
  ) {
    const {
      data: rows,
      error,
    } = await supabase
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

    setMySkills(rows || []);
  }

  async function loadUserCountry(
    userId: string
  ) {
    const {
      data: row,
      error,
    } = await supabase
      .from("users")
      .select(
        "country, skill_preference"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "User country error:",
        error
      );
      return;
    }

    setCountry(
      cleanValue(row?.country)
    );

    const legacySkill =
      cleanValue(
        row?.skill_preference
      );

    if (legacySkill) {
      setMySkills((current) => {
        if (current.length > 0) {
          return current;
        }

        return [
          {
            skill: legacySkill,
          },
        ];
      });
    }
  }

  async function loadUserPlan(
    userId: string
  ) {
    const {
      data: row,
      error,
    } = await supabase
      .from("users")
      .select(
        "plan, plan_name, subscription_status"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "User plan error:",
        error
      );
      return;
    }

    const rawPlan =
      row?.plan_name ||
      row?.plan ||
      "Basic";

    const normalizedPlan =
      String(rawPlan)
        .trim()
        .toLowerCase();

    if (normalizedPlan === "gold") {
      setPlanName("Gold");
      setSkillLimit(999999);
    } else if (
      normalizedPlan === "premium"
    ) {
      setPlanName("Premium");
      setSkillLimit(5);
    } else {
      setPlanName("Basic");
      setSkillLimit(2);
    }
  }
    const categories = useMemo(() => {
    const values = data
      .map((row) =>
        getCategory(row)
      )
      .filter(Boolean);

    return Array.from(
      new Set(values)
    ).sort();
  }, [data]);

  const subcategories = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    const values = data
      .filter(
        (row) =>
          getCategory(row) ===
          selectedCategory
      )
      .map((row) =>
        getSubcategory(row)
      )
      .filter(Boolean);

    return Array.from(
      new Set(values)
    ).sort();
  }, [
    data,
    selectedCategory,
  ]);

  const matchingSkills = useMemo(() => {
    if (
      !selectedCategory ||
      !selectedSubcategory
    ) {
      return [];
    }

    return data.filter(
      (row) =>
        getCategory(row) ===
          selectedCategory &&
        getSubcategory(row) ===
          selectedSubcategory &&
        Boolean(
          getSkillName(row)
        )
    );
  }, [
    data,
    selectedCategory,
    selectedSubcategory,
  ]);

  function isSkillSelected(
    skillName: string
  ): boolean {
    const target =
      skillName
        .trim()
        .toLowerCase();

    return mySkills.some(
      (row) =>
        getStoredSkillName(row)
          .toLowerCase() ===
        target
    );
  }

  function selectSubcategory(
    value: string
  ) {
    setSelectedSubcategory(value);
  }

  async function addSelectedSkill(
    skillName: string
  ) {
    if (!skillName.trim()) {
      return;
    }

    await addSkill(
      skillName.trim()
    );
  }

  async function saveCountry() {
    if (!user) {
      setPreferencesMessage(
        "Please sign in first."
      );
      return;
    }

    setSavingPreferences(true);
    setPreferencesMessage("");

    try {
      const {
        error,
      } = await supabase
        .from("users")
        .update({
          country:
            country.trim(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setPreferencesMessage(
        "Country saved successfully."
      );
    } catch (error: any) {
      console.error(
        "Save country error:",
        error
      );

      setPreferencesMessage(
        error?.message ||
          "Could not save country."
      );
    } finally {
      setSavingPreferences(false);
    }
  }
    async function addSkill(
    skillName: string
  ) {
    if (!user) {
      setPreferencesMessage(
        "Please sign in first."
      );
      return;
    }

    const cleanSkill =
      skillName.trim();

    if (!cleanSkill) {
      return;
    }

    if (
      isSkillSelected(
        cleanSkill
      )
    ) {
      setPreferencesMessage(
        "This skill is already added."
      );
      return;
    }

    if (
      mySkills.length >=
      skillLimit
    ) {
      setPreferencesMessage(
        `${planName} plan allows ${skillLimit} skills.`
      );
      return;
    }

    setSavingPreferences(true);
    setPreferencesMessage("");

    try {
      const {
        error,
      } = await supabase
        .from("user_skills")
        .insert({
          user_id: user.id,
          skill: cleanSkill,
        });

      if (error) {
        throw error;
      }

      await loadUserSkills(
        user.id
      );

      setPreferencesMessage(
        "Skill added successfully."
      );
    } catch (error: any) {
      console.error(
        "Add skill error:",
        error
      );

      setPreferencesMessage(
        error?.message ||
          "Could not add skill."
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function removeSkill(
    skillRow: any
  ) {
    if (!user) {
      setPreferencesMessage(
        "Please sign in first."
      );
      return;
    }

    const skillId =
      skillRow?.id;

    if (!skillId) {
      return;
    }

    setSavingPreferences(true);
    setPreferencesMessage("");

    try {
      const {
        error,
      } = await supabase
        .from("user_skills")
        .delete()
        .eq("id", skillId)
        .eq(
          "user_id",
          user.id
        );

      if (error) {
        throw error;
      }

      await loadUserSkills(
        user.id
      );

      setPreferencesMessage(
        "Skill removed successfully."
      );
    } catch (error: any) {
      console.error(
        "Remove skill error:",
        error
      );

      setPreferencesMessage(
        error?.message ||
          "Could not remove skill."
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function addTypedSkill() {
    const skillName =
      typedSkill.trim();

    if (!skillName) {
      return;
    }

    await addSkill(
      skillName
    );

    setTypedSkill("");
          }
    if (loading) {
    return (
      <div
        style={{
          padding: 24,
          color: "#111",
        }}
      >
        Loading Skills...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        color: "#111",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <h1>
          My Skills
        </h1>

        <p>
          Plan: {planName} · Limit:{" "}
          {skillLimit >= 999999
            ? "Unlimited"
            : skillLimit}
        </p>

        {skillsError && (
          <div
            style={{
              background: "#fee",
              border: "1px solid #d88",
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            {skillsError}
          </div>
        )}

        {preferencesMessage && (
          <div
            style={{
              background: "#eee",
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            {preferencesMessage}
          </div>
        )}

        <section
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h2>
            Your Lead Preferences
          </h2>

          <div
            style={{
              marginBottom: 18,
            }}
          >
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Country
            </label>

            <select
              value={country}
              onChange={(e) =>
                setCountry(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "12px",
                border:
                  "1px solid #aaa",
                borderRadius: 8,
                background: "#fff",
                color: "#111",
                fontSize: 16,
              }}
            >
              <option value="">
                Select country
              </option>

              {COUNTRIES.map(
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
              onClick={saveCountry}
              disabled={
                savingPreferences ||
                !country.trim()
              }
              style={{
                marginTop: 10,
                background: "#111",
                color: "#fff",
                border: "none",
                padding:
                  "10px 16px",
                borderRadius: 8,
              }}
            >
              {savingPreferences
                ? "Saving..."
                : "Save Country"}
            </button>
          </div>

          <div
            style={{
              marginBottom: 18,
            }}
          >
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Category
            </label>

            <select
              value={
                selectedCategory
              }
              onChange={(e) => {
                setSelectedCategory(
                  e.target.value
                );
                setSelectedSubcategory(
                  ""
                );
              }}
              style={{
                width: "100%",
                padding: "12px",
                border:
                  "1px solid #aaa",
                borderRadius: 8,
                background: "#fff",
                color: "#111",
                fontSize: 16,
              }}
            >
              <option value="">
                Select category
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
                     </section>
      </div>
    </div>
  );
  }
