import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, password, full_name, role, user_id } = await req.json();

    if (!password && !user_id) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe est requis pour un nouvel utilisateur' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedEmail = email.toLowerCase().trim();

    if (user_id) {
      const updateData: any = {
        email: normalizedEmail,
        full_name,
        role
      };

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user_id);

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('users_email_key')) {
          errorMessage = 'Cet email est déjà utilisé par un autre utilisateur';
        }
        return new Response(
          JSON.stringify({ error: errorMessage }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Utilisateur modifié avec succès' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Un utilisateur avec cet email existe déjà' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const { error } = await supabase
        .from('users')
        .insert({
          email: normalizedEmail,
          password: hashedPassword,
          full_name,
          role: role || 'client'
        });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('users_email_key')) {
          errorMessage = 'Un utilisateur avec cet email existe déjà';
        }
        return new Response(
          JSON.stringify({ error: errorMessage }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Utilisateur créé avec succès' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Create user error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur serveur' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});