
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Github, Linkedin, Globe, MapPin, Briefcase, Award, UserCheck, Calendar } from "lucide-react";
import JobMatches from '@/components/JobMatches';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface UserPreferences {
  job_alerts: boolean;
  preferred_job_types: string[];
  preferred_locations: string[];
  job_search_status: string;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
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
          setPreferences(data);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
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

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Format date for better display
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  }) : 'N/A';

  const statusColors = {
    actively_looking: "bg-emerald-500",
    open_to_offers: "bg-amber-500",
    not_looking: "bg-slate-500"
  };

  const statusColorClass = preferences?.job_search_status 
    ? statusColors[preferences.job_search_status as keyof typeof statusColors] 
    : "bg-slate-500";

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-73px)] pb-12">
      {/* Hero section with profile summary */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 pt-12 pb-16 mb-6">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              <AvatarFallback className="bg-primary text-white text-2xl">
                {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">
                    {user.user_metadata?.full_name || 'User'}
                  </h1>
                  <p className="text-slate-600">{user.email}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColorClass}`} />
                    <span className="text-sm font-medium">
                      {preferences?.job_search_status === 'actively_looking' && 'Actively Looking'}
                      {preferences?.job_search_status === 'open_to_offers' && 'Open to Opportunities'}
                      {preferences?.job_search_status === 'not_looking' && 'Not Looking'}
                    </span>
                  </div>
                </div>
                
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="flex gap-2">
                      <UserCheck className="h-4 w-4" /> Update Status
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Job Search Status</SheetTitle>
                      <SheetDescription>
                        Update your current job search status
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      <div className="space-y-2">
                        <Label>Job Search Status</Label>
                        <Select
                          value={preferences?.job_search_status}
                          onValueChange={(value) => updatePreferences({ job_search_status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="actively_looking">Actively Looking</SelectItem>
                            <SelectItem value="open_to_offers">Open to Opportunities</SelectItem>
                            <SelectItem value="not_looking">Not Looking</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="job-alerts"
                            checked={preferences?.job_alerts}
                            onCheckedChange={(checked) => 
                              updatePreferences({ job_alerts: checked === true })
                            }
                          />
                          <Label htmlFor="job-alerts">Receive job match notifications</Label>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="bg-white/80 flex items-center gap-1.5 text-slate-600">
                  <Calendar className="h-3 w-3" /> Member since {memberSince}
                </Badge>
                {preferences?.preferred_job_types?.map((type) => (
                  <Badge key={type} variant="secondary" className="bg-white/80">
                    {type.replace(/_/g, ' ')}
                  </Badge>
                ))}
                {preferences?.preferred_locations?.map((location) => (
                  <Badge key={location} variant="secondary" className="bg-white/80">
                    {location.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar with professional profiles */}
          <div className="space-y-6">
            <Card className="overflow-hidden border-0 shadow-md">
              <CardHeader className="bg-secondary/30 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Professional Profiles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  <a 
                    href={preferences?.linkedin_url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0077B5]/10 flex items-center justify-center">
                      <Linkedin className="w-5 h-5 text-[#0077B5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">LinkedIn</h3>
                      <p className="text-xs text-slate-500 truncate">
                        {preferences?.linkedin_url || 'Not connected'}
                      </p>
                    </div>
                  </a>
                  
                  <a 
                    href={preferences?.github_url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#333]/10 flex items-center justify-center">
                      <Github className="w-5 h-5 text-[#333]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">GitHub</h3>
                      <p className="text-xs text-slate-500 truncate">
                        {preferences?.github_url || 'Not connected'}
                      </p>
                    </div>
                  </a>
                  
                  <a 
                    href={preferences?.portfolio_url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">Portfolio</h3>
                      <p className="text-xs text-slate-500 truncate">
                        {preferences?.portfolio_url || 'Not added'}
                      </p>
                    </div>
                  </a>
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/20 p-3">
                <Button variant="outline" size="sm" className="w-full" onClick={() => {
                  const editSheet = document.getElementById('edit-profiles-trigger');
                  if (editSheet) (editSheet as HTMLButtonElement).click();
                }}>
                  Edit Profiles
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="overflow-hidden border-0 shadow-md">
              <CardHeader className="bg-secondary/30 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Work Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Field of Work</Label>
                  <div className="font-medium">
                    {preferences?.preferred_job_types?.[0]?.replace(/_/g, ' ') || 'Not set'}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Location Preference</Label>
                  <div className="font-medium">
                    {preferences?.preferred_locations?.[0]?.replace(/_/g, ' ') || 'Not set'}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/20 p-3">
                <Button variant="outline" size="sm" className="w-full" onClick={() => {
                  const editSheet = document.getElementById('edit-preferences-trigger');
                  if (editSheet) (editSheet as HTMLButtonElement).click();
                }}>
                  Edit Preferences
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="bg-secondary/30 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Job Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JobMatches />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Edit Profiles Sheet */}
      <Sheet>
        <SheetTrigger id="edit-profiles-trigger" className="hidden" />
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Professional Profiles</SheetTitle>
            <SheetDescription>
              Update your professional profile links
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-[#0077B5]" />
                <Label>LinkedIn Profile</Label>
              </div>
              <Input
                placeholder="https://linkedin.com/in/..."
                value={preferences?.linkedin_url || ''}
                onChange={(e) => updatePreferences({ linkedin_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                <Label>GitHub Profile</Label>
              </div>
              <Input
                placeholder="https://github.com/..."
                value={preferences?.github_url || ''}
                onChange={(e) => updatePreferences({ github_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <Label>Portfolio Website</Label>
              </div>
              <Input
                placeholder="https://..."
                value={preferences?.portfolio_url || ''}
                onChange={(e) => updatePreferences({ portfolio_url: e.target.value })}
              />
            </div>
            
            <div className="pt-4">
              <Button className="w-full">Save Changes</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Edit Preferences Sheet */}
      <Sheet>
        <SheetTrigger id="edit-preferences-trigger" className="hidden" />
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Work Preferences</SheetTitle>
            <SheetDescription>
              Update your job search and work preferences
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label>Field of Work</Label>
              <Select
                value={preferences?.preferred_job_types?.[0]}
                onValueChange={(value) => updatePreferences({ preferred_job_types: [value] })}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Location Preference</Label>
              <Select
                value={preferences?.preferred_locations?.[0]}
                onValueChange={(value) => updatePreferences({ preferred_locations: [value] })}
              >
                <SelectTrigger>
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
            
            <div className="pt-4">
              <Button className="w-full">Save Changes</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Profile;
