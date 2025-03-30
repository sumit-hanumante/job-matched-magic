
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { action } = await req.json();

    if (action === 'cleanup-and-create') {
      console.log('Starting user cleanup process...');
      
      // Get all users
      const { data: users, error: getUsersError } = await supabase.auth.admin.listUsers();
      
      if (getUsersError) throw getUsersError;
      console.log(`Found ${users.users.length} users`);
      
      // Delete all users
      for (const user of users.users) {
        console.log(`Deleting user: ${user.email}`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Error deleting user ${user.email}:`, deleteError.message);
        }
      }
      
      console.log('All users deleted, creating test users...');
      
      // Create super user
      const { data: superUser, error: superUserError } = await supabase.auth.admin.createUser({
        email: "sumit@example.com",
        password: "123",
        email_confirm: true,
        user_metadata: {
          full_name: "Sumit Admin",
        }
      });

      if (superUserError) throw superUserError;
      console.log("Super user created:", superUser);

      // Create normal user
      const { data: normalUser, error: normalUserError } = await supabase.auth.admin.createUser({
        email: "test@example.com",
        password: "123",
        email_confirm: true,
        user_metadata: {
          full_name: "Test User",
        }
      });
      
      if (normalUserError) throw normalUserError;
      console.log("Normal user created:", normalUser);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Users deleted and test users created successfully",
          superUser,
          normalUser
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Error in manage-users function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
