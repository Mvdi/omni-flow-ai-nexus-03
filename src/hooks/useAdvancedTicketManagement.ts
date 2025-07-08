import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Advanced ticket management operations
 * Includes SLA management, auto-assignment, and bulk operations
 */
export const useAdvancedTicketManagement = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-assign tickets based on category/tags
  const autoAssignTickets = async () => {
    setIsProcessing(true);
    
    try {
      console.log('🎯 Starting auto-assignment process...');
      
      // Get unassigned tickets
      const { data: unassignedTickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, category, tags, customer_email, priority, subject')
        .is('assignee_id', null)
        .not('status', 'in', '("Lukket","Løst")');

      if (ticketsError) throw ticketsError;

      if (!unassignedTickets || unassignedTickets.length === 0) {
        toast({
          title: "Ingen tickets at tildele",
          description: "Alle åbne tickets er allerede tildelt.",
        });
        return;
      }

      // Get available employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, specialties')
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      if (!employees || employees.length === 0) {
        toast({
          title: "Ingen medarbejdere tilgængelige",
          description: "Der er ingen aktive medarbejdere at tildele tickets til.",
          variant: "destructive",
        });
        return;
      }

      // Smart assignment logic
      const assignments = [];
      
      for (const ticket of unassignedTickets) {
        let bestMatch = null;
        let matchScore = 0;

        for (const employee of employees) {
          let score = 1; // Base score

          // Category/specialty matching
          if (ticket.category && employee.specialties) {
            const hasSpecialty = employee.specialties.some((specialty: string) => 
              specialty.toLowerCase().includes(ticket.category.toLowerCase()) ||
              ticket.category.toLowerCase().includes(specialty.toLowerCase())
            );
            if (hasSpecialty) score += 3;
          }

          // Priority handling
          if (ticket.priority === 'Høj') score += 2;

          // Customer history (simplified - could be enhanced)
          if (ticket.customer_email) score += 1;

          if (score > matchScore) {
            matchScore = score;
            bestMatch = employee;
          }
        }

        if (bestMatch) {
          assignments.push({
            ticketId: ticket.id,
            employeeId: bestMatch.id,
            employeeName: bestMatch.name,
            reason: `Auto-assigned (score: ${matchScore})`
          });
        }
      }

      // Apply assignments
      for (const assignment of assignments) {
        await supabase
          .from('support_tickets')
          .update({ 
            assignee_id: assignment.employeeId,
            auto_assigned: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.ticketId);
      }

      queryClient.invalidateQueries({ queryKey: ['tickets'] });

      toast({
        title: "Auto-tildeling gennemført",
        description: `${assignments.length} tickets blev automatisk tildelt.`,
      });

      console.log(`✅ Auto-assigned ${assignments.length} tickets`);
      return assignments;

    } catch (error: any) {
      console.error('Failed to auto-assign tickets:', error);
      toast({
        title: "Auto-tildeling fejlede",
        description: error.message || "Kunne ikke auto-tildele tickets.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Set SLA deadlines based on priority
  const setSLADeadlines = async () => {
    setIsProcessing(true);
    
    try {
      console.log('⏰ Setting SLA deadlines...');
      
      // Get tickets without SLA deadlines
      const { data: ticketsWithoutSLA, error } = await supabase
        .from('support_tickets')
        .select('id, priority, created_at, status')
        .is('sla_deadline', null)
        .not('status', 'in', '("Lukket","Løst")');

      if (error) throw error;

      if (!ticketsWithoutSLA || ticketsWithoutSLA.length === 0) {
        toast({
          title: "Alle tickets har SLA deadlines",
          description: "Ingen tickets mangler SLA deadlines.",
        });
        return;
      }

      // Calculate SLA deadlines
      const updates = ticketsWithoutSLA.map(ticket => {
        const createdAt = new Date(ticket.created_at);
        let slaHours = 48; // Default 48 hours

        // Adjust based on priority
        switch (ticket.priority) {
          case 'Høj':
            slaHours = 4;
            break;
          case 'Medium':
            slaHours = 24;
            break;
          case 'Lav':
            slaHours = 72;
            break;
        }

        const slaDeadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));

        return {
          id: ticket.id,
          sla_deadline: slaDeadline.toISOString()
        };
      });

      // Apply SLA deadlines
      for (const update of updates) {
        await supabase
          .from('support_tickets')
          .update({ sla_deadline: update.sla_deadline })
          .eq('id', update.id);
      }

      queryClient.invalidateQueries({ queryKey: ['tickets'] });

      toast({
        title: "SLA deadlines sat",
        description: `SLA deadlines blev sat for ${updates.length} tickets.`,
      });

      console.log(`✅ Set SLA deadlines for ${updates.length} tickets`);

    } catch (error: any) {
      console.error('Failed to set SLA deadlines:', error);
      toast({
        title: "SLA deadline fejl",
        description: error.message || "Kunne ikke sætte SLA deadlines.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk update ticket categories based on content analysis
  const categorizeTickers = async () => {
    setIsProcessing(true);
    
    try {
      console.log('🏷️ Starting automatic categorization...');
      
      // Get uncategorized tickets
      const { data: uncategorizedTickets, error } = await supabase
        .from('support_tickets')
        .select('id, subject, content')
        .or('category.is.null,category.eq.""');

      if (error) throw error;

      if (!uncategorizedTickets || uncategorizedTickets.length === 0) {
        toast({
          title: "Alle tickets er kategoriseret",
          description: "Ingen tickets mangler kategorier.",
        });
        return;
      }

      // Simple categorization logic (could be enhanced with AI)
      const categories = [
        { name: 'Fakturering', keywords: ['faktura', 'betaling', 'regning', 'pris'] },
        { name: 'Teknisk Support', keywords: ['fejl', 'virker ikke', 'problem', 'defekt'] },
        { name: 'Bestilling', keywords: ['bestilling', 'ordre', 'køb', 'service'] },
        { name: 'Klage', keywords: ['utilfreds', 'klage', 'dårlig', 'problem'] },
        { name: 'Information', keywords: ['spørgsmål', 'information', 'hvornår', 'hvor'] },
      ];

      const updates = [];

      for (const ticket of uncategorizedTickets) {
        const text = `${ticket.subject} ${ticket.content || ''}`.toLowerCase();
        let bestCategory = 'Generel';
        let maxMatches = 0;

        for (const category of categories) {
          const matches = category.keywords.filter(keyword => 
            text.includes(keyword)
          ).length;

          if (matches > maxMatches) {
            maxMatches = matches;
            bestCategory = category.name;
          }
        }

        updates.push({
          id: ticket.id,
          category: bestCategory
        });
      }

      // Apply categorization
      for (const update of updates) {
        await supabase
          .from('support_tickets')
          .update({ category: update.category })
          .eq('id', update.id);
      }

      queryClient.invalidateQueries({ queryKey: ['tickets'] });

      toast({
        title: "Tickets kategoriseret",
        description: `${updates.length} tickets blev automatisk kategoriseret.`,
      });

      console.log(`✅ Categorized ${updates.length} tickets`);

    } catch (error: any) {
      console.error('Failed to categorize tickets:', error);
      toast({
        title: "Kategorisering fejlede",
        description: error.message || "Kunne ikke kategorisere tickets.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    autoAssignTickets,
    setSLADeadlines,
    categorizeTickers,
    isProcessing
  };
};