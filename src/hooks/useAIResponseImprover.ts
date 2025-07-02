import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImproveResponseRequest {
  originalText: string;
  context?: string;
  tone?: 'professional' | 'friendly' | 'formal';
}

export const useAIResponseImprover = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ originalText, context, tone = 'professional' }: ImproveResponseRequest) => {
      const { data, error } = await supabase.functions.invoke('ai-response-improver', {
        body: {
          originalText,
          context,
          tone
        }
      });

      if (error) {
        console.error('AI response improver error:', error);
        throw error;
      }

      return data.improvedText;
    },
    onError: (error: any) => {
      console.error('Failed to improve response:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke forbedre svaret. Prøv igen senere.",
        variant: "destructive",
      });
    },
  });
};