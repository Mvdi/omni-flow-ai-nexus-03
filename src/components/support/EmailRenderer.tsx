
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Image, FileText } from 'lucide-react';

interface EmailRendererProps {
  content: string;
  isHtml?: boolean;
  maxHeight?: number;
}

export const EmailRenderer = ({ content, isHtml = false, maxHeight = 300 }: EmailRendererProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Detect if content is likely an HTML email with images
  const isImageHtml = content.includes('<img') || content.includes('data:image/') || content.includes('cid:');
  
  // Detect if content has excessive whitespace (common in HTML emails)
  const hasExcessiveWhitespace = content.split('\n').length > 20 && content.trim().split(/\s+/).length < content.split('\n').length / 2;

  // Clean HTML for better display
  const cleanHtml = (html: string) => {
    return html
      // Remove excessive line breaks and whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      // Fix common HTML email issues
      .replace(/<o:p[^>]*>/g, '')
      .replace(/<\/o:p>/g, '')
      .replace(/<span[^>]*font-size:\s*0[^>]*>.*?<\/span>/gi, '')
      // Ensure images are responsive
      .replace(/<img([^>]*)>/gi, '<img$1 style="max-width: 100%; height: auto;">')
      .trim();
  };

  // Extract plain text from HTML
  const extractPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const renderContent = () => {
    if (showRaw) {
      return (
        <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-3 rounded border max-h-96 overflow-y-auto">
          {content}
        </pre>
      );
    }

    // If content is HTML and contains images or excessive formatting
    if (isHtml || content.includes('<') || isImageHtml) {
      const cleanedContent = cleanHtml(content);
      const plainText = extractPlainText(content);
      
      return (
        <div className="space-y-3">
          {/* HTML rendered version */}
          <div 
            className={`prose prose-sm max-w-none ${!isExpanded ? `max-h-[${maxHeight}px] overflow-hidden` : ''}`}
            dangerouslySetInnerHTML={{ 
              __html: cleanedContent 
            }}
            style={{
              lineHeight: '1.6',
              wordBreak: 'break-word'
            }}
          />
          
          {/* Show plain text alternative if HTML is complex */}
          {(isImageHtml || hasExcessiveWhitespace) && plainText.length > 50 && (
            <Card className="p-3 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Tekstversion:</span>
              </div>
              <div className="text-sm text-blue-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {plainText.substring(0, 500)}
                {plainText.length > 500 && !isExpanded && '...'}
                {isExpanded && plainText.length > 500 && plainText.substring(500)}
              </div>
            </Card>
          )}
        </div>
      );
    }

    // Plain text rendering with preserved formatting
    return (
      <div 
        className={`whitespace-pre-wrap text-sm ${!isExpanded ? `max-h-[${maxHeight}px] overflow-hidden` : ''}`}
        style={{ wordBreak: 'break-word', lineHeight: '1.6' }}
      >
        {content}
      </div>
    );
  };

  const shouldShowControls = content.length > 1000 || content.split('\n').length > 10 || isImageHtml;

  return (
    <div className="space-y-2">
      {renderContent()}
      
      {shouldShowControls && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Vis mindre
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Vis hele emailen
              </>
            )}
          </Button>
          
          {(isHtml || content.includes('<')) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs"
            >
              {showRaw ? (
                <>
                  <Image className="h-3 w-3 mr-1" />
                  Vis formateret
                </>
              ) : (
                <>
                  <FileText className="h-3 w-3 mr-1" />
                  Vis råkode
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
