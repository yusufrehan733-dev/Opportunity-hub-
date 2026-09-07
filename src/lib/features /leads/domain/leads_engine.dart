import '../data/leads_repository.dart';

class LeadsEngine {
  final LeadsRepository repository;

  LeadsEngine(this.repository);

  Future<List<Map<String, dynamic>>> getMatchedDemandLeads(
    List<String> userSkills,
  ) async {
    final leads = await repository.getDemandLeads();

    return leads.where((lead) {
      final skillNeeded =
          (lead['skill_needed'] ?? '').toString().toLowerCase();

      return userSkills.any(
        (skill) => skillNeeded.contains(skill.toLowerCase()),
      );
    }).toList();
  }

  Future<List<Map<String, dynamic>>> getMatchedSupplyLeads(
    List<String> userSkills,
  ) async {
    final leads = await repository.getSupplyLeads();

    return leads.where((lead) {
      final requiredSkill =
          (lead['required_skill'] ?? '').toString().toLowerCase();

      return userSkills.any(
        (skill) => requiredSkill.contains(skill.toLowerCase()),
      );
    }).toList();
  }

  Future<List<Map<String, dynamic>>> getMatchedSaasLeads(
    List<String> userSkills,
  ) async {
    final leads = await repository.getSaasLeads();

    return leads.where((lead) {
      final niche =
          (lead['niche'] ?? '').toString().toLowerCase();

      return userSkills.any(
        (skill) => niche.contains(skill.toLowerCase()),
      );
    }).toList();
  }
}
