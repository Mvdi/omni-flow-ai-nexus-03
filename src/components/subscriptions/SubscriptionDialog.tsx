import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { CustomerSearch, Customer } from "@/components/ui/customer-search";
import type { Subscription, CreateSubscriptionData } from '@/hooks/useSubscriptions';

interface SubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscription?: Subscription | null;
  prefilledData?: any;
  onSave: (data: CreateSubscriptionData) => Promise<void>;
}

export const SubscriptionDialog = ({ isOpen, onClose, subscription, prefilledData, onSave }: SubscriptionDialogProps) => {
  const [formData, setFormData] = useState<CreateSubscriptionData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    service_type: '',
    interval_weeks: 8,
    price: 0,
    estimated_duration: 0,
    description: '',
    notes: '',
    images: [],
    start_date: new Date().toISOString().split('T')[0],
    auto_create_orders: true,
    send_notifications: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  // Load service types from order settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('orderSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.orderTypes && Array.isArray(settings.orderTypes)) {
          const settingsTypes = settings.orderTypes.map((t: any) => t.name || t);
          setServiceTypes(settingsTypes);
        }
      } catch (error) {
        console.error('Error loading order settings:', error);
        setServiceTypes(['Vinduespudsning', 'Fliserens', 'Facaderens', 'Tagmaling', 'Graffitijernelse', 'Anden service']);
      }
    } else {
      setServiceTypes(['Vinduespudsning', 'Fliserens', 'Facaderens', 'Tagmaling', 'Graffitijernelse', 'Anden service']);
    }
  }, [isOpen]);

  useEffect(() => {
    if (subscription) {
      setFormData({
        customer_name: subscription.customer_name,
        customer_email: subscription.customer_email,
        customer_phone: subscription.customer_phone || '',
        customer_address: subscription.customer_address || '',
        service_type: subscription.service_type,
        interval_weeks: subscription.interval_weeks,
        price: subscription.price,
        estimated_duration: subscription.estimated_duration,
        description: subscription.description || '',
        notes: subscription.notes || '',
        images: subscription.images,
        start_date: subscription.start_date,
        auto_create_orders: subscription.auto_create_orders,
        send_notifications: subscription.send_notifications,
      });
    } else if (prefilledData) {
      setFormData({
        customer_name: prefilledData.customer_name || '',
        customer_email: prefilledData.customer_email || '',
        customer_phone: prefilledData.customer_phone || '',
        customer_address: prefilledData.customer_address || '',
        service_type: prefilledData.service_type || serviceTypes[0] || '',
        interval_weeks: prefilledData.interval_weeks || 8,
        price: prefilledData.price || 0,
        estimated_duration: prefilledData.estimated_duration || 0,
        description: prefilledData.description || '',
        notes: prefilledData.notes || '',
        images: prefilledData.images || [],
        start_date: prefilledData.start_date || new Date().toISOString().split('T')[0],
        auto_create_orders: prefilledData.auto_create_orders ?? true,
        send_notifications: prefilledData.send_notifications ?? true,
      });
    } else {
      setFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
        service_type: serviceTypes[0] || '',
        interval_weeks: 8,
        price: 0,
        estimated_duration: 0,
        description: '',
        notes: '',
        images: [],
        start_date: new Date().toISOString().split('T')[0],
        auto_create_orders: true,
        send_notifications: true,
      });
    }
    setSelectedCustomer(null);
  }, [subscription, prefilledData, isOpen, serviceTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving subscription:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer_name: customer.navn || customer.email,
      customer_email: customer.email,
      customer_phone: customer.telefon || ''
    }));
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      customer_name: '',
      customer_email: '',
      customer_phone: ''
    }));
  };

  const handleAddressSelect = (addressData: any) => {
    setFormData(prev => ({
      ...prev,
      customer_address: addressData.address
    }));
  };

  const handleInputChange = (field: keyof CreateSubscriptionData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const commonIntervals = [
    { value: 2, label: 'Hver 2. uge' },
    { value: 4, label: 'Hver måned (4 uger)' },
    { value: 6, label: 'Hver 6. uge' },
    { value: 8, label: 'Hver 8. uge' },
    { value: 12, label: 'Hvert kvartal (12 uger)' },
    { value: 26, label: 'Hver halve år (26 uger)' },
    { value: 52, label: 'Årligt (52 uger)' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {subscription ? 'Rediger Abonnement' : 'Opret Nyt Abonnement'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Kunde Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Kunde Information</h3>
            
            {selectedCustomer ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-green-900">
                        {selectedCustomer.navn || 'Ingen navn'}
                      </p>
                      <p className="text-sm text-green-700">{selectedCustomer.email}</p>
                      {selectedCustomer.telefon && (
                        <p className="text-sm text-green-700">{selectedCustomer.telefon}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelectedCustomer}
                  >
                    Skift kunde
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <CustomerSearch
                  onCustomerSelect={handleCustomerSelect}
                  placeholder="Søg efter eksisterende kunde..."
                  label="Søg kunde"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_name">Kunde Navn *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => handleInputChange('customer_name', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customer_email">Email *</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => handleInputChange('customer_email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_phone">Telefon</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <AddressAutocomplete
                label="Adresse"
                value={formData.customer_address}
                onChange={(value) => handleInputChange('customer_address', value)}
                onAddressSelect={handleAddressSelect}
                placeholder="Indtast adresse..."
              />
            </div>
          </div>

          {/* Service Detaljer */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Service Detaljer</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service_type">Service Type *</Label>
                <Select value={formData.service_type} onValueChange={(value) => handleInputChange('service_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="interval_weeks">Interval *</Label>
                <Select 
                  value={formData.interval_weeks.toString()} 
                  onValueChange={(value) => handleInputChange('interval_weeks', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commonIntervals.map(interval => (
                      <SelectItem key={interval.value} value={interval.value.toString()}>
                        {interval.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Pris (DKK) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="estimated_duration">Estimeret Varighed (minutter)</Label>
                <Input
                  id="estimated_duration"
                  type="number"
                  min="0"
                  value={formData.estimated_duration || ''}
                  onChange={(e) => handleInputChange('estimated_duration', e.target.value === '' ? 0 : parseInt(e.target.value))}
                  placeholder="Indtast varighed i minutter"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="start_date">Start Dato *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Beskrivelse og Noter */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Beskrivelse og Noter</h3>
            
            <div>
              <Label htmlFor="description">Service Beskrivelse</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Beskrivelse af servicen..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notes">Specielle Noter</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="F.eks. skal huske stige, specielle krav..."
                rows={3}
              />
            </div>
          </div>

          {/* Indstillinger */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Indstillinger</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_create_orders">Automatisk Ordre Oprettelse</Label>
                <p className="text-sm text-gray-600">Opret automatisk ordre 1 uge før udførelse</p>
              </div>
              <Switch
                id="auto_create_orders"
                checked={formData.auto_create_orders}
                onCheckedChange={(checked) => handleInputChange('auto_create_orders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="send_notifications">Send Notifikationer</Label>
                <p className="text-sm text-gray-600">Send automatiske påmindelser til kunden</p>
              </div>
              <Switch
                id="send_notifications"
                checked={formData.send_notifications}
                onCheckedChange={(checked) => handleInputChange('send_notifications', checked)}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuller
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Gemmer...' : subscription ? 'Opdater' : 'Opret'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};