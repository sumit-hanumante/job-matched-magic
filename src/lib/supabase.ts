
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tagvfszjeylodebvmtln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3Zmc3pqZXlsb2RlYnZtdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyNDU5NzMsImV4cCI6MjA1NTgyMTk3M30.MA35y4CZxelZtfDpRfXdk5bf8JeR7fMUSqVJcW6_gtE';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance of the Supabase client with explicit auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
  global: {
    headers: {
      'x-app-version': '1.0.0',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Initialize storage buckets if they don't exist yet
export const initializeStorage = async () => {
  try {
    // Check if we can access the resumes bucket
    await supabase.storage.getBucket('resumes');
    await supabase.storage.getBucket('temp-resumes');
    console.log('Storage buckets initialized');
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
  }
};

// Call this function when the app initializes
if (typeof window !== 'undefined') {
  initializeStorage();
}
