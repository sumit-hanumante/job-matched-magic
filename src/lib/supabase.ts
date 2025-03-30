
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tagvfszjeylodebvmtln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3Zmc3pqZXlsb2RlYnZtdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyNDU5NzMsImV4cCI6MjA1NTgyMTk3M30.MA35y4CZxelZtfDpRfXdk5bf8JeR7fMUSqVJcW6_gtE';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance of the Supabase client with simpler configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

console.log('Supabase client initialized with URL:', supabaseUrl);

// Initialize storage buckets if they don't exist yet
export const initializeStorage = async () => {
  try {
    console.log('Checking storage buckets...');
    
    try {
      // Check if we can access the resumes bucket
      await supabase.storage.getBucket('resumes');
      console.log('Resumes bucket exists');
    } catch (error) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        // Create the buckets if they don't exist
        console.log('Creating resumes bucket...');
        await supabase.storage.createBucket('resumes', {
          public: false,
          fileSizeLimit: 10485760 // 10MB
        });
      } else {
        throw error;
      }
    }
    
    try {
      // Check if we can access the temp-resumes bucket
      await supabase.storage.getBucket('temp-resumes');
      console.log('Temp-resumes bucket exists');
    } catch (error) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        // Create the buckets if they don't exist
        console.log('Creating temp-resumes bucket...');
        await supabase.storage.createBucket('temp-resumes', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });
      } else {
        throw error;
      }
    }
    
    console.log('Storage buckets initialized successfully');
    
    // Also check if we can invoke functions to verify setup
    try {
      await supabase.functions.invoke('parse-resume', {
        method: 'POST',
        body: { test: true }
      });
      console.log('Successfully connected to Edge Functions API');
    } catch (funcError) {
      console.warn('Edge Functions check failed:', funcError);
      // This is just a check, not critical for operation
    }
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
  }
};

// Call this function when the app initializes
if (typeof window !== 'undefined') {
  console.log('Initializing storage in browser environment');
  initializeStorage();
}
