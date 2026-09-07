class LeadsMatcher {
  static int calculateScore({
    required List<String> userSkills,
    required String targetSkill,
  }) {
    int score = 0;

    for (final skill in userSkills) {
      if (targetSkill.toLowerCase().contains(
        skill.toLowerCase(),
      )) {
        score += 10;
      }
    }

    return score;
  }
}
