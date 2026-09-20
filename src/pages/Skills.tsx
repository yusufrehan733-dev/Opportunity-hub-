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
  main_category?: string | null;
  main?: string | null;
  category?: string | null;
  subcategory?: string | null;
  skill?: string | null;
  name?: string | null;
  title?: string | null;
  [key: string]: any;
};

function cleanValue(value: any) {
  return String(value ?? "").trim();
}

function getMainCategory(row: SkillRow) {
  return cleanValue(
    row.main_category ??
      row.main ??
      row.category
  );
}

function getCategory(row: SkillRow) {
  return cleanValue(
    row.category ??
      row.subcategory ??
      row.skill ??
      row.name ??
      row.title
  );
}

function getSubcategory(row: SkillRow) {
  return cleanValue(
    row.subcategory ??
      row.skill ??
      row.name ??
      row.title
  );
}

function getSkillName(row: SkillRow) {
  return cleanValue(
    row.skill ??
      row.name ??
      row.title ??
      row.subcategory ??
      row.category
  );
}

export default function Skills() {
  const [data, setData] =
    useState<SkillRow[]>([]);

  const [user, setUser] =
    useState<any>(null);

  const [mySkills, setMySkills] =
    useState<any[]>([]);

  const [selectedMain, setSelectedMain] =
    useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [country, setCountry] =
    useState("");

  const [typedSkill, setTypedSkill] =
    useState("");

  const [planName, setPlanName] =
    useState("Basic");

  const [skillLimit, setSkillLimit] =
    useState(2);

  const [loading, setLoading] =
    useState(true);

  const [skillsError, setSkillsError] =
    useState("");

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
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        return;
      }

      const currentUser =
        authData.user;

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

    setData(
      (rows || []) as SkillRow[]
    );
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
      row?.country || ""
    );

    if (
      row?.skill_preference &&
      mySkills.length === 0
    ) {
      const legacySkill =
        String(
          row.skill_preference
        ).trim();

      if (legacySkill) {
        setMySkills([
          {
            skill: legacySkill,
          },
        ]);
      }
    }
  }
  
