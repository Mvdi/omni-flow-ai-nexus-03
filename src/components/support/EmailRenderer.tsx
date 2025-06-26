
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Image, FileText } from 'lucide-react';

interface EmailRendererProps {
  content: string;
  isHtml?: boolean;
  maxHeight?: number;
}

export const EmailRenderer = ({ content, isHtml = false, maxHeight = 400 }: EmailRendererProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Detect if content is likely an HTML email
  const isHtmlEmail = content.includes('<') || content.includes('&nbsp;') || content.includes('&lt;') || isHtml;
  
  // Detect if content has excessive whitespace (common in HTML emails)
  const hasExcessiveWhitespace = content.split('\n').length > 15;
  
  // Detect if content is very long
  const isLongContent = content.length > 500 || content.split('\n').length > 8;

  // Clean HTML for better display
  const cleanHtml = (html: string) => {
    return html
      // Remove excessive line breaks and whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s{3,}/g, ' ')
      // Fix common HTML email issues
      .replace(/<o:p[^>]*>/g, '')
      .replace(/<\/o:p>/g, '')
      .replace(/<span[^>]*font-size:\s*0[^>]*>.*?<\/span>/gi, '')
      .replace(/<span[^>]*display:\s*none[^>]*>.*?<\/span>/gi, '')
      // Ensure images are responsive
      .replace(/<img([^>]*)>/gi, '<img$1 style="max-width: 100%; height: auto;">')
      // Fix table layouts for better mobile display
      .replace(/<table([^>]*)>/gi, '<table$1 style="width: 100%; border-collapse: collapse;">')
      .replace(/<td([^>]*)>/gi, '<td$1 style="padding: 8px; vertical-align: top;">')
      // Remove excessive spacing elements
      .replace(/<br\s*\/?>\s*<br\s*\/?>\s*<br\s*\/?>/gi, '<br><br>')
      .trim();
  };

  // Extract plain text from HTML with better formatting
  const extractPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Replace common HTML elements with appropriate text formatting
    const text = div.innerHTML
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]*>/g, '');
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    return (tempDiv.textContent || tempDiv.innerText || '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{3,}/g, ' ')
      .trim();
  };

  const renderContent = () => {
    if (showRaw) {
      return (
        <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded border overflow-auto">
          {content}
        </pre>
      );
    }

    // If content is HTML email
    if (isHtmlEmail) {
      const cleanedContent = cleanHtml(content);
      const plainText = extractPlainText(content);
      
      return (
        <div className="space-y-4">
          {/* HTML rendered version */}
          <div 
            className={`prose prose-sm max-w-none overflow-hidden ${
              !isExpanded && isLongContent ? 'max-h-96' : ''
            }`}
            dangerouslySetInnerHTML={{ 
              __html: cleanedContent 
            }}
            style={{
              lineHeight: '1.6',
              wordBreak: 'break-word',
              fontSize: '14px'
            }}
          />
          
          {/* Show plain text alternative if HTML is complex or has issues */}
          {(hasExcessiveWhitespace || plainText.length > 100) && (
            <Card className="p-3 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Ren tekst version:</span>
              </div>
              <div className={`text-sm text-blue-700 whitespace-pre-wrap overflow-hidden ${
                !isExpanded && isLongContent ? 'max-h-32' : ''
              }`}>
                {plainText}
              </div>
            </Card>
          )}
        </div>
      );
    }

    // Plain text rendering with preserved formatting
    return (
      <div 
        className={`whitespace-pre-wrap text-sm overflow-hidden ${
          !isExpanded && isLongContent ? 'max-h-96' : ''
        }`}
        style={{ 
          wordBreak: 'break-word', 
          lineHeight: '1.6',
          fontSize: '14px'
        }}
      >
        {content}
      </div>
    );
  };

  const shouldShowControls = isLongContent || isHtmlEmail || hasExcessiveWhitespace;

  return (
    <div className="space-y-3">
      <div className="relative">
        {renderContent()}
        
        {/* Gradient overlay when content is collapsed */}
        {!isExpanded && isLongContent && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
      
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
          
          {isHtmlEmail && (
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
