
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Download, File, Image, FileText, Archive, Video, Music, Eye, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Attachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
  url: string;
  path: string;
  uploaded_at: string;
}

interface AttachmentViewerProps {
  attachments: Attachment[];
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (contentType.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (contentType.startsWith('audio/')) return <Music className="h-4 w-4" />;
  if (contentType.includes('pdf')) return <FileText className="h-4 w-4" />;
  if (contentType.includes('zip') || contentType.includes('rar') || contentType.includes('7z')) return <Archive className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const getFileTypeColor = (contentType: string): string => {
  if (contentType.startsWith('image/')) return 'text-green-600';
  if (contentType.startsWith('video/')) return 'text-purple-600';
  if (contentType.startsWith('audio/')) return 'text-blue-600';
  if (contentType.includes('pdf')) return 'text-red-600';
  if (contentType.includes('zip') || contentType.includes('rar') || contentType.includes('7z')) return 'text-orange-600';
  return 'text-gray-600';
};

export const AttachmentViewer = ({ attachments, className = '' }: AttachmentViewerProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleDownload = async (attachment: Attachment) => {
    setIsDownloading(attachment.id);
    try {
      // Download from Supabase Storage
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .download(attachment.path);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download startet",
        description: `${attachment.name} bliver downloadet.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download fejl",
        description: "Kunne ikke downloade filen. Prøv igen.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handlePreview = (attachment: Attachment) => {
    if (attachment.contentType.startsWith('image/')) {
      setPreviewUrl(attachment.url);
    } else {
      // For other file types, open in new tab
      window.open(attachment.url, '_blank');
    }
  };

  const canPreview = (contentType: string): boolean => {
    return contentType.startsWith('image/') || 
           contentType.includes('pdf') || 
           contentType.startsWith('text/');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">
        Vedhæftninger ({attachments.length})
      </div>
      
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <Card key={attachment.id} className="border border-gray-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex-shrink-0 ${getFileTypeColor(attachment.contentType)}`}>
                    {getFileIcon(attachment.contentType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)} • {attachment.contentType}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canPreview(attachment.contentType) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(attachment)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    disabled={isDownloading === attachment.id}
                    className="h-8 w-8 p-0"
                  >
                    {isDownloading === attachment.id ? (
                      <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 z-10 bg-white hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ maxHeight: 'calc(100vh - 2rem)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
