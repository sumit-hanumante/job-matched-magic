
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
    
    // Check and create resumes bucket
    try {
      console.log('Checking if resumes bucket exists...');
      const { data: resumesBucket, error: resumesError } = await supabase.storage.getBucket('resumes');
      
      if (resumesError) {
        if (resumesError.message && resumesError.message.includes('does not exist')) {
          console.log('Creating resumes bucket...');
          const { data: createData, error: createError } = await supabase.storage.createBucket('resumes', {
            public: false,
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) {
            console.error('Failed to create resumes bucket:', createError);
            throw createError;
          }
          console.log('Successfully created resumes bucket:', createData);
        } else {
          console.error('Error checking resumes bucket:', resumesError);
          throw resumesError;
        }
      } else {
        console.log('Resumes bucket exists:', resumesBucket);
      }
    } catch (error: any) {
      // Handle error cases carefully
      if (error.message && error.message.includes('does not exist')) {
        console.log('Creating resumes bucket (caught in catch block)...');
        try {
          const { data, error: createError } = await supabase.storage.createBucket('resumes', {
            public: false,
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) throw createError;
          console.log('Successfully created resumes bucket in catch block:', data);
        } catch (createError) {
          console.error('Failed to create resumes bucket in catch block:', createError);
          // Continue to next bucket even if this one fails
        }
      } else {
        console.error('Unexpected error with resumes bucket:', error);
        // Continue to next bucket
      }
    }
    
    // Check and create temp-resumes bucket
    try {
      console.log('Checking if temp-resumes bucket exists...');
      const { data: tempBucket, error: tempError } = await supabase.storage.getBucket('temp-resumes');
      
      if (tempError) {
        if (tempError.message && tempError.message.includes('does not exist')) {
          console.log('Creating temp-resumes bucket...');
          const { data: createData, error: createError } = await supabase.storage.createBucket('temp-resumes', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) {
            console.error('Failed to create temp-resumes bucket:', createError);
            throw createError;
          }
          console.log('Successfully created temp-resumes bucket:', createData);
        } else {
          console.error('Error checking temp-resumes bucket:', tempError);
          throw tempError;
        }
      } else {
        console.log('Temp-resumes bucket exists:', tempBucket);
      }
    } catch (error: any) {
      // Handle error cases carefully
      if (error.message && error.message.includes('does not exist')) {
        console.log('Creating temp-resumes bucket (caught in catch block)...');
        try {
          const { data, error: createError } = await supabase.storage.createBucket('temp-resumes', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) throw createError;
          console.log('Successfully created temp-resumes bucket in catch block:', data);
        } catch (createError) {
          console.error('Failed to create temp-resumes bucket in catch block:', createError);
        }
      } else {
        console.error('Unexpected error with temp-resumes bucket:', error);
      }
    }
    
    console.log('Storage buckets initialized successfully');
    
    // Also check if we can invoke functions to verify setup
    try {
      console.log('Testing edge function connectivity...');
      const { data, error } = await supabase.functions.invoke('parse-resume', {
        method: 'POST',
        body: { test: true }
      });
      
      if (error) {
        console.warn('Edge Functions check failed:', error);
      } else {
        console.log('Successfully connected to Edge Functions API');
      }
    } catch (funcError) {
      console.warn('Edge Functions check failed with exception:', funcError);
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
