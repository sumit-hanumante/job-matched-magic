
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Welcome to Job Matching</h1>
        <p className="text-xl text-gray-600">Find the perfect job match with AI-powered tools</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
          <Button asChild>
            <Link to="/profile">View Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
