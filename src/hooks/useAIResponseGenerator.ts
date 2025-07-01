
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

export const useAIResponseGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AIResponseSuggestion[]>([]);
  const { toast } = useToast();

  const generateResponseSuggestions = async (ticketId: string, ticketContent: string, customerHistory?: string) => {
    setIsGenerating(true);
    try {
      console.log('Generating MM Multipartner AI response suggestions for ticket:', ticketId);
      
      // Get user profile for personalization
      const user = (await supabase.auth.getUser()).data.user;
      let userStyle = 'professionel MM Multipartner kundeservice specialist med fokus på at levere excellent service';
      
      if (user) {
        // Get user's previous responses to learn style
        const { data: userResponses } = await supabase
          .from('ticket_messages')
          .select('message_content')
          .eq('sender_email', user.email)
          .limit(15);
        
        if (userResponses && userResponses.length > 0) {
          const sampleMessages = userResponses.map(r => r.message_content).join('\n\n');
          userStyle = `Baseret på tidligere beskeder fra denne medarbejder: ${sampleMessages.substring(0, 800)}...`;
        }
      }

      // Get enhanced customer history
      const customerEmail = ticketContent.includes('@') ? ticketContent.match(/\S+@\S+\.\S+/)?.[0] : null;
      let enhancedHistory = customerHistory || 'Ingen tidligere historik tilgængelig';
      
      if (customerEmail) {
        const { data: previousTickets } = await supabase
          .from('support_tickets')
          .select('subject, status, created_at, priority')
          .eq('customer_email', customerEmail)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (previousTickets && previousTickets.length > 0) {
          enhancedHistory += `\n\nKundens tidligere tickets:\n${previousTickets.map(t => 
            `- ${t.subject} (${t.status}, ${t.priority || 'Normal'}) - ${new Date(t.created_at).toLocaleDateString('da-DK')}`
          ).join('\n')}`;
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
        toast({
          title: "MM Multipartner AI Forslag Genereret",
          description: `${data.suggestions.length} ekspert kundeservice forslag er nu tilgængelige.`,
        });
      } else {
        throw new Error(data.error || 'Ukendt fejl');
      }
    } catch (error) {
      console.error('Error generating MM Multipartner AI suggestions:', error);
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
      console.log('Providing feedback for MM Multipartner AI suggestion:', { suggestionId, isUseful });
      
      await supabase.functions.invoke('ai-learning-feedback', {
        body: {
          suggestionId,
          isUseful,
          userModifications,
          timestamp: new Date().toISOString(),
          company: 'MM Multipartner'
        }
      });
      
      // Show user feedback was recorded
      toast({
        title: isUseful ? "Tak for feedback!" : "Feedback noteret",
        description: isUseful 
          ? "AI'en lærer fra dit positive feedback og bliver bedre." 
          : "AI'en vil forbedre sig baseret på din feedback.",
        variant: isUseful ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error providing AI feedback:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme feedback. AI'en får ikke denne læring.",
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
