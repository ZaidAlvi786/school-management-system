// Helper functions for common Supabase database operations
import { supabase } from './db';
import type { User } from './types/database';

// Generic error handler
function handleSupabaseError(error: any) {
  if (error?.code === 'PGRST116') {
    return null; // Not found
  }
  throw error;
}

// User helpers
export const users = {
  async findByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error) return handleSupabaseError(error);
    return data as User | null;
  },

  async findById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return handleSupabaseError(error);
    return data as User | null;
  },

  async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data as User;
  },
};

// Student helpers
export const students = {
  async findById(id: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*, user:users(*), class:classes(*), section:sections(*)')
      .eq('id', id)
      .single();
    
    if (error) return handleSupabaseError(error);
    return data as any;
  },

  async findByUserId(userId: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*, user:users(*), class:classes(*), section:sections(*)')
      .eq('user_id', userId)
      .single();
    
    if (error) return handleSupabaseError(error);
    return data as any;
  },
};

// Teacher helpers
export const teachers = {
  async findByUserId(userId: string) {
    const { data, error } = await supabase
      .from('teachers')
      .select('*, user:users(*), school:schools(*)')
      .eq('user_id', userId)
      .single();
    
    if (error) return handleSupabaseError(error);
    return data as any;
  },
};

