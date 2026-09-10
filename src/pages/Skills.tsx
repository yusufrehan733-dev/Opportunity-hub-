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

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    await fetchSkills();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUser(user);
    await fetchUserSkills(user.id);
    await fetchUserPlan(user.id);
  }

  async function fetchSkills() {
    const { data, error } = await supabase
      .from("skills")
      .select("*");

    if (!error) {
      setData(data || []);
    }
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
    if (!user) return;

    const exists = mySkills.some(
      (s) => s.skill.toLowerCase() === skill.toLowerCase()
    );

    if (exists) {
      alert("Skill already added");
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
    ...new Set(data.map((item) => item.name)),
  ];

  const categories = selectedMain
    ? [
        ...new Set(
          data
            .filter((item) => item.name === selectedMain)
            .map((item) => item.category)
        ),
      ]
    : [];

  const subcategories =
    selectedMain && selectedCategory
      ? data
          .filter(
            (item) =>
              item.name === selectedMain &&
              item.category === selectedCategory
          )
          .map((item) => item.subcategory)
      : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-2xl font-bold text-foreground">
            Skills
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-1">
            My Skills ({mySkills.length})
          </h2>

          <p className="text-sm text-muted-foreground mb-3">
            Plan: {planName} · Limit:{" "}
            {Number.isFinite(skillLimit)
              ? skillLimit
              : "Unlimited"}
          </p>

          {mySkills.length === 0 ? (
            <div className="bg-card border rounded-lg p-4 text-muted-foreground">
              No skills selected yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mySkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg"
                >
                  <span>{skill.skill}</span>

                  <button
                    onClick={() => removeSkill(skill.id)}
                    className="font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">
            Main Categories
          </h2>

          <div className="flex flex-wrap gap-2">
            {mainCategories.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedMain(item);
                  setSelectedCategory(null);
                }}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedMain === item
                    ? "bg-primary text-white"
                    : "bg-secondary hover:bg-primary hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {selectedMain && (
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Categories
            </h2>

            <div className="flex flex-wrap gap-2">
              {categories.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCategory(item)}
                  className={`px-4 py-2 rounded-lg transition ${
                    selectedCategory === item
                      ? "bg-primary text-white"
                      : "bg-secondary hover:bg-primary hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCategory && (
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Subcategories
            </h2>

            <div className="flex flex-wrap gap-2">
              {subcategories.map((item, index) => (
                <button
                  key={index}
                  onClick={() => addSkill(item)}
                  className="px-4 py-2 bg-card border rounded-lg hover:bg-primary hover:text-white transition"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
        }
