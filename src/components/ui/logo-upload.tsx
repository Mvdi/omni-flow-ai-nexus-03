
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, RotateCcw } from 'lucide-react';

interface LogoUploadProps {
  currentLogo?: string;
  onLogoChange: (logoUrl: string | null) => void;
  className?: string;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({ 
  currentLogo, 
  onLogoChange, 
  className = "" 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vælg venligst en billedfil (PNG, JPG, SVG)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Filen er for stor. Maksimal størrelse er 2MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create object URL for preview
      const logoUrl = URL.createObjectURL(file);
      onLogoChange(logoUrl);
      
      // Store in localStorage for persistence
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          localStorage.setItem('company-logo', e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Der opstod en fejl ved upload af logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange(null);
    localStorage.removeItem('company-logo');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>Virksomhedslogo</Label>
      
      {currentLogo ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <img 
              src={currentLogo} 
              alt="Company Logo" 
              className="max-w-full max-h-full object-contain rounded"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={triggerFileSelect} 
              size="sm" 
              variant="outline"
              disabled={isUploading}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Skift
            </Button>
            <Button 
              onClick={handleRemoveLogo} 
              size="sm" 
              variant="outline"
              disabled={isUploading}
            >
              <X className="h-4 w-4 mr-1" />
              Fjern
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button 
            onClick={triggerFileSelect}
            variant="outline" 
            className="w-full h-20 border-2 border-dashed"
            disabled={isUploading}
          >
            <div className="text-center">
              <Upload className="h-6 w-6 mx-auto mb-1 text-gray-400" />
              <span className="text-sm text-gray-500">
                {isUploading ? 'Uploader...' : 'Klik for at uploade logo'}
              </span>
            </div>
          </Button>
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <p className="text-xs text-gray-500">
        Understøttede formater: PNG, JPG, SVG. Maks. 2MB
      </p>
    </div>
  );
};
