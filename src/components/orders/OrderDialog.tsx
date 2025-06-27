
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Order } from '@/hooks/useOrders';

interface OrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  onSave: (orderData: any) => void;
}

export const OrderDialog = ({ isOpen, onClose, order, onSave }: OrderDialogProps) => {
  const [formData, setFormData] = useState({
    order_type: '',
    customer: '',
    customer_email: '',
    price: '',
    scheduled_week: '',
    scheduled_date: '',
    scheduled_time: '',
    status: 'Planlagt',
    comment: '',
    address: '',
    priority: 'Normal',
    estimated_duration: ''
  });

  useEffect(() => {
    if (order) {
      setFormData({
        order_type: order.order_type || '',
        customer: order.customer || '',
        customer_email: order.customer_email || '',
        price: order.price?.toString() || '',
        scheduled_week: order.scheduled_week?.toString() || '',
        scheduled_date: order.scheduled_date || '',
        scheduled_time: order.scheduled_time || '',
        status: order.status || 'Planlagt',
        comment: order.comment || '',
        address: order.address || '',
        priority: order.priority || 'Normal',
        estimated_duration: order.estimated_duration?.toString() || ''
      });
    } else {
      // Reset form for new order
      setFormData({
        order_type: '',
        customer: '',
        customer_email: '',
        price: '',
        scheduled_week: '',
        scheduled_date: '',
        scheduled_time: '',
        status: 'Planlagt',
        comment: '',
        address: '',
        priority: 'Normal',
        estimated_duration: ''
      });
    }
  }, [order, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const orderData = {
      order_type: formData.order_type,
      customer: formData.customer,
      customer_email: formData.customer_email || undefined,
      price: parseFloat(formData.price) || 0,
      scheduled_week: formData.scheduled_week ? parseInt(formData.scheduled_week) : undefined,
      scheduled_date: formData.scheduled_date || undefined,
      scheduled_time: formData.scheduled_time || undefined,
      status: formData.status,
      comment: formData.comment || undefined,
      address: formData.address || undefined,
      priority: formData.priority,
      estimated_duration: formData.estimated_duration ? parseFloat(formData.estimated_duration) : undefined
    };

    onSave(orderData);
  };

  const orderTypes = [
    'Vinduespolering',
    'Rengøring',
    'Algebehandling',
    'Impregnering',
    'Facaderengøring',
    'Gulvbehandling',
    'Andet'
  ];

  const statusOptions = [
    'Planlagt',
    'I gang',
    'Færdig',
    'Skal impregneres',
    'Skal algebehandles',
    'Skal planlægges om',
    'Annulleret'
  ];

  const priorityOptions = [
    'Lav',
    'Normal',
    'Høj',
    'Kritisk'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? 'Rediger Ordre' : 'Opret Ny Ordre'}
          </DialogTitle>
          <DialogDescription>
            {order ? 'Rediger ordreoplysningerne nedenfor.' : 'Udfyld oplysningerne for den nye ordre.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_type">Ordre Type *</Label>
              <Select 
                value={formData.order_type} 
                onValueChange={(value) => setFormData({...formData, order_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg ordre type" />
                </SelectTrigger>
                <SelectContent>
                  {orderTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioritet</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({...formData, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg prioritet" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Kunde *</Label>
              <Input
                id="customer"
                value={formData.customer}
                onChange={(e) => setFormData({...formData, customer: e.target.value})}
                placeholder="Kundens navn eller virksomhed"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_email">Kunde Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                placeholder="kunde@email.dk"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Fuld adresse hvor arbejdet skal udføres"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Pris (kr) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_week">Uge</Label>
              <Input
                id="scheduled_week"
                type="number"
                value={formData.scheduled_week}
                onChange={(e) => setFormData({...formData, scheduled_week: e.target.value})}
                placeholder="29"
                min="1"
                max="53"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_duration">Estimeret tid (timer)</Label>
              <Input
                id="estimated_duration"
                type="number"
                step="0.5"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})}
                placeholder="2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Specifik Dato</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Tidspunkt</Label>
              <Input
                id="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({...formData, status: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vælg status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Kommentar</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData({...formData, comment: e.target.value})}
              placeholder="Specielle instrukser, noter eller kommentarer til ordren..."
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
