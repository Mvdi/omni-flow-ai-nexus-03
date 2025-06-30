
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUpdateLeadStatus, useUpdateLastContact, useDeleteLead, useLeadSupportTickets } from '@/hooks/useLeads';
import { MoreVertical, Edit, Trash2, Phone, Calendar, ArrowRight, Building, Mail, MessageSquare } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
}

export const LeadCard = ({ lead, onEdit }: LeadCardProps) => {
  const updateStatus = useUpdateLeadStatus();
  const updateLastContact = useUpdateLastContact();
  const deleteLead = useDeleteLead();
  
  // Get support tickets for this lead
  const { data: supportTickets = [] } = useLeadSupportTickets(lead.email);

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

  return (
    <div className="p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-grab select-none group">
      {/* Header with name and actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base text-gray-900 truncate">{lead.navn}</h4>
          {lead.virksomhed && (
            <p className="text-sm text-gray-600 truncate flex items-center gap-1 mt-1">
              <Building className="h-3 w-3" />
              {lead.virksomhed}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
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
      
      {/* Contact Information */}
      <div className="space-y-2 mb-3">
        {lead.email && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.telefon && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="h-4 w-4 text-gray-500" />
            <span>{lead.telefon}</span>
          </div>
        )}
      </div>
      
      {/* Value and Priority - Clean Design */}
      <div className="flex items-center justify-between mb-3">
        <div>
          {lead.vaerdi && (
            <span className="text-lg font-semibold text-green-600">
              {lead.vaerdi.toLocaleString('da-DK')} kr
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {supportTickets.length > 0 && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              <MessageSquare className="h-3 w-3 mr-1" />
              {supportTickets.length}
            </Badge>
          )}
          {lead.prioritet && lead.prioritet !== '' && (
            <Badge 
              variant="outline" 
              className={`text-xs ${getPriorityColor(lead.prioritet)}`}
            >
              {lead.prioritet}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Last Contact - Simple */}
      {lead.sidste_kontakt && (
        <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-2">
          <Calendar className="h-3 w-3" />
          <span>Sidste kontakt: {new Date(lead.sidste_kontakt).toLocaleDateString('da-DK')}</span>
        </div>
      )}
    </div>
  );
};
