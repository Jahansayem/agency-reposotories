import { useState, useEffect } from 'react';
import { supabase, AgencyProfile, MonthlyTargets, LeadConfig } from '../lib/supabase';

export function useAgencyData() {
  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAgency() {
      try {
        const { data, error } = await supabase
          .from('agency_profile')
          .select('*')
          .limit(1)
          .single();

        if (error) throw error;
        setAgency(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgency();
  }, []);

  return { agency, loading, error };
}

export function useMonthlyTargets(year: number, month: number) {
  const [targets, setTargets] = useState<MonthlyTargets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTargets() {
      try {
        const { data: agencyData } = await supabase
          .from('agency_profile')
          .select('id')
          .limit(1)
          .single();

        if (!agencyData) throw new Error('No agency found');

        const { data, error } = await supabase
          .from('monthly_targets')
          .select('*')
          .eq('agency_id', agencyData.id)
          .eq('year', year)
          .eq('month', month)
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        setTargets(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchTargets();
  }, [year, month]);

  return { targets, loading, error };
}

export function useLeadConfig() {
  const [config, setConfig] = useState<LeadConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data: agencyData } = await supabase
          .from('agency_profile')
          .select('id')
          .limit(1)
          .single();

        if (!agencyData) throw new Error('No agency found');

        const { data, error } = await supabase
          .from('lead_config')
          .select('*')
          .eq('agency_id', agencyData.id)
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setConfig(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  return { config, loading, error };
}

export async function updateAgencyProfile(id: string, updates: Partial<AgencyProfile>) {
  const { data, error } = await supabase
    .from('agency_profile')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveMonthlyTargets(targets: Partial<MonthlyTargets>) {
  const { data, error } = await supabase
    .from('monthly_targets')
    .upsert(targets, { onConflict: 'agency_id,year,month' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeadConfig(agencyId: string, updates: Partial<LeadConfig>) {
  const { data, error } = await supabase
    .from('lead_config')
    .upsert(
      {
        agency_id: agencyId,
        ...updates,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'agency_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
