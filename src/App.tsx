import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type TabType = "demand" | "supply" | "saas";

const ALL_SKILLS = [
  "Math",
  "Science",
  "Chemistry",
  "Biology",
  "Economics",
  "Law",
  "Psychology",
  "Sociology",
  "Anthropology",
  "World History",
  "General Subjects",
  "English",
  "Arabic",
  "Urdu",
  "Punjabi",
  "French",
  "Pashto",
  "Translation Services",
  "Tajweed",
  "Tafseer",
  "Hadith",
  "Hifz",
  "Fiqh",
  "Qirat",
  "Career Coach",
  "Business Coach",
  "Self Help Coach",
  "Life Coach",
  "Canvas Painting",
  "Watercolor Painting",
  "Arts & Crafts",
  "Illustration",
  "WordPress",
  "Website Development",
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "Mobile App Development",
  "Software Development",
  "UI/UX Design",
  "SEO",
  "Digital Marketing",
  "Social Media Marketing",
  "Content Writing",
  "Copywriting",
  "Virtual Assistant",
  "Data Entry",
  "Lead Generation",
  "Graphic Design",
  "Logo Design",
  "Brand Identity Design",
  "Poster Design",
  "Banner Design",
  "Social Media Design",
  "Packaging Design",
  "Presentation Design",
  "Print Design",
  "UI Design",
  "UX Design",
  "Video Editing",
  "Motion Graphics",
  "Animation",
  "YouTube Editing",
  "Short Form Content",
  "Podcast Editing",
  "Bookkeeping",
  "Accounting",
  "Recruitment",
  "Customer Support",
  "Sales",
  "Project Management",
];

const ALL_COUNTRIES = [
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Norway",
  "Finland",
  "UAE",
  "Qatar",
  "Saudi Arabia",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Pakistan",
  "India",
  "Bangladesh",
  "Sri Lanka",
  "Nepal",
];

export default function App() {
  const [tab, setTab] = useState<TabType>("demand");
  const [data, setData] = useState<any[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    initialize();
  }, [tab]);

  async function initialize() {
    await loadUserSkills();
    await fetchData();
  }

  async function loadUserSkills() {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error:", authError);
        setUserSkills([]);
        return;
      }

      if (!user) {
        setUserSkills([]);
        return;
      }

      const { data, error } = await supabase
        .from("user_skills")
        .select("skill")
        .eq("user_id", user.id);

      if (error) {
        console.error("User skills error:", error);
        setUserSkills([]);
        return;
      }

      setUserSkills(
        (data || []).map((item: any) =>
          String(item.skill).toLowerCase()
        )
      );
    } catch (err) {
      console.error("loadUserSkills error:", err);
      setUserSkills([]);
    }
  }

  async function fetchData() {
    setLoading(true);
    setError("");

    let table = "demand_leads";

    if (tab === "supply") {
      table = "supply_leads";
    }

    if (tab === "saas") {
      table = "saas_leads";
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase leads error:", error);
        setData([]);
        setError(error.message);
      } else {
        setData(data || []);
      }
    } catch (err) {
      console.error("fetchData error:", err);
      setData([]);
      setError("Unable to load opportunities.");
    }

    setLoading(false);
  }

  const filteredData = data.filter((item) => {
    let leadSkill = "";

    if (tab === "demand") {
      leadSkill = item.skill_needed || "";
    }

    if (tab === "supply") {
      leadSkill = item.required_skill || "";
    }

    if (tab === "saas") {
      leadSkill = item.niche || "";
    }

    const userSkillMatch =
      userSkills.length === 0 ||
      userSkills.some((skill) =>
        leadSkill.toLowerCase().includes(skill)
      );

    const manualSkillMatch =
      selectedSkill === "all" ||
      leadSkill
        .toLowerCase()
        .includes(selectedSkill.toLowerCase());

    const countryMatch =
      selectedCountry === "all" ||
      item.country === selectedCountry;

    return (
      userSkillMatch &&
      manualSkillMatch &&
      countryMatch
    );
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: 20,
      }}
    >
      <h1>🚀 Opportunity Hub</h1>

      <p>
        My Skills:{" "}
        {userSkills.length > 0
          ? userSkills.join(", ")
          : "No skills selected"}
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 20,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => setTab("demand")}>
          Demand Leads
        </button>

        <button onClick={() => setTab("supply")}>
          Supply Jobs
        </button>

        <button onClick={() => setTab("saas")}>
          SaaS Leads
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <select
          value={selectedSkill}
          onChange={(e) =>
            setSelectedSkill(e.target.value)
          }
        >
          <option value="all">All Skills</option>

          {ALL_SKILLS.map((skill) => (
            <option key={skill} value={skill}>
              {skill}
            </option>
          ))}
        </select>

        <select
          value={selectedCountry}
          onChange={(e) =>
            setSelectedCountry(e.target.value)
          }
        >
          <option value="all">All Countries</option>

          {ALL_COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <p>
        Opportunities Found: {filteredData.length}
      </p>

      {error && (
        <p style={{ color: "#ff6b6b" }}>
          Supabase: {error}
        </p>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : filteredData.length === 0 ? (
        <p>No opportunities found.</p>
      ) : (
        filteredData.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #333",
              padding: 15,
              marginBottom: 10,
              borderRadius: 10,
            }}
          >
            <h3>
              {item.title ||
                item.company_name ||
                item.client_name ||
                item.name ||
                "Opportunity"}
            </h3>

            <p>{item.description || ""}</p>

            <p>
              🌍 {item.country || "Global"}
            </p>

            {item.skill_needed && (
              <p>
                <strong>Skill Needed:</strong>{" "}
                {item.skill_needed}
              </p>
            )}

            {item.required_skill && (
              <p>
                <strong>Required Skill:</strong>{" "}
                {item.required_skill}
              </p>
            )}

            {item.niche && (
              <p>
                <strong>Niche:</strong>{" "}
                {item.niche}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
