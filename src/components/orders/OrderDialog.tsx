
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order?: any;
  onSave: (orderData: any) => void;
  currentWeek?: Date;
}

export const OrderDialog: React.FC<OrderDialogProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
  currentWeek = new Date()
}) => {
  const [orderTypes, setOrderTypes] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [schedulingType, setSchedulingType] = useState<'unplanned' | 'week' | 'date' | 'datetime'>('unplanned');
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
    estimated_duration: 0,
    comment: '',
    scheduled_date: '',
    scheduled_time: '',
    scheduled_week: null as number | null,
    status: 'Ikke planlagt'
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('orderSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.orderTypes && Array.isArray(settings.orderTypes)) {
          const settingsTypes = settings.orderTypes.map((t: any) => t.name || t);
          setOrderTypes(settingsTypes);
        }
        if (settings.statusOptions && Array.isArray(settings.statusOptions)) {
          setStatusOptions(settings.statusOptions);
        }
      } catch (error) {
        console.error('Error loading order settings:', error);
        setOrderTypes(['Rengøring', 'Vinduespudsning', 'Byggerengøring', 'Kontorrengøring', 'Privatrengøring', 'Specialrengøring', 'Vedligeholdelse']);
        setStatusOptions([
          { name: 'Ikke planlagt', color: '#6B7280' },
          { name: 'Planlagt', color: '#3B82F6' },
          { name: 'I gang', color: '#F59E0B' },
          { name: 'Færdig', color: '#10B981' }
        ]);
      }
    } else {
      setOrderTypes(['Rengøring', 'Vinduespudsning', 'Byggerengøring', 'Kontorrengøring', 'Privatrengøring', 'Specialrengøring', 'Vedligeholdelse']);
      setStatusOptions([
        { name: 'Ikke planlagt', color: '#6B7280' },
        { name: 'Planlagt', color: '#3B82F6' },
        { name: 'I gang', color: '#F59E0B' },
        { name: 'Færdig', color: '#10B981' }
      ]);
    }
  }, [isOpen]);

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
        estimated_duration: order.estimated_duration || 0,
        comment: order.comment || '',
        scheduled_date: order.scheduled_date || '',
        scheduled_time: order.scheduled_time || '',
        scheduled_week: order.scheduled_week,
        status: order.status || 'Ikke planlagt'
      });

      // Determine scheduling type based on existing data
      if (order.scheduled_date && order.scheduled_time) {
        setSchedulingType('datetime');
      } else if (order.scheduled_date) {
        setSchedulingType('date');
      } else if (order.scheduled_week) {
        setSchedulingType('week');
      } else {
        setSchedulingType('unplanned');
      }
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
        estimated_duration: 0,
        comment: '',
        scheduled_date: '',
        scheduled_time: '',
        scheduled_week: null,
        status: 'Ikke planlagt'
      });
      setSchedulingType('unplanned');
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

  const handleSchedulingTypeChange = (type: string) => {
    setSchedulingType(type as 'unplanned' | 'week' | 'date' | 'datetime');
    
    // Clear scheduling fields when changing type
    setFormData(prev => ({
      ...prev,
      scheduled_date: type === 'unplanned' ? '' : prev.scheduled_date,
      scheduled_time: (type === 'unplanned' || type === 'week' || type === 'date') ? '' : prev.scheduled_time,
      scheduled_week: (type === 'unplanned' || type === 'date' || type === 'datetime') ? null : prev.scheduled_week,
      status: type === 'unplanned' ? 'Ikke planlagt' : prev.status
    }));
  };

  const getCurrentWeekNumber = (date: Date = currentWeek) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data based on scheduling type
    let finalData = { ...formData };
    
    switch (schedulingType) {
      case 'unplanned':
        finalData.scheduled_date = '';
        finalData.scheduled_time = '';
        finalData.scheduled_week = null;
        finalData.status = 'Ikke planlagt';
        break;
      case 'week':
        finalData.scheduled_date = '';
        finalData.scheduled_time = '';
        // Use the current week number if not set
        if (!finalData.scheduled_week) {
          finalData.scheduled_week = getCurrentWeekNumber();
        }
        finalData.status = 'Planlagt';
        break;
      case 'date':
        finalData.scheduled_time = '';
        // Calculate week from date
        if (finalData.scheduled_date) {
          const date = new Date(finalData.scheduled_date);
          finalData.scheduled_week = getCurrentWeekNumber(date);
        }
        finalData.status = 'Planlagt';
        break;
      case 'datetime':
        // Calculate week from date
        if (finalData.scheduled_date) {
          const date = new Date(finalData.scheduled_date);
          finalData.scheduled_week = getCurrentWeekNumber(date);
        }
        finalData.status = 'Planlagt';
        break;
    }

    console.log('Submitting form data:', finalData);
    onSave(finalData);
  };

  const handleEstimatedDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setFormData(prev => ({ 
        ...prev, 
        estimated_duration: value === '' ? 0 : Number(value)
      }));
    }
  };

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
                min="0"
                step="1"
                value={formData.estimated_duration}
                onChange={handleEstimatedDurationChange}
                placeholder="0"
              />
            </div>
          </div>

          {/* Scheduling Section */}
          <div className="space-y-4">
            <Label>Planlægning</Label>
            <RadioGroup value={schedulingType} onValueChange={handleSchedulingTypeChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unplanned" id="unplanned" />
                <Label htmlFor="unplanned">Ikke planlagt (lad systemet planlægge)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="week" />
                <Label htmlFor="week">Planlæg til bestemt uge</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date" id="date" />
                <Label htmlFor="date">Planlæg til bestemt dag</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="datetime" id="datetime" />
                <Label htmlFor="datetime">Planlæg til bestemt dag og tid</Label>
              </div>
            </RadioGroup>

            {/* Conditional scheduling inputs */}
            {schedulingType === 'week' && (
              <div>
                <Label htmlFor="scheduled_week">Uge nummer</Label>
                <Input
                  id="scheduled_week"
                  type="number"
                  min="1"
                  max="53"
                  value={formData.scheduled_week || getCurrentWeekNumber()}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_week: parseInt(e.target.value) || null }))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Nuværende uge: {getCurrentWeekNumber()}
                </p>
              </div>
            )}

            {(schedulingType === 'date' || schedulingType === 'datetime') && (
              <div>
                <Label htmlFor="scheduled_date">Dato</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  required
                />
              </div>
            )}

            {schedulingType === 'datetime' && (
              <div>
                <Label htmlFor="scheduled_time">Tid</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                  required
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status.name} value={status.name}>{status.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
