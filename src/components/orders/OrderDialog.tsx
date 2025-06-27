
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

interface OrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order?: any;
  onSave: (orderData: any) => void;
}

export const OrderDialog: React.FC<OrderDialogProps> = ({
  isOpen,
  onClose,
  order,
  onSave
}) => {
  const [formData, setFormData] = useState({
    customer: '',
    customer_email: '',
    order_type: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    bfe_number: '',
    price: 0,
    priority: 'Normal',
    estimated_duration: 120, // Default 2 hours in minutes
    comment: '',
    scheduled_date: '',
    scheduled_time: '',
    scheduled_week: null as number | null
  });

  useEffect(() => {
    if (order) {
      setFormData({
        customer: order.customer || '',
        customer_email: order.customer_email || '',
        order_type: order.order_type || '',
        address: order.address || '',
        latitude: order.latitude,
        longitude: order.longitude,
        bfe_number: order.bfe_number || '',
        price: order.price || 0,
        priority: order.priority || 'Normal',
        estimated_duration: order.estimated_duration || 120,
        comment: order.comment || '',
        scheduled_date: order.scheduled_date || '',
        scheduled_time: order.scheduled_time || '',
        scheduled_week: order.scheduled_week
      });
    } else {
      setFormData({
        customer: '',
        customer_email: '',
        order_type: '',
        address: '',
        latitude: null,
        longitude: null,
        bfe_number: '',
        price: 0,
        priority: 'Normal',
        estimated_duration: 120,
        comment: '',
        scheduled_date: '',
        scheduled_time: '',
        scheduled_week: null
      });
    }
  }, [order]);

  const handleAddressSelect = (addressData: any) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.address,
      latitude: addressData.latitude,
      longitude: addressData.longitude,
      bfe_number: addressData.bfe_number || ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const orderTypes = [
    'Rengøring',
    'Vinduespudsning',
    'Byggerengøring',
    'Kontorrengøring',
    'Privatrengøring',
    'Specialrengøring',
    'Vedligeholdelse'
  ];

  const priorities = ['Lav', 'Normal', 'Høj', 'Kritisk'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Rediger Ordre' : 'Ny Ordre'}</DialogTitle>
          <DialogDescription>
            {order ? 'Rediger ordre detaljer' : 'Opret en ny ordre'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">Kunde *</Label>
              <Input
                id="customer"
                value={formData.customer}
                onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer_email">Kunde Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="order_type">Ordre Type *</Label>
            <Select value={formData.order_type} onValueChange={(value) => setFormData(prev => ({ ...prev, order_type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg ordre type" />
              </SelectTrigger>
              <SelectContent>
                {orderTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <AddressAutocomplete
              label="Adresse"
              value={formData.address}
              onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
              onAddressSelect={handleAddressSelect}
              placeholder="Indtast adresse..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Pris (kr) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="priority">Prioritet</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(priority => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimated_duration">Estimeret tid (minutter)</Label>
              <Input
                id="estimated_duration"
                type="number"
                min="30"
                step="30"
                value={formData.estimated_duration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 120 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="scheduled_date">Planlagt Dato</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="scheduled_time">Planlagt Tid</Label>
              <Input
                id="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="scheduled_week">Uge</Label>
              <Input
                id="scheduled_week"
                type="number"
                min="1"
                max="53"
                value={formData.scheduled_week || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_week: parseInt(e.target.value) || null }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="comment">Kommentar</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuller
            </Button>
            <Button type="submit">
              {order ? 'Gem Ændringer' : 'Opret Ordre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
