
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUpdateLeadStatus, useUpdateLastContact, useDeleteLead, useLeadSupportTickets } from '@/hooks/useLeads';
import { useLeadQuotesByEmail } from '@/hooks/useLeadQuotes';
import { MoreVertical, Edit, Trash2, Phone, Calendar, ArrowRight, Building, Mail, MessageSquare, Wrench, FileText } from 'lucide-react';
import { CreateQuoteDialog } from './CreateQuoteDialog';
import type { Lead } from '@/hooks/useLeads';

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onClick?: (lead: Lead) => void;
}

export const LeadCard = ({ lead, onEdit, onClick }: LeadCardProps) => {
  const updateStatus = useUpdateLeadStatus();
  const updateLastContact = useUpdateLastContact();
  const deleteLead = useDeleteLead();
  
  // Get support tickets for this lead
  const { data: supportTickets = [] } = useLeadSupportTickets(lead.email);
  
  // Get quotes for this lead
  const { data: quotes = [] } = useLeadQuotesByEmail(lead.email);

  const handleStatusChange = async (newStatus: Lead['status']) => {
    await updateStatus.mutateAsync({ id: lead.id, status: newStatus });
  };

  const handleUpdateContact = async () => {
    await updateLastContact.mutateAsync({ 
      id: lead.id, 
      sidste_kontakt: new Date().toISOString() 
    });
  };

  const handleDelete = async () => {
    if (confirm('Er du sikker på, at du vil slette dette lead?')) {
      await deleteLead.mutateAsync(lead.id);
    }
  };

  const getStatusOptions = (currentStatus: Lead['status']) => {
    const allStatuses = [
      { value: 'new', label: 'Nye Leads' },
      { value: 'contacted', label: 'Kontaktet' },
      { value: 'qualified', label: 'Kvalificeret' },
      { value: 'proposal', label: 'Tilbud Sendt' },
      { value: 'negotiation', label: 'Forhandling' },
      { value: 'closed-won', label: 'Lukket - Vundet' },
      { value: 'closed-lost', label: 'Lukket - Tabt' }
    ];
    
    return allStatuses.filter(status => status.value !== currentStatus);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Høj': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Lav': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger click if clicking on dropdown or buttons
    if ((e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]') || 
        (e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.(lead);
  };

  return (
    <div 
      className="p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none group"
      onClick={handleCardClick}
    >
      {/* Compact Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate leading-tight">{lead.navn}</h4>
          {lead.virksomhed && (
            <p className="text-xs text-gray-600 truncate flex items-center gap-1 mt-0.5">
              <Building className="h-3 w-3 flex-shrink-0" />
              {lead.virksomhed}
            </p>
          )}
          {(lead as any).services && (
            <p className="text-xs text-blue-600 truncate flex items-center gap-1 mt-0.5">
              <Wrench className="h-3 w-3 flex-shrink-0" />
              {(lead as any).services}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(lead)}>
              <Edit className="h-4 w-4 mr-2" />
              Rediger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUpdateContact}>
              <Calendar className="h-4 w-4 mr-2" />
              Opdater kontakt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Slet
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <ArrowRight className="h-4 w-4 mr-2" />
              Flyt til...
            </DropdownMenuItem>
            {getStatusOptions(lead.status).map((status) => (
              <DropdownMenuItem 
                key={status.value}
                onClick={() => handleStatusChange(status.value as Lead['status'])}
                className="pl-8"
              >
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Compact Contact Info */}
      <div className="space-y-1 mb-2">
        {lead.email && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.telefon && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span>{lead.telefon}</span>
          </div>
        )}
      </div>
      
      {/* Compact Value and Badges */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {lead.vaerdi && (
            <span className="text-sm font-semibold text-green-600">
              {lead.vaerdi.toLocaleString('da-DK')} kr
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {quotes.length > 0 && (
            <Badge variant="outline" className="text-xs h-5 bg-green-50 text-green-700 border-green-200 px-1">
              <FileText className="h-2.5 w-2.5 mr-0.5" />
              {quotes.length}
            </Badge>
          )}
          {supportTickets.length > 0 && (
            <Badge variant="outline" className="text-xs h-5 bg-blue-50 text-blue-700 border-blue-200 px-1">
              <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
              {supportTickets.length}
            </Badge>
          )}
          {lead.prioritet && lead.prioritet !== '' && (
            <Badge 
              variant="outline" 
              className={`text-xs h-5 px-1 ${getPriorityColor(lead.prioritet)}`}
            >
              {lead.prioritet}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
        <CreateQuoteDialog lead={lead} />
        {lead.sidste_kontakt && (
          <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Sidste: {new Date(lead.sidste_kontakt).toLocaleDateString('da-DK')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
