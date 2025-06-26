
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trash2 } from 'lucide-react';

export const CleanupDuplicates = () => {
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runCleanup = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-duplicates');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Oprydning fuldført",
          description: `${data.deletedCount} duplikerede beskeder blev fjernet.`,
        });
      } else {
        throw new Error(data.error || 'Ukendt fejl');
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke køre oprydning: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Ryd op i duplikerede beskeder
        </CardTitle>
        <CardDescription>
          Fjern duplikerede beskeder fra tickets for at rydde op i systemet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={runCleanup} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Kører oprydning...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Ryd op i duplikater
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
