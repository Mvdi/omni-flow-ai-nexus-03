
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAIResponseGenerator, AIResponseSuggestion } from '@/hooks/useAIResponseGenerator';
import { Sparkles, ThumbsUp, ThumbsDown, Copy, Edit3, Loader2 } from 'lucide-react';

interface AIResponseSuggestionsProps {
  ticketId: string;
  ticketContent: string;
  customerHistory?: string;
  onUseSuggestion: (content: string) => void;
}

export const AIResponseSuggestions = ({ 
  ticketId, 
  ticketContent, 
  customerHistory, 
  onUseSuggestion 
}: AIResponseSuggestionsProps) => {
  const { 
    generateResponseSuggestions, 
    provideFeedback, 
    clearSuggestions,
    suggestions, 
    isGenerating 
  } = useAIResponseGenerator();
  
  const [expandedSuggestions, setExpandedSuggestions] = useState<string[]>([]);
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');

  const handleGenerate = () => {
    generateResponseSuggestions(ticketId, ticketContent, customerHistory);
  };

  const handleUseSuggestion = (suggestion: AIResponseSuggestion) => {
    onUseSuggestion(suggestion.content);
    provideFeedback(suggestion.id, true);
  };

  const handleFeedback = (suggestion: AIResponseSuggestion, isUseful: boolean) => {
    provideFeedback(suggestion.id, isUseful, editedContent);
    if (!isUseful) {
      // Could show feedback form for improvement suggestions
    }
  };

  const toggleExpanded = (suggestionId: string) => {
    setExpandedSuggestions(prev => 
      prev.includes(suggestionId) 
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const startEditing = (suggestion: AIResponseSuggestion) => {
    setEditingSuggestion(suggestion.id);
    setEditedContent(suggestion.content);
  };

  const saveEdit = (suggestion: AIResponseSuggestion) => {
    onUseSuggestion(editedContent);
    provideFeedback(suggestion.id, true, editedContent);
    setEditingSuggestion(null);
    setEditedContent('');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSuggestionTypeLabel = (index: number) => {
    switch (index) {
      case 0: return 'Kort & Direkte';
      case 1: return 'Detaljeret';
      case 2: return 'Empatisk';
      default: return `Forslag ${index + 1}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          AI Svar Forslag
        </h3>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            variant="outline"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Genererer...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generer Forslag
              </>
            )}
          </Button>
          {suggestions.length > 0 && (
            <Button onClick={clearSuggestions} variant="ghost" size="sm">
              Ryd Forslag
            </Button>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {getSuggestionTypeLabel(index)}
                    <Badge className={getConfidenceColor(suggestion.confidence)}>
                      {suggestion.confidence}% sikker
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleUseSuggestion(suggestion)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => startEditing(suggestion)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleFeedback(suggestion, true)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleFeedback(suggestion, false)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingSuggestion === suggestion.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[150px]"
                      placeholder="Rediger AI forslaget..."
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => saveEdit(suggestion)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Brug Redigeret Version
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingSuggestion(null)}
                      >
                        Annuller
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div 
                      className={`text-sm text-gray-700 whitespace-pre-wrap ${
                        expandedSuggestions.includes(suggestion.id) ? '' : 'line-clamp-3'
                      }`}
                    >
                      {suggestion.content}
                    </div>
                    
                    {suggestion.content.length > 200 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(suggestion.id)}
                        className="mt-2 text-blue-600 hover:text-blue-700"
                      >
                        {expandedSuggestions.includes(suggestion.id) ? 'Vis mindre' : 'Vis mere'}
                      </Button>
                    )}
                    
                    {suggestion.reasoning && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <strong>AI Reasoning:</strong> {suggestion.reasoning}
                      </div>
                    )}
                    
                    {suggestion.suggestedActions && suggestion.suggestedActions.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {suggestion.suggestedActions.map((action, actionIndex) => (
                          <Badge key={actionIndex} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !isGenerating && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600 mb-4">
              Klik "Generer Forslag" for at få AI-baserede svar forslag til denne ticket.
            </p>
            <p className="text-sm text-gray-500">
              AI'en lærer fra dine tidligere svar og tilpasser sig din stil.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
