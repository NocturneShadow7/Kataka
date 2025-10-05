import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'client';
  full_name: string;
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Auth result:', { authError, user: authData?.user?.id });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return { user: null, error: 'Identifiants invalides' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    console.log('Profile result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return { user: null, error: `Profil utilisateur introuvable: ${profileError?.message || 'Aucun profil'}` };
    }

    const user: User = {
      id: authData.user.id,
      email: authData.user.email!,
      role: profile.role as 'admin' | 'client',
      full_name: profile.full_name,
    };

    return { user, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, error: 'Une erreur est survenue lors de la connexion' };
  }
}
