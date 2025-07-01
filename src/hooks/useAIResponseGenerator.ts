
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIResponseSuggestion {
  id: string;
  content: string;
  confidence: number;
  reasoning: string;
  suggestedActions?: string[];
  learningContext?: {
    userStyle: string;
    previousSimilarTickets: number;
    customerHistory: string;
  };
}

export const useAIResponseGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AIResponseSuggestion[]>([]);
  const { toast } = useToast();

  const generateResponseSuggestions = async (ticketId: string, ticketContent: string, customerHistory?: string) => {
    setIsGenerating(true);
    try {
      console.log('Generating AI response suggestions for ticket:', ticketId);
      
      // Get user profile for personalization
      const user = (await supabase.auth.getUser()).data.user;
      let userStyle = 'professional and helpful';
      
      if (user) {
        // Get user's previous responses to learn style
        const { data: userResponses } = await supabase
          .from('ticket_messages')
          .select('message_content')
          .eq('sender_email', user.email)
          .limit(10);
        
        if (userResponses && userResponses.length > 0) {
          const sampleMessages = userResponses.map(r => r.message_content).join('\n\n');
          userStyle = `Based on previous messages: ${sampleMessages.substring(0, 500)}...`;
        }
      }

      const { data, error } = await supabase.functions.invoke('ai-response-suggestions', {
        body: {
          ticketContent,
          customerHistory: customerHistory || 'Ingen tidligere historik tilgængelig',
          userStyle,
          ticketId
        }
      });

      if (error) throw error;

      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
        toast({
          title: "AI forslag genereret",
          description: `${data.suggestions.length} forslag til svar er nu tilgængelige.`,
        });
      } else {
        throw new Error(data.error || 'Ukendt fejl');
      }
    } catch (error) {
      console.error('Error generating AI response suggestions:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke generere AI forslag. Prøv igen.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const provideFeedback = async (suggestionId: string, isUseful: boolean, userModifications?: string) => {
    try {
      await supabase.functions.invoke('ai-learning-feedback', {
        body: {
          suggestionId,
          isUseful,
          userModifications,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('AI learning feedback provided:', { suggestionId, isUseful });
    } catch (error) {
      console.error('Error providing AI feedback:', error);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    generateResponseSuggestions,
    provideFeedback,
    clearSuggestions,
    suggestions,
    isGenerating
  };
};
