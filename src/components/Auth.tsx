
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, EyeIcon, EyeOffIcon, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface AuthProps {
  onSuccess?: () => void;
  defaultEmail?: string;
  defaultName?: string;
}

const Auth = ({ onSuccess, defaultEmail = "", defaultName = "" }: AuthProps) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(defaultName);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("signin");
  const { toast } = useToast();

  useEffect(() => {
    setEmail(defaultEmail);
    setFullName(defaultName);
  }, [defaultEmail, defaultName]);

  useEffect(() => {
    // Calculate password strength
    const calculateStrength = (pass: string): number => {
      if (!pass) return 0;
      
      let score = 0;
      
      // Length check
      if (pass.length >= 6) score += 20;
      if (pass.length >= 10) score += 20;
      
      // Complexity checks
      if (/[A-Z]/.test(pass)) score += 20; // Has uppercase
      if (/[0-9]/.test(pass)) score += 20; // Has number
      if (/[^A-Za-z0-9]/.test(pass)) score += 20; // Has special char
      
      return score;
    };
    
    setPasswordStrength(calculateStrength(password));
  }, [password]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrengthLabel = () => {
    if (!password) return "";
    if (passwordStrength < 40) return "Weak";
    if (passwordStrength < 80) return "Moderate";
    return "Strong";
  };

  const getPasswordStrengthColor = () => {
    if (!password) return "bg-gray-200";
    if (passwordStrength < 40) return "bg-red-500";
    if (passwordStrength < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address",
      });
      return;
    }

    if (!fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter your full name",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive", 
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
      });
      return;
    }

    if (passwordStrength < 40) {
      toast({
        variant: "default",
        title: "Weak Password",
        description: "Consider using a stronger password for better security",
      });
    }

    try {
      setLoading(true);
      
      console.log("Starting signup process");
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;
      
      console.log("Signup successful", data);
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Signup error details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address",
      });
      return;
    }

    try {
      setLoading(true);
      console.log("Starting signin process");
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      console.log("Signin successful", data);
      
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Signin error details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card rounded-xl shadow-md border p-6">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="w-full"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="w-full"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signup-password" className="text-sm font-medium">
                    Password
                  </Label>
                  {password && (
                    <span className={`text-xs ${
                      passwordStrength < 40 ? 'text-red-500' : 
                      passwordStrength < 80 ? 'text-yellow-500' : 
                      'text-green-500'
                    }`}>
                      {getPasswordStrengthLabel()}
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                {password && (
                  <>
                    <Progress 
                      value={passwordStrength} 
                      className={`h-1 ${getPasswordStrengthColor()}`} 
                    />
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div className="flex items-center gap-1">
                        {password.length >= 6 ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>At least 6 characters</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/[A-Z]/.test(password) ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Uppercase letter</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/[0-9]/.test(password) ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Number</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/[^A-Za-z0-9]/.test(password) ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span>Special character</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing up...' : 'Sign up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
