
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Github, Linkedin, Globe, MapPin, Briefcase, GraduationCap, User, Tag, Calendar, Award } from "lucide-react";

interface UserPreferences {
  job_alerts: boolean;
  preferred_job_types: string[];
  preferred_locations: string[];
  job_search_status: string;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
}

interface ResumeData {
  id: string;
  file_name: string;
  extracted_skills: string[];
  experience: string;
  preferred_locations: string[];
  preferred_companies: string[];
  created_at: string;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user preferences
        const { data: prefsData, error: prefsError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (prefsError) throw prefsError;
        
        if (!prefsData) {
          const defaultPreferences: Partial<UserPreferences> = {
            job_alerts: true,
            preferred_job_types: ['software_development'],
            preferred_locations: ['remote'],
            job_search_status: 'actively_looking'
          };

          const { data: newData, error: insertError } = await supabase
            .from('user_preferences')
            .insert([{ id: user.id, ...defaultPreferences }])
            .select()
            .single();

          if (insertError) throw insertError;
          setPreferences(newData);
        } else {
          setPreferences(prefsData);
        }

        // Fetch resume data
        const { data: resumeData, error: resumeError } = await supabase
          .from('resumes')
          .select('id, file_name, extracted_skills, experience, preferred_locations, preferred_companies, created_at')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (resumeError) throw resumeError;
        setResumeData(resumeData);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Extract professional title from experience (this is a simple implementation)
  const extractProfessionalTitle = () => {
    if (!resumeData?.experience) return '';
    
    // Look for common job title patterns (this is a simplified approach)
    const titleRegex = /(software engineer|developer|designer|manager|architect|consultant|analyst|specialist|director)/i;
    const match = resumeData.experience.match(titleRegex);
    return match ? match[0].charAt(0).toUpperCase() + match[0].slice(1) : '';
  };

  // Extract summary from experience (simplified)
  const extractSummary = () => {
    if (!resumeData?.experience) return '';
    
    // Get first 150 characters as a simple summary
    return resumeData.experience.substring(0, 150) + (resumeData.experience.length > 150 ? '...' : '');
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const professionalTitle = extractProfessionalTitle();
  const summary = extractSummary();

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 md:py-8 animate-fade-in">
      <div className="flex flex-col items-center sm:flex-row sm:items-center gap-4 mb-6 md:mb-8">
        <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-primary/10 flex items-center justify-center shadow-sm">
          <span className="text-2xl md:text-3xl font-semibold text-primary">
            {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
          </span>
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-xl md:text-2xl font-bold">{user.user_metadata?.full_name || 'User'}</h1>
          {professionalTitle && (
            <p className="text-base md:text-lg text-primary font-medium mt-1">{professionalTitle}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </div>
      </div>

      {summary && (
        <Card className="shadow-card overflow-hidden border-slate-200 mb-4 md:mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Professional Summary</h2>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">{summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 md:space-y-6">
        <Card className="shadow-card overflow-hidden border-slate-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Job Search Status</h2>
            </div>
            <Select
              value={preferences?.job_search_status}
              onValueChange={(value) => updatePreferences({ job_search_status: value })}
            >
              <SelectTrigger className="w-full text-base py-2.5">
                <SelectValue placeholder="Select your job search status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actively_looking">Actively Looking</SelectItem>
                <SelectItem value="open_to_offers">Open to Opportunities</SelectItem>
                <SelectItem value="not_looking">Not Looking</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {resumeData?.extracted_skills && resumeData.extracted_skills.length > 0 && (
          <Card className="shadow-card overflow-hidden border-slate-200">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Core Skills</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {resumeData.extracted_skills.map((skill, index) => (
                  <div key={index} className="bg-primary/10 text-primary font-medium px-3 py-1 rounded-full text-sm">
                    {skill}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card overflow-hidden border-slate-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Work Preferences</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Field of Work</Label>
                <Select
                  value={preferences?.preferred_job_types?.[0]}
                  onValueChange={(value) => updatePreferences({ preferred_job_types: [value] })}
                >
                  <SelectTrigger className="w-full text-base py-2.5">
                    <SelectValue placeholder="Select your field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software_development">Software Development</SelectItem>
                    <SelectItem value="data_science">Data Science</SelectItem>
                    <SelectItem value="devops">DevOps</SelectItem>
                    <SelectItem value="product_management">Product Management</SelectItem>
                    <SelectItem value="ui_ux_design">UI/UX Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">Location Preference</Label>
                <Select
                  value={resumeData?.preferred_locations?.[0] || preferences?.preferred_locations?.[0]}
                  onValueChange={(value) => updatePreferences({ preferred_locations: [value] })}
                >
                  <SelectTrigger className="w-full text-base py-2.5">
                    <SelectValue placeholder="Select location preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {resumeData && (
          <Card className="shadow-card overflow-hidden border-slate-200">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Resume Information</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Resume File:</span>
                  <span className="font-medium">{resumeData.file_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Uploaded on:</span>
                  <span className="font-medium">{formatDate(resumeData.created_at)}</span>
                </div>
                {resumeData.preferred_companies && resumeData.preferred_companies.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Preferred Companies:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {resumeData.preferred_companies.map((company, index) => (
                        <span key={index} className="bg-secondary/60 px-2 py-1 rounded text-xs">
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card overflow-hidden border-slate-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Professional Profiles</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 sm:w-40">
                  <Linkedin className="w-5 h-5 text-primary" />
                  <Label className="font-medium">LinkedIn</Label>
                </div>
                <div className="flex-1">
                  <Input
                    className="w-full text-base py-2.5"
                    placeholder="https://linkedin.com/in/..."
                    value={preferences?.linkedin_url || ''}
                    onChange={(e) => updatePreferences({ linkedin_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 sm:w-40">
                  <Github className="w-5 h-5 text-primary" />
                  <Label className="font-medium">GitHub</Label>
                </div>
                <div className="flex-1">
                  <Input
                    className="w-full text-base py-2.5"
                    placeholder="https://github.com/..."
                    value={preferences?.github_url || ''}
                    onChange={(e) => updatePreferences({ github_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 sm:w-40">
                  <Globe className="w-5 h-5 text-primary" />
                  <Label className="font-medium">Portfolio</Label>
                </div>
                <div className="flex-1">
                  <Input
                    className="w-full text-base py-2.5"
                    placeholder="https://..."
                    value={preferences?.portfolio_url || ''}
                    onChange={(e) => updatePreferences({ portfolio_url: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
