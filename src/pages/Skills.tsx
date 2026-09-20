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

function cleanValue(value: any) {
  return String(value ?? "").trim();
}

function getMainCategory(row: SkillRow) {
  return cleanValue(row.category);
}

function getSubcategory(row: SkillRow) {
  return cleanValue(row.subcategory);
}

function getSkillName(row: SkillRow) {
  return cleanValue(row.name);
}

function getStoredSkillName(row: any) {
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

  const [selectedMain, setSelectedMain] =
    useState<string | null>(null);

  const [selectedSubcategory, setSelectedSubcategory] =
    useState<string | null>(null);

  const [country, setCountry] = useState("");
  const [typedSkill, setTypedSkill] = useState("");

  const [planName, setPlanName] = useState("Basic");
  const [skillLimit, setSkillLimit] = useState(2);

  const [loading, setLoading] = useState(true);
  const [skillsError, setSkillsError] = useState("");
  const [savingPreferences, setSavingPreferences] =
    useState(false);
  const [preferencesMessage, setPreferencesMessage] =
    useState("");

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

      if (authError || !authData.user) {
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

      setSkillsError(error.message);
      return;
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

    setCountry(row?.country || "");

    if (row?.skill_preference) {
      const legacySkill =
        String(
          row.skill_preference
        ).trim();

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

  const mainCategories =
    useMemo(() => {
      const values = data
        .map((row) =>
          getMainCategory(row)
        )
        .filter(Boolean);

      return Array.from(
        new Set(values)
      ).sort();
    }, [data]);

  const subcategories =
    useMemo(() => {
      if (!selectedMain) {
        return [];
      }

      const values = data
        .filter(
          (row) =>
            getMainCategory(row) ===
            selectedMain
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
      selectedMain,
    ]);

  const matchingSkills =
    useMemo(() => {
      if (
        !selectedMain ||
        !selectedSubcategory
      ) {
        return [];
      }

      return data.filter(
        (row) =>
          getMainCategory(row) ===
            selectedMain &&
          getSubcategory(row) ===
            selectedSubcategory &&
          Boolean(
            getSkillName(row)
          )
      );
    }, [
      data,
      selectedMain,
      selectedSubcategory,
    ]);

  function isSkillSelected(
    skillName: string
  ) {
    return mySkills.some(
      (row) =>
        getStoredSkillName(row)
          .toLowerCase() ===
        skillName.toLowerCase()
    );
  }

  function selectMainCategory(
    value: string
  ) {
    setSelectedMain(
      value || null
    );

    setSelectedSubcategory(
      null
    );
  }

  function selectSubcategory(
    value: string
  ) {
    setSelectedSubcategory(
      value || null
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
      isSkillSelected(cleanSkill)
    ) {
      setPreferencesMessage(
        "This skill is already selected."
      );
      return;
    }

    if (
      mySkills.length >= skillLimit
    ) {
      setPreferencesMessage(
        `${planName} plan allows up to ${skillLimit} skills.`
      );
      return;
    }

    setSavingPreferences(true);
    setPreferencesMessage("");

    try {
      const {
        data: inserted,
        error,
      } = await supabase
        .from("user_skills")
        .insert({
          user_id: user.id,
          skill: cleanSkill,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setMySkills((current) => [
        inserted,
        ...current,
      ]);

      setTypedSkill("");

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
    row: any
  ) {
    if (!user) {
      return;
    }

    const rowId = row?.id;

    if (!rowId) {
      setMySkills(
        (current) =>
          current.filter(
            (item) =>
              item !== row
          )
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
        .delete()
        .eq("id", rowId)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setMySkills(
        (current) =>
          current.filter(
            (item) =>
              item.id !== rowId
          )
      );

      setPreferencesMessage(
        "Skill removed."
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
    await addSkill(
      typedSkill
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          padding: 24,
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
        background: "#000",
        color: "#fff",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <h1>My Skills</h1>

        <p>
          Plan: {planName} · Limit:{" "}
          {skillLimit >= 999999
            ? "Unlimited"
            : skillLimit}
        </p>

        {skillsError && (
          <div
            style={{
              background: "#fff",
              color: "#000",
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
              background: "#fff",
              color: "#000",
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
            marginTop: 24,
            padding: 20,
            border: "1px solid #333",
            borderRadius: 12,
          }}
        >
          <h2>
            My selected skills
          </h2>

          {mySkills.length === 0 ? (
            <p>
              No skills selected yet.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {mySkills.map(
                (row, index) => {
                  const name =
                    getStoredSkillName(
                      row
                    );

                  return (
                    <div
                      key={
                        row?.id ??
                        `${name}-${index}`
                      }
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: 8,
                        background:
                          "#fff",
                        color: "#000",
                        padding:
                          "8px 12px",
                        borderRadius: 8,
                      }}
                    >
                      <span>
                        {name}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeSkill(
                            row
                          )
                        }
                        disabled={
                          savingPreferences
                        }
                      >
                        Remove
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section
          style={{
            marginTop: 24,
            padding: 20,
            border: "1px solid #333",
            borderRadius: 12,
          }}
        >
          <h2>
            Choose your skill
          </h2>

          <p>
            Select a main category,
            then choose its
            subcategory.
          </p>

          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <select
              value={
                selectedMain || ""
              }
              onChange={(event) =>
                selectMainCategory(
                  event.target.value
                )
              }
              style={{
                background: "#fff",
                color: "#000",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <option value="">
                Select Main Category
              </option>

              {mainCategories.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                )
              )}
            </select>

            {selectedMain && (
              <select
                value={
                  selectedSubcategory ||
                  ""
                }
                onChange={(event) =>
                  selectSubcategory(
                    event.target.value
                  )
                }
                style={{
                  background: "#fff",
                  color: "#000",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <option value="">
                  Select Subcategory
                </option>

                {subcategories.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          {selectedSubcategory && (
            <div
              style={{
                marginTop: 20,
              }}
            >
              <h3>
                Available Skills
              </h3>

              {matchingSkills.length ===
              0 ? (
                <p>
                  No skills found in
                  this subcategory.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  {matchingSkills.map(
                    (row, index) => {
                      const name =
                        getSkillName(
                          row
                        );

                      const selected =
                        isSkillSelected(
                          name
                        );

                      return (
                        <button
                          key={
                            row?.id ??
                            `${name}-${index}`
                          }
                          type="button"
                          onClick={() =>
                            addSkill(
                              name
                            )
                          }
                          disabled={
                            selected ||
                            savingPreferences ||
                            mySkills.length >=
                              skillLimit
                          }
                          style={{
                            background:
                              "#fff",
                            color: "#000",
                            padding: 12,
                            borderRadius: 8,
                            textAlign:
                              "left",
                            cursor:
                              selected
                                ? "default"
                                : "pointer",
                          }}
                        >
                          {name}
                          {selected
                            ? " ✓"
                            : ""}
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
