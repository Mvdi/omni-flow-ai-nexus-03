import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SupportTicket } from '@/hooks/useTickets';
import { useCustomerSidebarData, useCreateOrUpdateCustomer, useUpdateCustomerNotes } from '@/hooks/useCustomers';
import { InternalNotesConversation } from './InternalNotesConversation';
import { TicketReminders } from './TicketReminders';
import { User, Phone, Calendar, Ticket, TrendingUp, AlertCircle, Edit, MapPin, Building, Hash, Plus, X } from 'lucide-react';
import { useTicketTags, useAddTicketTag, useRemoveTicketTag } from '@/hooks/useTicketTags';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface CustomerInfoProps {
  ticket: SupportTicket;
  onTicketSelect?: (ticketId: string) => void;
  currentTicketId?: string;
}

export const CustomerInfo = ({ ticket, onTicketSelect, currentTicketId }: CustomerInfoProps) => {
  const [newTag, setNewTag] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    navn: '',
    telefon: '',
    adresse: '',
    postnummer: '',
    by: '',
    cvr: '',
    virksomhedsnavn: ''
  });
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  // Fetch all sidebar data in one call
  const { data, isLoading, error } = useCustomerSidebarData(ticket.customer_email);
  const { data: tags = [] } = useTicketTags(ticket.id);
  const addTicketTag = useAddTicketTag();
  const removeTicketTag = useRemoveTicketTag();
  const updateCustomer = useCreateOrUpdateCustomer();
  const updateNotes = useUpdateCustomerNotes();

  // Prefill edit form and notes when dialog opens or data changes
  useEffect(() => {
    if (isEditing && data?.customer) {
      setEditForm({
        email: data.customer.email || '',
        navn: data.customer.navn || '',
        telefon: data.customer.telefon || '',
        adresse: data.customer.adresse || '',
        postnummer: data.customer.postnummer || '',
        by: data.customer.by || '',
        cvr: data.customer.cvr || '',
        virksomhedsnavn: data.customer.virksomhedsnavn || ''
      });
    }
  }, [isEditing, data?.customer]);

  useEffect(() => {
    if (data?.customer) {
      setNotes(data.customer.noter || '');
    }
  }, [data?.customer]);

  const getCustomerInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleSaveCustomer = () => {
    updateCustomer.mutate({
      email: editForm.email,
      navn: editForm.navn,
      telefon: editForm.telefon,
      adresse: editForm.adresse,
      postnummer: editForm.postnummer,
      by: editForm.by,
      cvr: editForm.cvr,
      virksomhedsnavn: editForm.virksomhedsnavn
    });
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    updateNotes.mutate({
      email: ticket.customer_email,
      noter: notes
    });
    setIsEditingNotes(false);
  };

  const handleTicketClick = (ticketId: string) => {
    if (onTicketSelect) {
      onTicketSelect(ticketId);
    } else {
      navigate(`/support?ticket=${ticketId}`);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    await addTicketTag.mutateAsync({
      ticketId: ticket.id,
      tagName: newTag.trim()
    });
    
    setNewTag('');
  };

  const handleRemoveTag = async (tagId: string) => {
    await removeTicketTag.mutateAsync(tagId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Debug logging
  console.log('CustomerInfo', { data, isLoading, error, ticket });

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Fejl
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-red-600">Kunne ikke hente kundeinformation. Prøv at genindlæse siden eller kontakt support.</p>
            <p className="text-xs text-gray-500">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer, stats, recentTickets } = data;

  // Hvis customer er null, opret kunden automatisk og reload data
  if (!customer) {
    // Opret kunden i baggrunden
    updateCustomer.mutate({
      email: ticket.customer_email,
      navn: ticket.customer_name || '',
      kundetype: 'Ny',
      score: 0
    });
    // Vis loader mens vi venter på at kunden oprettes
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    return (
      <div className="space-y-6">
        {/* Customer Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Kunde Information
              </div>
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Rediger
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Rediger kundeoplysninger</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="kunde@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="navn">Navn</Label>
                      <Input
                        id="navn"
                        value={editForm.navn}
                        onChange={(e) => setEditForm({...editForm, navn: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefon">Telefon</Label>
                      <Input
                        id="telefon"
                        value={editForm.telefon}
                        onChange={(e) => setEditForm({...editForm, telefon: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="adresse">Adresse</Label>
                      <Input
                        id="adresse"
                        value={editForm.adresse}
                        onChange={(e) => setEditForm({...editForm, adresse: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="postnummer">Postnummer</Label>
                        <Input
                          id="postnummer"
                          value={editForm.postnummer}
                          onChange={(e) => setEditForm({...editForm, postnummer: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="by">By</Label>
                        <Input
                          id="by"
                          value={editForm.by}
                          onChange={(e) => setEditForm({...editForm, by: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cvr">CVR nummer</Label>
                      <Input
                        id="cvr"
                        value={editForm.cvr}
                        onChange={(e) => setEditForm({...editForm, cvr: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="virksomhedsnavn">Virksomhedsnavn</Label>
                      <Input
                        id="virksomhedsnavn"
                        value={editForm.virksomhedsnavn}
                        onChange={(e) => setEditForm({...editForm, virksomhedsnavn: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveCustomer} className="flex-1">
                        Gem
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                        Annuller
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  {getCustomerInitials(customer?.navn, ticket.customer_email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{customer?.navn || ticket.customer_name || 'Anonym kunde'}</h3>
                <p className="text-sm text-gray-600">{ticket.customer_email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {customer?.telefon && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{customer.telefon}</span>
                </div>
              )}
              {customer?.adresse && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{customer.adresse}, {customer.postnummer} {customer.by}</span>
                </div>
              )}
              {customer?.cvr && (
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span>CVR: {customer.cvr}</span>
                </div>
              )}
              {customer?.virksomhedsnavn && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span>{customer.virksomhedsnavn}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  Sidste kontakt: {formatDistanceToNow(new Date(ticket.created_at), { 
                    addSuffix: true, 
                    locale: da 
                  })}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge variant="secondary">{customer?.kundetype || 'Ny'}</Badge>
              <Badge variant="outline">{ticket.priority}</Badge>
              {customer?.score !== undefined && (
                <Badge className={getScoreBadge(customer.score)}>
                  Score: {customer.score}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Kunde Statistik
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Totale tickets</span>
              <span className="font-semibold">{stats?.totalTickets || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Løste tickets</span>
              <span className="font-semibold text-green-600">{stats?.resolvedTickets || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Gns. responstid</span>
              <span className="font-semibold">{stats?.averageResponseTime || '0h'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Succes rate</span>
              <span className="font-semibold text-green-600">
                {stats?.successRate || 0}%
              </span>
            </div>
            {stats?.score !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Kundescore</span>
                <span className={`font-semibold ${getScoreColor(stats.score)}`}>
                  {stats.score}/100
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags - Keep existing ticket-level tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs flex items-center gap-1">
                  {tag.tag_name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 hover:bg-red-100"
                    onClick={() => handleRemoveTag(tag.id)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Tilføj nyt tag..."
                className="flex-1 h-8 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button 
                size="sm" 
                onClick={handleAddTag}
                disabled={!newTag.trim() || addTicketTag.isPending}
                className="h-8"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Internal Notes - positioned between Tags and Recent Tickets */}
        <InternalNotesConversation ticketId={ticket.id} />

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Seneste Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTickets && recentTickets.length > 0 ? (
              <div className="space-y-2">
                {recentTickets.map((recentTicket) => (
                  <div 
                    key={recentTicket.id}
                    className={`p-2 rounded text-sm cursor-pointer transition-colors ${
                      recentTicket.id === currentTicketId 
                        ? "bg-blue-50 border border-blue-200" 
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() => handleTicketClick(recentTicket.id)}
                  >
                    <div className="font-medium">{recentTicket.subject}</div>
                    <div className="text-gray-600 text-xs flex items-center gap-2">
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        recentTicket.status === 'Løst' || recentTicket.status === 'Lukket'
                          ? 'bg-green-100 text-green-800'
                          : recentTicket.status === 'I gang'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {recentTicket.status}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(recentTicket.created_at), { 
                          addSuffix: true, 
                          locale: da 
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Ingen tidligere tickets fundet.</p>
            )}
          </CardContent>
        </Card>

        {/* Ticket Reminders */}
        <TicketReminders ticketId={ticket.id} />
      </div>
    );
  }
};
