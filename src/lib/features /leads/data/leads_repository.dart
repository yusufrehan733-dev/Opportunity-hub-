import 'package:supabase_flutter/supabase_flutter.dart';

class LeadsRepository {
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<List<Map<String, dynamic>>> getDemandLeads() async {
    final data = await _supabase
        .from('demand_leads')
        .select();

    return List<Map<String, dynamic>>.from(data);
  }

  Future<List<Map<String, dynamic>>> getSupplyLeads() async {
    final data = await _supabase
        .from('supply_leads')
        .select();

    return List<Map<String, dynamic>>.from(data);
  }

  Future<List<Map<String, dynamic>>> getSaasLeads() async {
    final data = await _supabase
        .from('saas_leads')
        .select();

    return List<Map<String, dynamic>>.from(data);
  }
}
