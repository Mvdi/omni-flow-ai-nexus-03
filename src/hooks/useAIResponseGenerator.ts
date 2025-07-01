
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIResponseSuggestion {
  id: string;
  content: string;
  confidence: number;
  reasoning: string;
  approach: string;
  suggestedActions?: string[];
  learningContext?: {
    userStyle: string;
    previousSimilarTickets: number;
    customerHistory: string;
    company: string;
  };
}

// PERFORMANCE: Cache user style in localStorage
const getCachedUserStyle = (): string | null => {
  try {
    return localStorage.getItem('mm_user_style');
  } catch {
    return null;
  }
};

const setCachedUserStyle = (style: string): void => {
  try {
    localStorage.setItem('mm_user_style', style);
  } catch {
    // Ignore cache errors
  }
};

export const useAIResponseGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AIResponseSuggestion[]>([]);
  const { toast } = useToast();

  const generateResponseSuggestions = async (ticketId: string, ticketContent: string, customerHistory?: string) => {
    setIsGenerating(true);
    const startTime = Date.now();
    
    try {
      console.log('Generating fast MM AI response suggestions for ticket:', ticketId);
      
      // PERFORMANCE: Use parallel queries for better speed
      const [userResult, customerEmailMatch] = await Promise.all([
        supabase.auth.getUser(),
        Promise.resolve(ticketContent.match(/\S+@\S+\.\S+/)?.[0])
      ]);
      
      const user = userResult.data.user;
      let userStyle = getCachedUserStyle() || 'MM Multipartner kundeservice specialist';
      
      // PERFORMANCE: Only fetch user style if not cached
      if (!getCachedUserStyle() && user) {
        const { data: userResponses } = await supabase
          .from('ticket_messages')
          .select('message_content')
          .eq('sender_email', user.email)
          .limit(8) // Reduced from 15 for faster queries
          .order('created_at', { ascending: false });
        
        if (userResponses && userResponses.length > 0) {
          const sampleMessages = userResponses.slice(0, 3).map(r => r.message_content).join('\n\n');
          userStyle = `Baseret på tidligere beskeder: ${sampleMessages.substring(0, 400)}...`;
          setCachedUserStyle(userStyle);
        }
      }

      // PERFORMANCE: Simplified customer history with limit
      let enhancedHistory = customerHistory || 'Ingen tidligere historik';
      
      if (customerEmailMatch) {
        const { data: previousTickets } = await supabase
          .from('support_tickets')
          .select('subject, status, priority')
          .eq('customer_email', customerEmailMatch)
          .order('created_at', { ascending: false })
          .limit(3); // Reduced from 5 for faster queries
        
        if (previousTickets && previousTickets.length > 0) {
          enhancedHistory += `\n\nKundens tidligere tickets: ${previousTickets.map(t => 
            `${t.subject} (${t.status})`
          ).join(', ')}`;
        }
      }

      const { data, error } = await supabase.functions.invoke('ai-response-suggestions', {
        body: {
          ticketContent,
          customerHistory: enhancedHistory,
          userStyle,
          ticketId
        }
      });

      if (error) throw error;

      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
        
        const generationTime = Math.round((Date.now() - startTime) / 1000);
        
        toast({
          title: "MM AI Forslag Genereret",
          description: `${data.suggestions.length} forslag klar på ${generationTime} sekunder`,
        });
      } else {
        throw new Error(data.error || 'Ukendt fejl');
      }
    } catch (error) {
      console.error('Error generating MM AI suggestions:', error);
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
      console.log('Providing feedback for MM AI suggestion:', { suggestionId, isUseful });
      
      await supabase.functions.invoke('ai-learning-feedback', {
        body: {
          suggestionId,
          isUseful,
          userModifications,
          timestamp: new Date().toISOString(),
          company: 'MM Multipartner'
        }
      });
      
      // Simplified feedback toast
      toast({
        title: isUseful ? "Tak!" : "Noteret",
        description: isUseful ? "AI'en lærer fra din feedback" : "AI'en forbedres",
        variant: isUseful ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error providing AI feedback:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme feedback",
        variant: "destructive",
      });
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
