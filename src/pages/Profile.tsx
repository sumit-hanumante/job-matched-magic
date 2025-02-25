
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Github, Linkedin, Globe, UserCircle } from "lucide-react";

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
          .single();

        if (error) throw error;
        setPreferences(data);
      } catch (error) {
        console.error('Error fetching preferences:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user, navigate]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  if (!user || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <UserCircle className="w-16 h-16 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{user.user_metadata?.full_name || user.email}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Tabs defaultValue="preferences">
          <TabsList className="mb-6">
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
          </TabsList>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Job Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Job Search Status</Label>
                    <Select
                      value={preferences?.job_search_status}
                      onValueChange={(value) => updatePreferences({ job_search_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="actively_looking">Actively Looking</SelectItem>
                        <SelectItem value="open_to_offers">Open to Offers</SelectItem>
                        <SelectItem value="not_looking">Not Looking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Preferred Job Types</Label>
                    <Select
                      value={preferences?.preferred_job_types?.[0]}
                      onValueChange={(value) => updatePreferences({ preferred_job_types: [value] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="software developer">Software Developer</SelectItem>
                        <SelectItem value="medical coding">Medical Coding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Preferred Location</Label>
                    <Select
                      value={preferences?.preferred_locations?.[0]}
                      onValueChange={(value) => updatePreferences({ preferred_locations: [value] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">Onsite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional">
            <Card>
              <CardHeader>
                <CardTitle>Professional Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <Label>LinkedIn Profile</Label>
                      <Input
                        placeholder="https://linkedin.com/in/..."
                        value={preferences?.linkedin_url || ''}
                        onChange={(e) => updatePreferences({ linkedin_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Github className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <Label>GitHub Profile</Label>
                      <Input
                        placeholder="https://github.com/..."
                        value={preferences?.github_url || ''}
                        onChange={(e) => updatePreferences({ github_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <Label>Portfolio Website</Label>
                      <Input
                        placeholder="https://..."
                        value={preferences?.portfolio_url || ''}
                        onChange={(e) => updatePreferences({ portfolio_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
