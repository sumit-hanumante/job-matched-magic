
export interface ResumeData {
  id?: string;
  filename?: string;
  status?: string;
  uploaded_at?: string;
  file_path?: string;
  is_primary?: boolean;
  total_years_experience?: number | null;
  possible_job_titles?: string[] | null;
}

export interface ResumeFile {
  file: File;
  isUploading: boolean;
  onUpload: () => void;
  onCancel: () => void;
  isAuthenticated: boolean;
  uploadStatus?: string;
}

export interface ResumeDropzoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasExistingResume: boolean;
  isAuthenticated: boolean;
}
