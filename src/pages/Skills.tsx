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

  function selectCategory(
    value: string
  ) {
    setSelectedCategory(value);
    setSelectedSubcategory("");
  }

  function selectSubcategory(
    value: string
  ) {
    setSelectedSubcategory(value);
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
      mySkills.length >=
      skillLimit
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
      setMySkills((current) =>
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

      setMySkills((current) =>
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
    await addSkill(typedSkill);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111",
          color: "#fff",
          padding: 24,
          boxSizing: "border-box",
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
        background: "#111",
        color: "#fff",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <h1>My Skills</h1>

        <p
          style={{
            color: "#ddd",
          }}
        >
          Plan: {planName} · Limit:{" "}
          {skillLimit >= 999999
            ? "Unlimited"
            : skillLimit}
        </p>

        {skillsError && (
          <div
            style={{
              background: "#fff",
              color: "#111",
              padding: 14,
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
              color: "#111",
              padding: 14,
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
            background: "#181818",
            border: "1px solid #444",
            borderRadius: 12,
          }}
        >
          <h2>
            My selected skills
          </h2>

          {mySkills.length === 0 ? (
            <p
              style={{
                color: "#ccc",
              }}
            >
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
                        color: "#111",
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
                        style={{
                          background:
                            "#111",
                          color: "#fff",
                          border: "none",
                          padding:
                            "6px 10px",
                          borderRadius: 6,
                        }}
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
            background: "#181818",
            border: "1px solid #444",
            borderRadius: 12,
          }}
        >
          <h2>
            Choose your skill
          </h2>

          <p
            style={{
              color: "#ccc",
            }}
          >
            Choose a category, then a
            subcategory, then select
            the skill you want to add.
          </p>

          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <select
              value={selectedCategory}
              onChange={(event) =>
                selectCategory(
                  event.target.value
                )
              }
              style={{
                background: "#fff",
                color: "#111",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #aaa",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <option value="">
                Select Category
              </option>

              {categories.map(
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

            {selectedCategory && (
              <select
                value={
                  selectedSubcategory
                }
                onChange={(event) =>
                  selectSubcategory(
                    event.target.value
                  )
                }
                style={{
                  background: "#fff",
                  color: "#111",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #aaa",
                  width: "100%",
                  boxSizing: "border-box",
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
                <p
                  style={{
                    color: "#ccc",
                  }}
                >
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
                              selected
                                ? "#ddd"
                                : "#fff",
                            color: "#111",
                            border:
                              "1px solid #aaa",
                            padding: 12,
                            borderRadius: 8,
                            textAlign:
                              "left",
                            cursor:
                              selected ||
                              savingPreferences ||
                              mySkills.length >=
                                skillLimit
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

          <div
            style={{
              marginTop: 24,
            }}
          >
            <h3>
              Add another skill
            </h3>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <input
                value={typedSkill}
                onChange={(event) =>
                  setTypedSkill(
                    event.target.value
                  )
                }
                placeholder="Enter skill"
                style={{
                  background: "#fff",
                  color: "#111",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #aaa",
                  flex: 1,
                  minWidth: 220,
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                onClick={
                  addTypedSkill
                }
                disabled={
                  savingPreferences ||
                  !typedSkill.trim() ||
                  mySkills.length >=
                    skillLimit
                }
                style={{
                  background: "#fff",
                  color: "#111",
                  border: "1px solid #aaa",
                  padding:
                    "12px 18px",
                  borderRadius: 8,
                }}
              >
                Add Skill
              </button>
            </div>
          </div>
        </section>
          );
        }
  
