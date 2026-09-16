import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Skills() {
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [selectedMain, setSelectedMain] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [mySkills, setMySkills] = useState<any[]>([]);
  const [skillLimit, setSkillLimit] = useState<number>(2);
  const [planName, setPlanName] = useState("Basic");
  const [loading, setLoading] = useState(true);
  const [skillsError, setSkillsError] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setSkillsError("");

    await fetchSkills();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUser(user);

    await fetchUserSkills(user.id);
    await fetchUserPlan(user.id);

    setLoading(false);
  }

  async function fetchSkills() {
    const { data, error } = await supabase
      .from("skills")
      .select("*");

    if (error) {
      console.error("Skills loading error:", error);
      setSkillsError(error.message);
      setData([]);
      return;
    }

    console.log("Skills loaded:", data);

    setData(data || []);
  }

  async function fetchUserSkills(userId: string) {
    const { data, error } = await supabase
      .from("user_skills")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setMySkills(data || []);
    }
  }

  async function fetchUserPlan(userId: string) {
    const { data: subscription, error } = await supabase
      .from("user_subscriptions")
      .select("plan_id, skill_limit")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return;
    }

    if (!subscription) {
      setPlanName("Basic");
      setSkillLimit(2);
      return;
    }

    if (subscription.skill_limit !== null) {
      setSkillLimit(subscription.skill_limit);
    }

    const { data: plan } = await supabase
      .from("plans")
      .select("name")
      .eq("id", subscription.plan_id)
      .maybeSingle();

    if (plan?.name) {
      setPlanName(plan.name);

      if (plan.name.toLowerCase() === "gold") {
        setSkillLimit(Infinity);
      } else if (plan.name.toLowerCase() === "premium") {
        setSkillLimit(5);
      } else {
        setSkillLimit(2);
      }
    }
  }

  async function addSkill(skill: string) {
    if (!user) {
      alert("Please log in first.");
      return;
    }

    const exists = mySkills.some(
      (s) =>
        String(s.skill).toLowerCase() === skill.toLowerCase()
    );

    if (exists) {
      alert("Skill already added.");
      return;
    }

    if (
      Number.isFinite(skillLimit) &&
      mySkills.length >= skillLimit
    ) {
      alert(
        `${planName} plan allows up to ${skillLimit} skills. Upgrade your plan to add more.`
      );
      return;
    }

    const { error } = await supabase
      .from("user_skills")
      .insert({
        user_id: user.id,
        skill,
      });

    if (error) {
      alert(error.message);
      return;
    }

    await fetchUserSkills(user.id);
  }

  async function removeSkill(id: string) {
    const { error } = await supabase
      .from("user_skills")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setMySkills((prev) =>
      prev.filter((skill) => skill.id !== id)
    );
  }

  const mainCategories = [
    ...new Set(
      data
        .map((item) => item.name)
        .filter(Boolean)
    ),
  ];

  const categories = selectedMain
    ? [
        ...new Set(
          data
            .filter((item) => item.name === selectedMain)
            .map((item) => item.category)
            .filter(Boolean)
        ),
      ]
    : [];

  const subcategories =
    selectedMain && selectedCategory
      ? [
          ...new Set(
            data
              .filter(
                (item) =>
                  item.name === selectedMain &&
                  item.category === selectedCategory
              )
              .map((item) => item.subcategory)
              .filter(Boolean)
          ),
        ]
      : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "#111",
          borderBottom: "1px solid #2a2a2a",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "#1d1d1d",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 8,
              padding: 9,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <h1 style={{ margin: 0, fontSize: 24 }}>
            Skills
          </h1>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "30px 20px",
        }}
      >
        {/* MY SKILLS */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 6 }}>
            My Skills ({mySkills.length})
          </h2>

          <p
            style={{
              color: "#999",
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            Plan: {planName} · Limit:{" "}
            {Number.isFinite(skillLimit)
              ? skillLimit
              : "Unlimited"}
          </p>

          {mySkills.length === 0 ? (
            <div
              style={{
                background: "#151515",
                border: "1px solid #2d2d2d",
                borderRadius: 10,
                padding: 18,
                color: "#999",
              }}
            >
              No skills selected yet.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {mySkills.map((skill) => (
                <div
                  key={skill.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#222",
                    border: "1px solid #444",
                    borderRadius: 8,
                    padding: "9px 12px",
                  }}
                >
                  <span>{skill.skill}</span>

                  <button
                    onClick={() => removeSkill(skill.id)}
                    style={{
                      background: "transparent",
                      color: "#aaa",
                      border: "none",
                      fontSize: 18,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ERROR */}
        {skillsError && (
          <div
            style={{
              background: "#211010",
              border: "1px solid #5c2929",
              color: "#ff8d8d",
              borderRadius: 10,
              padding: 16,
              marginBottom: 25,
            }}
          >
            Could not load skills: {skillsError}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div
            style={{
              background: "#151515",
              border: "1px solid #2d2d2d",
              borderRadius: 10,
              padding: 20,
              color: "#aaa",
            }}
          >
            Loading skill categories...
          </div>
        ) : (
          <>
            {/* MAIN CATEGORIES */}
            <section style={{ marginBottom: 35 }}>
              <h2 style={{ marginBottom: 14 }}>
                Main Categories
              </h2>

              {mainCategories.length === 0 ? (
                <div
                  style={{
                    background: "#151515",
                    border: "1px solid #2d2d2d",
                    borderRadius: 10,
                    padding: 20,
                    color: "#999",
                  }}
                >
                  No skill categories found in the database.
                </div>
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
                      onClick={() => {
                        setSelectedMain(item);
                        setSelectedCategory(null);
                      }}
                      style={{
                        padding: "11px 17px",
                        borderRadius: 8,
                        border:
                          selectedMain === item
                            ? "1px solid #00ffae"
                            : "1px solid #3a3a3a",
                        background:
                          selectedMain === item
                            ? "#00ffae"
                            : "#1a1a1a",
                        color:
                          selectedMain === item
                            ? "#000"
                            : "#fff",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* CATEGORIES */}
            {selectedMain && (
              <section style={{ marginBottom: 35 }}>
                <h2 style={{ marginBottom: 14 }}>
                  Categories
                </h2>

                {categories.length === 0 ? (
                  <div
                    style={{
                      background: "#151515",
                      border: "1px solid #2d2d2d",
                      borderRadius: 10,
                      padding: 18,
                      color: "#999",
                    }}
                  >
                    No categories found for {selectedMain}.
                  </div>
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
                        onClick={() =>
                          setSelectedCategory(item)
                        }
                        style={{
                          padding: "11px 17px",
                          borderRadius: 8,
                          border:
                            selectedCategory === item
                              ? "1px solid #00ffae"
                              : "1px solid #3a3a3a",
                          background:
                            selectedCategory === item
                              ? "#00ffae"
                              : "#1a1a1a",
                          color:
                            selectedCategory === item
                              ? "#000"
                              : "#fff",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SUBCATEGORIES */}
            {selectedCategory && (
              <section>
                <h2 style={{ marginBottom: 14 }}>
                  Skills
                </h2>

                {subcategories.length === 0 ? (
                  <div
                    style={{
                      background: "#151515",
                      border: "1px solid #2d2d2d",
                      borderRadius: 10,
                      padding: 18,
                      color: "#999",
                    }}
                  >
                    No skills found for {selectedCategory}.
                  </div>
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
                        onClick={() => addSkill(item)}
                        style={{
                          padding: "11px 17px",
                          borderRadius: 8,
                          border: "1px solid #3a3a3a",
                          background: "#151515",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
