
import { supabase } from "@/lib/supabase";

// This is a utility script to create an admin user
// You can run this file directly or copy the code to the browser console

const createAdminUser = async () => {
  console.log("Checking for admin user...");
  
  try {
    // First check if user already exists
    const { data: existingUsers, error: searchError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', 'sumit@example.com')
      .maybeSingle();
      
    if (searchError) {
      console.error("Error checking for existing user:", searchError);
      return;
    }
    
    if (existingUsers) {
      console.log("Admin user already exists:", existingUsers);
      return;
    }
    
    // Create admin user
    const { data: adminUser, error: adminUserError } = await supabase.auth.signUp({
      email: "sumit@example.com",
      password: "123456",
      options: {
        data: {
          full_name: "Sumit Admin",
        },
      }
    });

    if (adminUserError) throw adminUserError;
    console.log("Admin user created:", adminUser);

    // In a production environment, you would typically have a separate function
    // to set user roles in a user_roles table, but for this example,
    // we'll mark the successful creation
    console.log("✅ Admin user created successfully!");
    console.log("Note: In a real application, you should set up a user_roles table and assign the admin role there.");
    console.log("For now, you can log in with sumit@example.com / 123456");
    
    return adminUser;

  } catch (error) {
    console.error("Error creating admin user:", error);
  }
};

// Export for use elsewhere, but don't run automatically
export { createAdminUser };
