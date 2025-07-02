import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from 'react';
import { formatDanishDistance } from '@/utils/danishTime';
import { Send, MessageSquare, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface InternalNote {
  id: string;
  sender_email: string;
  sender_name: string | null;
  message_content: string;
  created_at: string;
}

interface InternalNotesConversationProps {
  ticketId: string;
}

export const InternalNotesConversation = ({ ticketId }: InternalNotesConversationProps) => {
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load internal notes
  useEffect(() => {
    loadInternalNotes();
  }, [ticketId]);

  const loadInternalNotes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('is_internal', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setNotes(data || []);
    } catch (error) {
      console.error('Error loading internal notes:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke indlæse interne noter.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      setIsSending(true);
      
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // Get user name from profile settings in localStorage
      const profileSettings = localStorage.getItem('profile-settings');
      let displayName = user.email?.split('@')[0] || 'Support';
      
      if (profileSettings) {
        try {
          const profile = JSON.parse(profileSettings);
          const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
          if (fullName.trim()) {
            displayName = fullName;
          }
        } catch (e) {
          console.warn('Could not parse profile settings:', e);
        }
      }

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_email: user.email || 'unknown@mmmultipartner.dk',
          sender_name: displayName,
          message_content: newNote,
          message_type: 'internal',
          is_internal: true,
          is_ai_generated: false,
          attachments: []
        });

      if (error) throw error;

      setNewNote('');
      await loadInternalNotes();
      
      // Also refresh the main ticket conversation to show the internal note in correct order
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
      
      toast({
        title: "Note tilføjet",
        description: "Din interne note er blevet gemt.",
      });
      
    } catch (error) {
      console.error('Failed to send internal note:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme noten. Prøv igen.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Interne Noter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Indlæser noter...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Interne Noter
          <Badge variant="outline" className="text-xs bg-purple-100">
            Kun internt
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes conversation */}
        <div className="max-h-64 overflow-y-auto space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Ingen interne noter endnu</p>
              <p className="text-xs">Tilføj den første note nedenfor</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="flex gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-purple-100 text-purple-600">
                    {getUserInitials(note.sender_name, note.sender_email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">
                        {note.sender_name || note.sender_email.split('@')[0]}
                      </span>
                      <Badge variant="outline" className="text-xs bg-purple-100">
                        Intern
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDanishDistance(note.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.message_content}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add new note */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Skriv en intern note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 min-h-[80px] resize-y"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSendNote();
                }
              }}
            />
            <Button 
              onClick={handleSendNote}
              disabled={!newNote.trim() || isSending}
              size="sm"
              className="self-end"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Tryk Cmd/Ctrl + Enter for at sende hurtigt
          </p>
        </div>
      </CardContent>
    </Card>
  );
};