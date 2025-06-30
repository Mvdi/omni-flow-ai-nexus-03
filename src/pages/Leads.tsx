import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Filter, Search, MoreVertical, Brain, TrendingUp, Clock, Target, ChevronDown } from 'lucide-react';
import { useLeads, type Lead, useUpdateLeadStatus, useAIFollowUpSuggestions, useAILeadScoring, useAILeadEnrichment, useLeadToOrderConversion } from '@/hooks/useLeads';
import { LeadDialog } from '@/components/leads/LeadDialog';
import { useState, useCallback, useMemo } from 'react';
import { LeadCard } from '@/components/leads/LeadCard';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const Leads = () => {
  const kanbanColumns = [
    { id: 'new', title: 'Nye Leads', color: 'bg-blue-500' },
    { id: 'contacted', title: 'Kontaktet', color: 'bg-yellow-500' },
    { id: 'qualified', title: 'Kvalificeret', color: 'bg-orange-500' },
    { id: 'proposal', title: 'Tilbud Sendt', color: 'bg-purple-500' },
    { id: 'negotiation', title: 'Forhandling', color: 'bg-pink-500' },
    { id: 'closed-won', title: 'Lukket - Vundet', color: 'bg-green-500' },
    { id: 'closed-lost', title: 'Lukket - Tabt', color: 'bg-gray-500' },
  ];

  const { data: leads = [], isLoading } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showAISection, setShowAISection] = useState(false);
  const updateStatus = useUpdateLeadStatus();
  const convertToOrder = useLeadToOrderConversion();
  
  // AI Automation hooks
  const { data: aiData, isLoading: suggestionsLoading, error: aiError } = useAIFollowUpSuggestions();
  const followUpSuggestions = aiData?.suggestions || [];
  const aiScoring = useAILeadScoring();
  const aiEnrichment = useAILeadEnrichment();

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalLeads = leads.length;
    const highPriorityLeads = leads.filter(l => l.prioritet === 'Høj').length;
    const totalValue = leads.reduce((sum, l) => sum + (l.vaerdi || 0), 0);
    const urgentLeads = leads.filter(l => 
      l.prioritet === 'Høj' && (!l.sidste_kontakt || 
        (new Date().getTime() - new Date(l.sidste_kontakt).getTime()) > 3 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      totalLeads,
      highPriorityLeads,
      totalValue,
      urgentLeads
    };
  }, [leads]);

  // Centraliseret handler til at åbne dialogen
  const openEditDialog = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setIsEditDialogOpen(true);
  }, []);

  // Luk dialogen og clear state
  const closeEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    setTimeout(() => setSelectedLead(null), 200);
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as Lead['status'];
    
    try {
      // Update lead status
      await updateStatus.mutateAsync({ 
        id: draggableId, 
        status: newStatus
      });
      
      // If lead is moved to closed-won, automatically convert to order
      if (newStatus === 'closed-won') {
        const lead = leads.find(l => l.id === draggableId);
        if (lead) {
          console.log('Auto-converting won lead to order:', lead.id);
          await convertToOrder.mutateAsync(lead);
        }
      }
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
  };

  const handleAIScoring = async (leadId: string) => {
    try {
      await aiScoring.mutateAsync(leadId);
    } catch (error) {
      console.error('AI scoring failed:', error);
    }
  };

  const handleAIEnrichment = async (leadId: string) => {
    try {
      await aiEnrichment.mutateAsync(leadId);
    } catch (error) {
      console.error('AI enrichment failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 flex flex-col p-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              <Users className="h-7 w-7 text-blue-600" />
              CRM - Leads Management
            </h1>
            <p className="text-gray-600">Administrer dine leads gennem hele salgsprocessen</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrér
            </Button>
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Søg
            </Button>
            <LeadDialog />
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Total</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{analytics.totalLeads}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Værdi</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{analytics.totalValue.toLocaleString()} kr</p>
          </div>
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Høj Prioritet</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{analytics.highPriorityLeads}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Kræver Opfølgning</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{analytics.urgentLeads}</p>
          </div>
        </div>

        {/* Kanban Board - Main Focus */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-4 mb-4">
            {kanbanColumns.map((column) => (
              <Droppable droppableId={column.id} key={column.id}>
                {(provided, snapshot) => (
                  <Card 
                    ref={provided.innerRef} 
                    {...provided.droppableProps} 
                    className={`shadow-sm border-0 transition-all duration-200 ${
                      snapshot.isDraggingOver 
                        ? 'bg-blue-50 ring-2 ring-blue-400' 
                        : 'hover:shadow-md'
                    }`}
                  > 
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${column.color}`} />
                          <CardTitle className="text-sm font-medium text-gray-900">
                            {column.title}
                          </CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {leads.filter(l => l.status === column.id).length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 min-h-[120px]">
                      {isLoading ? (
                        <div className="text-center text-gray-400">Indlæser...</div>
                      ) : leads.filter(l => l.status === column.id).length === 0 ? (
                        <div className={`p-6 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg ${
                          snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                        }`}> 
                          <p className="text-sm">Træk leads hertil</p>
                        </div>
                      ) : (
                        <>
                          {leads.filter(lead => lead.status === column.id).map((lead, idx) => (
                            <Draggable draggableId={lead.id} index={idx} key={lead.id}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                  }}
                                  className="transition-all duration-200"
                                >
                                  <LeadCard
                                    lead={lead}
                                    onEdit={openEditDialog}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          <div style={{ minHeight: 24 }}>{provided.placeholder}</div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>

        {/* Rediger lead dialog */}
        {selectedLead && (
          <LeadDialog
            lead={selectedLead}
            open={isEditDialogOpen}
            onOpenChange={(open) => open ? setIsEditDialogOpen(true) : closeEditDialog()}
          />
        )}
      </div>
      
      {/* Compact AI Insights - Collapsible */}
      <div className="border-t border-gray-200 bg-gray-50">
        <Button
          variant="ghost"
          className="w-full justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          onClick={() => setShowAISection(!showAISection)}
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            AI Anbefalinger
            {followUpSuggestions.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {followUpSuggestions.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showAISection ? 'rotate-180' : ''}`} />
        </Button>
        
        {showAISection && (
          <div className="p-4 border-t border-gray-200 bg-white">
            {suggestionsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">AI analyserer leads...</p>
              </div>
            ) : aiError ? (
              <div className="text-center py-4 text-red-500">
                <p className="text-sm">Kunne ikke hente AI anbefalinger: {aiError.message}</p>
              </div>
            ) : followUpSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {followUpSuggestions.map((suggestion, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded border flex flex-col justify-between min-h-[110px]">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Badge 
                          variant={suggestion.priority === 'Høj' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {suggestion.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {typeof suggestion.estimatedValue === 'number' 
                            ? `${suggestion.estimatedValue.toLocaleString()} kr`
                            : suggestion.estimatedValue
                          }
                        </span>
                      </div>
                      <h5 className="font-medium text-xs text-gray-900 mb-0.5 truncate">
                        {suggestion.leadName}
                      </h5>
                      <p className="text-xs text-gray-600 mb-1 line-clamp-2">{suggestion.message}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-5 px-2"
                        onClick={() => {
                          const lead = leads.find(l => l.id === suggestion.leadId);
                          if (lead) openEditDialog(lead);
                        }}
                      >
                        Åbn
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-5 px-2"
                        onClick={() => handleAIScoring(suggestion.leadId)}
                        disabled={aiScoring.isPending}
                        title="AI Score: Vurder leadets kvalitet"
                      >
                        {aiScoring.isPending ? '...' : 'Score'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-5 px-2"
                        onClick={() => handleAIEnrichment(suggestion.leadId)}
                        disabled={aiEnrichment.isPending}
                        title="AI Berig: Tilføj ekstra data om leadet"
                      >
                        {aiEnrichment.isPending ? '...' : 'Berig'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Brain className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Ingen opfølgning forslag påkrævet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leads;
