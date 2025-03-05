
# JobMatch Project Structure Documentation

## Current File Structure and Functionality

### Core Application Files
- `src/App.tsx`: Main application component with routing setup
  - Routes: /, /profile, and 404 handling
  - Integrates QueryClient, AuthProvider, and TooltipProvider

### Pages
1. `src/pages/Index.tsx`: Landing page
   - Main entry point for job search and resume upload
   - Integrates job listing and resume upload components

2. `src/pages/Profile.tsx`: User profile management
   - Job search preferences
   - Professional profile links (LinkedIn, GitHub, Portfolio)
   - Work preferences (job types, locations)

3. `src/pages/NotFound.tsx`: 404 error page

### Components

#### Authentication
- `src/components/AuthProvider.tsx`: Authentication context provider
  - Manages user session state
  - Provides auth context to the application
  - Integrates with Supabase auth

- `src/components/Auth.tsx`: Authentication UI component
  - Handles sign in/sign up flows
  - Email/password authentication

#### Job-Related Components
- `src/components/JobList.tsx`: Displays list of jobs
  - Job filtering capabilities
  - Pagination handling
  - Integration with job matching system

- `src/components/JobCard.tsx`: Individual job display
  - Job details presentation
  - Apply button functionality
  - Match score display

- `src/components/JobFilters.tsx`: Job filtering interface
  - Source selection
  - Job type filtering
  - Refresh and fetch controls

- `src/components/JobListHeader.tsx`: Job list metadata display
  - Job count
  - Source information
  - Last updated timestamp

#### Resume Components
- `src/components/resume/ResumeUpload.tsx`: Resume upload functionality
  - File upload handling
  - Integration with Supabase storage
  - Status management

- `src/components/resume/ResumeDropzone.tsx`: Drag-and-drop interface
  - File drop handling
  - Upload state management
  - Visual feedback

- `src/components/resume/ResumeDisplay.tsx`: Displays current resume
  - File information
  - Upload timestamp
  - Status indication

- `src/components/resume/ResumeUploadForm.tsx`: Upload confirmation form
  - File details display
  - Upload trigger

### UI Components
- Multiple shadcn/ui components in `src/components/ui/*`
  - Button, Card, Input, Label, Select, Toast, etc.
  - Consistent styling and behavior

### Backend Integration

#### Supabase Tables
1. `job_matches`: Stores job-user match data
   - Match scores
   - Viewing status
   - Created/viewed timestamps

2. `jobs`: Job listings storage
   - Job details
   - Salary information
   - Requirements
   - Source tracking

3. `resumes`: Resume management
   - File storage
   - Extracted information
   - Status tracking

4. `user_preferences`: User settings storage
   - Job preferences
   - Location preferences
   - Professional profiles

#### Edge Functions
- `parse-resume`: Resume parsing functionality
- `scrape-jobs`: Job data collection
- `cleanup-jobs`: Job database maintenance

### Job Matching System (Updated June 14, 2024)
- Working on branch: `feature/improved-job-matching`
- Implemented vector-based job matching using Supabase stored procedures
- Added comprehensive job matching logic in `src/lib/jobMatcher.ts`
- Created UI components to display personalized job matches
- Enhanced resume parsing to extract data in a format optimized for job matching

## Current Testing Status

### Tested Functionality
1. Authentication:
   - ✅ User sign up
   - ✅ User sign in
   - ✅ Session management

2. Resume Management:
   - ✅ File upload to Supabase storage
   - ✅ Database record creation
   - ✅ Basic file type validation
   - ✅ UI feedback for upload status

3. Job Display:
   - ✅ Job listing display
   - ✅ Basic filtering
   - ✅ Source selection

### Pending Implementation/Testing
1. Resume Processing:
   - ❌ Detailed content extraction
   - ❌ Skills analysis
   - ❌ Experience parsing

2. Job Processing:
   - ❌ Structured data extraction from descriptions
   - ❌ Salary standardization
   - ❌ Requirements categorization

3. Matching System:
   - ❌ Advanced skill matching
   - ❌ Salary range matching
   - ❌ Location preference matching

## Security Implementation
- ✅ RLS policies for resume access
- ✅ Storage bucket security
- ✅ Authentication flow
- ✅ Protected routes

## Next Steps
1. Implement job data extraction system
2. Enhance resume parsing capabilities
3. Develop advanced matching algorithm
4. Add comprehensive testing suite
5. Implement monitoring and analytics
