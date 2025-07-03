import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, File, AlertTriangle, Check } from 'lucide-react';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { useToast } from '@/hooks/use-toast';

interface SecureFileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeText?: string;
  className?: string;
}

export const SecureFileUpload = ({ 
  onFileSelect, 
  accept = ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls",
  maxSizeText = "10MB",
  className = "" 
}: SecureFileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const { validateFileUpload, logSecurityEvent } = useEnhancedSecurity();
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setIsValidating(true);
    setValidationErrors([]);

    try {
      // Validate file using enhanced security
      const validation = validateFileUpload(file);
      
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        
        // Log security event for invalid file upload attempt
        await logSecurityEvent('invalid_file_upload', 'medium', {
          filename: file.name,
          fileSize: file.size,
          fileType: file.type,
          errors: validation.errors
        });
        
        toast({
          title: "File validation failed",
          description: `File "${file.name}" does not meet security requirements.`,
          variant: "destructive",
        });
        
        return;
      }

      // File is valid, proceed
      onFileSelect(file);
      
      toast({
        title: "File validated",
        description: `File "${file.name}" passed security checks.`,
      });

    } catch (error: any) {
      console.error('File validation error:', error);
      setValidationErrors(['File validation failed']);
      
      await logSecurityEvent('file_validation_error', 'high', {
        filename: file.name,
        error: error.message
      });
      
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className={className}>
      <Card className={`transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
        <CardContent className="p-6">
          <div
            className="flex flex-col items-center justify-center py-8 text-center"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className={`p-3 rounded-full mb-4 ${
              dragActive ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600'
            }`}>
              <Upload className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-medium mb-2">Secure File Upload</h3>
            <p className="text-gray-500 mb-4">
              Drop files here or click to browse
            </p>
            
            <Button
              variant="outline"
              onClick={() => document.getElementById('secure-file-input')?.click()}
              disabled={isValidating}
              className="mb-4"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                  Validating...
                </>
              ) : (
                <>
                  <File className="h-4 w-4 mr-2" />
                  Choose File
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-400">
              Max size: {maxSizeText} • Allowed: Images, PDFs, Documents
            </p>
          </div>
          
          <input
            id="secure-file-input"
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Security Validation Results */}
      {validationErrors.length > 0 && (
        <Alert className="mt-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-2">Security Validation Failed:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Security Information */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Check className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Enhanced Security Features:</div>
            <ul className="space-y-1 text-xs">
              <li>• File type validation and sanitization</li>
              <li>• Size limit enforcement (10MB max)</li>
              <li>• Security event logging</li>
              <li>• Malicious content detection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};