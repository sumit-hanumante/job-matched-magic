
import { supabase } from "@/lib/supabase";

// This is a utility script to create test users
// You can run this file directly or copy the code to the browser console

const createTestUsers = async () => {
  console.log("Creating test users...");
  
  try {
    // Create super user
    const { data: superUser, error: superUserError } = await supabase.auth.signUp({
      email: "sumit@example.com",
      password: "123",
      options: {
        data: {
          full_name: "Sumit Admin",
        },
      }
    });

    if (superUserError) throw superUserError;
    console.log("Super user created:", superUser);

    // Create normal user
    const { data: normalUser, error: normalUserError } = await supabase.auth.signUp({
      email: "test@example.com",
      password: "123",
      options: {
        data: {
          full_name: "Test User",
        },
      }
    });
    
    if (normalUserError) throw normalUserError;
    console.log("Normal user created:", normalUser);

    console.log("✅ Test users created successfully!");
    console.log("Note: You may need to confirm their emails in the Supabase dashboard.");
  } catch (error) {
    console.error("Error creating test users:", error);
  }
};

// Run the function
createTestUsers();

// Export for potential import elsewhere
export { createTestUsers };
