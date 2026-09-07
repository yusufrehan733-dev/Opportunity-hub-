export function isSkillMatch(
  userSkill: string,
  leadSkill: string
) {
  const user = userSkill.toLowerCase();
  const lead = leadSkill.toLowerCase();

  if (user === lead) {
    return true;
  }

  if (lead.includes(user)) {
    return true;
  }

  if (user.includes(lead)) {
    return true;
  }

  const aliases: Record<string, string[]> = {
    arabic: [
      "arabic teacher",
      "arabic tutor",
      "translation services",
    ],

    english: [
      "english teacher",
      "english tutor",
    ],

    wordpress: [
      "website development",
      "frontend development",
    ],

    seo: [
      "digital marketing",
      "lead generation",
    ],

    "graphic design": [
      "logo design",
      "poster design",
      "banner design",
      "social media design",
    ],

    "video editing": [
      "youtube editing",
      "short form content",
      "motion graphics",
    ],
  };

  const related = aliases[user] || [];

  return related.some(
    (item) =>
      item.toLowerCase() === lead
  );
}
