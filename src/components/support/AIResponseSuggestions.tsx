
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAIResponseGenerator, AIResponseSuggestion } from '@/hooks/useAIResponseGenerator';
import { Sparkles, ThumbsUp, ThumbsDown, Copy, Edit3, Loader2, Bot, Zap, Heart } from 'lucide-react';

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
  const [feedbackGiven, setFeedbackGiven] = useState<string[]>([]);

  const handleGenerate = () => {
    generateResponseSuggestions(ticketId, ticketContent, customerHistory);
  };

  // CRITICAL FIX: Preserve line breaks when using AI suggestions
  const handleUseSuggestion = (suggestion: AIResponseSuggestion) => {
    // Convert \n to actual line breaks that work in textarea
    const formattedContent = suggestion.content.replace(/\\n/g, '\n');
    onUseSuggestion(formattedContent);
    provideFeedback(suggestion.id, true);
    setFeedbackGiven(prev => [...prev, suggestion.id]);
  };

  const handleFeedback = (suggestion: AIResponseSuggestion, isUseful: boolean) => {
    provideFeedback(suggestion.id, isUseful, editedContent);
    setFeedbackGiven(prev => [...prev, suggestion.id]);
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
    // Also preserve line breaks when editing
    const formattedContent = suggestion.content.replace(/\\n/g, '\n');
    setEditedContent(formattedContent);
  };

  const saveEdit = (suggestion: AIResponseSuggestion) => {
    onUseSuggestion(editedContent);
    provideFeedback(suggestion.id, true, editedContent);
    setEditingSuggestion(null);
    setEditedContent('');
    setFeedbackGiven(prev => [...prev, suggestion.id]);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getApproachIcon = (approach: string) => {
    if (approach.includes('Hurtig') || approach.includes('Direkte')) return <Zap className="h-4 w-4" />;
    if (approach.includes('Grundig') || approach.includes('Detaljeret')) return <Bot className="h-4 w-4" />;
    if (approach.includes('Venlig') || approach.includes('Personlig')) return <Heart className="h-4 w-4" />;
    return <Sparkles className="h-4 w-4" />;
  };

  const getApproachColor = (approach: string) => {
    if (approach.includes('Hurtig') || approach.includes('Direkte')) return 'bg-orange-100 text-orange-800';
    if (approach.includes('Grundig') || approach.includes('Detaljeret')) return 'bg-blue-100 text-blue-800';
    if (approach.includes('Venlig') || approach.includes('Personlig')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">MM AI Assistent</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            Hurtig & Intelligent
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
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
              Ryd
            </Button>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <Card key={suggestion.id} className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getApproachIcon(suggestion.approach)}
                      <CardTitle className="text-sm font-medium">
                        {suggestion.approach}
                      </CardTitle>
                    </div>
                    <Badge className={getApproachColor(suggestion.approach)}>
                      {suggestion.approach}
                    </Badge>
                    <Badge className={getConfidenceColor(suggestion.confidence)}>
                      {suggestion.confidence}%
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleUseSuggestion(suggestion)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Brug dette svar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => startEditing(suggestion)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Rediger og brug"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    {!feedbackGiven.includes(suggestion.id) && (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleFeedback(suggestion, true)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Godt forslag"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleFeedback(suggestion, false)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Dårligt forslag"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {feedbackGiven.includes(suggestion.id) && (
                      <Badge variant="outline" className="text-xs">
                        ✓
                      </Badge>
                    )}
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
                        Brug
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
                        expandedSuggestions.includes(suggestion.id) ? '' : 'line-clamp-4'
                      }`}
                    >
                      {suggestion.content.replace(/\\n/g, '\n')}
                    </div>
                    
                    {suggestion.content.length > 300 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(suggestion.id)}
                        className="mt-2 text-blue-600 hover:text-blue-700"
                      >
                        {expandedSuggestions.includes(suggestion.id) ? 'Mindre' : 'Mere'}
                      </Button>
                    )}
                    
                    {suggestion.reasoning && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                        <strong>Begrundelse:</strong> {suggestion.reasoning}
                      </div>
                    )}
                    
                    {suggestion.suggestedActions && suggestion.suggestedActions.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-gray-600 mb-2">Handlinger:</div>
                        <div className="flex gap-1 flex-wrap">
                          {suggestion.suggestedActions.map((action, actionIndex) => (
                            <Badge key={actionIndex} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
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
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Bot className="h-12 w-12 text-blue-400" />
            </div>
            <h4 className="text-lg font-semibold mb-2">MM AI Assistent</h4>
            <p className="text-gray-600 mb-4">
              Få professionelle svar forslag på få sekunder
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>• <strong>Hurtig:</strong> Svar på 5 sekunder</p>
              <p>• <strong>Naturlig:</strong> Lyder som en kollega</p>
              <p>• <strong>Præcis:</strong> Fokuseret på det specifikke problem</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
