
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

// PERFORMANCE: Enhanced caching with time-based invalidation
const getCachedUserStyle = (): string | null => {
  try {
    const cached = localStorage.getItem('mm_user_style');
    const timestamp = localStorage.getItem('mm_user_style_timestamp');
    
    if (cached && timestamp) {
      const cacheAge = Date.now() - parseInt(timestamp);
      const MAX_CACHE_AGE = 30 * 60 * 1000; // 30 minutes
      
      if (cacheAge < MAX_CACHE_AGE) {
        return cached;
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

const setCachedUserStyle = (style: string): void => {
  try {
    localStorage.setItem('mm_user_style', style);
    localStorage.setItem('mm_user_style_timestamp', Date.now().toString());
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
      console.log('🚀 Generating INTELLIGENT MM AI suggestions for ticket:', ticketId);
      console.log('📝 Full ticket content being analyzed:', ticketContent);
      
      // PERFORMANCE: Parallel processing for better speed
      const [userResult, customerEmailMatch] = await Promise.all([
        supabase.auth.getUser(),
        Promise.resolve(ticketContent.match(/\S+@\S+\.\S+/)?.[0])
      ]);
      
      const user = userResult.data.user;
      let userStyle = getCachedUserStyle() || 'MM Multipartner kundeservice specialist med intelligent kontekst-forståelse';
      
      // PERFORMANCE: Only fetch if not cached
      if (!getCachedUserStyle() && user) {
        const { data: userResponses } = await supabase
          .from('ticket_messages')
          .select('message_content')
          .eq('sender_email', user.email)
          .limit(5) // Reduced for faster queries
          .order('created_at', { ascending: false });
        
        if (userResponses && userResponses.length > 0) {
          const sampleMessages = userResponses.slice(0, 2).map(r => r.message_content).join('\n\n');
          userStyle = `Intelligent specialist: ${sampleMessages.substring(0, 300)}...`;
          setCachedUserStyle(userStyle);
        }
      }

      // PERFORMANCE: Streamlined customer history
      let enhancedHistory = customerHistory || 'Ingen tidligere historik';
      
      if (customerEmailMatch) {
        const { data: previousTickets } = await supabase
          .from('support_tickets')
          .select('subject, status, priority')
          .eq('customer_email', customerEmailMatch)
          .order('created_at', { ascending: false })
          .limit(2); // Reduced for speed
        
        if (previousTickets && previousTickets.length > 0) {
          enhancedHistory += `\n\nKundens tidligere tickets: ${previousTickets.map(t => 
            `${t.subject} (${t.status})`
          ).join(', ')}`;
        }
      }

      console.log('🧠 Calling REVOLUTIONIZED AI with full context analysis...');
      
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
        
        console.log('✅ INTELLIGENT AI suggestions generated:', data.suggestions.length);
        
        toast({
          title: "🧠 INTELLIGENT MM AI Klar",
          description: `${data.suggestions.length} intelligente forslag genereret på ${generationTime} sekunder`,
        });
      } else {
        throw new Error(data.error || 'Ukendt fejl');
      }
    } catch (error) {
      console.error('Error generating INTELLIGENT MM AI suggestions:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke generere intelligente AI forslag. Prøv igen.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const provideFeedback = async (suggestionId: string, isUseful: boolean, userModifications?: string) => {
    try {
      console.log('Providing feedback for INTELLIGENT MM AI suggestion:', { suggestionId, isUseful });
      
      await supabase.functions.invoke('ai-learning-feedback', {
        body: {
          suggestionId,
          isUseful,
          userModifications,
          timestamp: new Date().toISOString(),
          company: 'MM Multipartner',
          intelligentContext: true
        }
      });
      
      toast({
        title: isUseful ? "Perfekt!" : "Noteret",
        description: isUseful ? "AI'en bliver endnu smartere" : "AI'en lærer og forbedres",
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
