
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { calculateSkillMatchScore, calculateLocationMatchScore, calculateCompanyMatchScore, calculateSalaryMatchScore } from "@/lib/jobMatcher";

// Add this function to handle job matching with better error handling for duplicates
export const useJobMatching = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  /**
   * Generates job matches for a given resume ID
   * @param resumeId The ID of the resume to match jobs for
   */
  const generateJobMatches = async (resumeId: string) => {
    if (!resumeId) return;
    
    setIsProcessing(true);
    console.log("Starting job matching process for resume", resumeId);
    
    try {
      // First, get the resume to access its skills and other data
      const { data: resume, error: resumeError } = await supabase
        .from("resumes")
        .select("extracted_skills, preferred_locations, preferred_companies, min_salary, max_salary")
        .eq("id", resumeId)
        .single();
      
      if (resumeError) throw resumeError;
      
      if (!resume || !resume.extracted_skills || resume.extracted_skills.length === 0) {
        console.log("Resume has no extracted skills to match against");
        toast({
          variant: "default", 
          title: "Job matching skipped",
          description: "Your resume doesn't have extracted skills for matching."
        });
        return;
      }
      
      console.log("Found resume with skills:", resume.extracted_skills.length);
      
      // Get all jobs to match against
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title, company, location, requirements, salary_min, salary_max");
      
      if (jobsError) throw jobsError;
      
      if (!jobs || !jobs.length) {
        console.log("No jobs found to match against");
        return;
      }
      
      console.log(`Found ${jobs.length} jobs to match against`);
      
      // Calculate match scores for each job
      const jobMatches = jobs.map(job => {
        // Calculate skill match
        const skillMatchScore = calculateSkillMatchScore(resume.extracted_skills, job.requirements || []);
        
        // Calculate location match
        const locationMatchScore = calculateLocationMatchScore(
          resume.preferred_locations || [],
          job.location
        );
        
        // Calculate company match
        const companyMatchScore = calculateCompanyMatchScore(
          resume.preferred_companies || [],
          job.company
        );
        
        // Calculate salary match - create a properly formatted job object with required properties
        const salaryMatchScore = calculateSalaryMatchScore(
          resume.min_salary,
          resume.max_salary,
          {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            description: "",  // Adding required properties with default values
            applyUrl: "",
            matchScore: 0,
            postedDate: "",
            source: "",
            salaryRange: `${job.salary_min || 0}-${job.salary_max || 0}`
          }
        );
        
        // Calculate overall match score (weighted average)
        const weights = {
          skill: 0.6,
          location: 0.15,
          company: 0.1,
          salary: 0.15
        };
        
        const matchScore = Math.round(
          skillMatchScore * weights.skill +
          locationMatchScore * weights.location +
          companyMatchScore * weights.company +
          salaryMatchScore * weights.salary
        );
        
        // Return the job match data
        return {
          user_id: supabase.auth.getUser().then(data => data.data.user?.id) || '',
          job_id: job.id,
          match_score: matchScore,
          skill_match_score: skillMatchScore,
          location_match_score: locationMatchScore,
          company_match_score: companyMatchScore,
          salary_match_score: salaryMatchScore,
          is_shown: false
        };
      });
      
      // Sort matches by score (highest first)
      const sortedMatches = jobMatches.sort((a, b) => b.match_score - a.match_score);
      
      // Get top matches and save them
      const topMatches = sortedMatches.slice(0, 20);
      
      // For each match, try to insert or update if it already exists
      for (const match of topMatches) {
        try {
          const { error: insertError } = await supabase
            .from("job_matches")
            .upsert({
              user_id: await supabase.auth.getUser().then(data => data.data.user?.id),
              job_id: match.job_id,
              match_score: match.match_score,
              skill_match_score: match.skill_match_score,
              location_match_score: match.location_match_score,
              company_match_score: match.company_match_score,
              salary_match_score: match.salary_match_score,
              is_shown: false
            }, {
              onConflict: 'user_id,job_id',
              ignoreDuplicates: false
            });
          
          if (insertError && insertError.code !== '23505') { // Ignore duplicate key error
            console.error("Error saving job match:", insertError);
          }
        } catch (matchError) {
          // Log the error but continue with the next match
          console.error("Error processing job match:", matchError);
        }
      }
      
      console.log(`Successfully saved ${topMatches.length} job matches`);
      
      toast({
        title: "Job matches created",
        description: `Found ${topMatches.length} potential job matches.`,
      });
      
    } catch (error) {
      console.error("Error in job matching process:", error);
      toast({
        variant: "destructive",
        title: "Job matching failed",
        description: error instanceof Error ? error.message : "Failed to create job matches",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, generateJobMatches };
};
