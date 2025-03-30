
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, RefreshCw, Clock } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';

interface ResumeDisplayProps {
  filename: string;
  uploadedAt: string;
  status: string;
  onUpdateClick?: () => void;
  isPrimary?: boolean;
  totalYearsExperience?: number | null;
  possibleJobTitles?: string[] | null;
}

const ResumeDisplay = ({ 
  filename, 
  uploadedAt, 
  status,
  onUpdateClick,
  isPrimary = false,
  totalYearsExperience,
  possibleJobTitles
}: ResumeDisplayProps) => {
  const isMobile = useIsMobile();

  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-medium">Current Resume</CardTitle>
          </div>
          {isPrimary && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Primary
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="space-y-3">
          <div>
            <p className="font-medium truncate text-slate-800" title={filename}>
              {filename}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-600">
              <span className="flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {uploadedAt}
              </span>
              
              <span className="flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {totalYearsExperience ? `${totalYearsExperience} ${totalYearsExperience === 1 ? 'year' : 'years'} experience` : 'Experience not available'}
              </span>
            </div>
          </div>
          
          {status === "parsed" || status === "processed" ? (
            <div className="pt-1">
              <p className="text-xs font-medium text-slate-700 mb-1.5">Potential job titles:</p>
              <div className="flex flex-wrap gap-1.5">
                {possibleJobTitles && possibleJobTitles.length > 0 ? (
                  possibleJobTitles.slice(0, isMobile ? 3 : 5).map((title, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="bg-blue-50 border-blue-100 text-blue-700 text-[10px] py-0 px-2"
                    >
                      {title}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No job titles available</span>
                )}
                {possibleJobTitles && possibleJobTitles.length > (isMobile ? 3 : 5) && (
                  <Badge 
                    variant="outline" 
                    className="bg-slate-50 border-slate-100 text-slate-600 text-[10px] py-0 px-2"
                  >
                    +{possibleJobTitles.length - (isMobile ? 3 : 5)} more
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div>
              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                {status === "uploaded" ? "Processing" : status}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          onClick={onUpdateClick} 
          variant="outline" 
          size="sm" 
          className="text-xs h-8 border-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Update Resume
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ResumeDisplay;
