import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUpdateLeadStatus, useUpdateLastContact, useDeleteLead, useAILeadScoring, useAILeadEnrichment, useLeadSupportTickets } from '@/hooks/useLeads';
import { MoreVertical, Edit, Trash2, Phone, Calendar, ArrowRight, Brain, TrendingUp, Building, Mail, MessageSquare } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
}

export const LeadCard = ({ lead, onEdit }: LeadCardProps) => {
  const updateStatus = useUpdateLeadStatus();
  const updateLastContact = useUpdateLastContact();
  const deleteLead = useDeleteLead();
  const aiScoring = useAILeadScoring();
  const aiEnrichment = useAILeadEnrichment();
  
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

  const handleAIScoring = async () => {
    try {
      await aiScoring.mutateAsync(lead.id);
    } catch (error) {
      console.error('AI scoring failed:', error);
    }
  };

  const handleAIEnrichment = async () => {
    try {
      await aiEnrichment.mutateAsync(lead.id);
    } catch (error) {
      console.error('AI enrichment failed:', error);
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

  const getAIScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAIScoreBadge = (score: number | null) => {
    if (!score) return null;
    if (score >= 70) return <Badge variant="default" className="text-xs bg-green-100 text-green-800">Høj</Badge>;
    if (score >= 40) return <Badge variant="secondary" className="text-xs">Medium</Badge>;
    return <Badge variant="destructive" className="text-xs">Lav</Badge>;
  };

  return (
    <div 
      className={`p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-grab select-none group`} 
      style={{ transition: 'box-shadow 0.2s, transform 0.2s' }}
    >
      {/* Header with name and actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm text-gray-900 truncate">{lead.navn}</h4>
            {supportTickets.length > 0 && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <MessageSquare className="h-3 w-3 mr-1" />
                {supportTickets.length} ticket{supportTickets.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {lead.virksomhed && (
            <p className="text-xs text-gray-600 truncate flex items-center gap-1">
              <Building className="h-3 w-3" />
              {lead.virksomhed}
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
            <DropdownMenuItem onClick={handleAIScoring} disabled={aiScoring.isPending}>
              <Brain className="h-4 w-4 mr-2" />
              {aiScoring.isPending ? 'Scorer...' : 'AI Score'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAIEnrichment} disabled={aiEnrichment.isPending}>
              <TrendingUp className="h-4 w-4 mr-2" />
              {aiEnrichment.isPending ? 'Beriger...' : 'AI Berigelse'}
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
      <div className="space-y-1 mb-3">
        {lead.email && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.telefon && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Phone className="h-3 w-3" />
            <span>{lead.telefon}</span>
          </div>
        )}
      </div>
      
      {/* Value and Priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {lead.vaerdi && (
            <span className="text-sm font-medium text-green-600">
              {lead.vaerdi.toLocaleString('da-DK')} kr
            </span>
          )}
          {lead.ai_score && (
            <span className={`text-xs font-medium ${getAIScoreColor(lead.ai_score)}`}>
              AI: {lead.ai_score}/100
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {getAIScoreBadge(lead.ai_score)}
          <Badge 
            variant={lead.prioritet === 'Høj' ? 'destructive' : 'secondary'} 
            className="text-xs"
          >
            {lead.prioritet}
          </Badge>
        </div>
      </div>
      
      {/* Last Contact */}
      {lead.sidste_kontakt && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>Sidste kontakt: {new Date(lead.sidste_kontakt).toLocaleDateString('da-DK')}</span>
        </div>
      )}
      
      {/* AI Enrichment Indicators */}
      {lead.ai_enriched_data && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <TrendingUp className="h-3 w-3" />
            <span>AI Beriget</span>
          </div>
        </div>
      )}
    </div>
  );
}; 