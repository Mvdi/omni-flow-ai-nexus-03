
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

interface OrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order?: any;
  onSave: (orderData: any) => void;
}

export const OrderDialog = ({ isOpen, onClose, order, onSave }: OrderDialogProps) => {
  const [formData, setFormData] = useState({
    orderType: '',
    customer: '',
    customerEmail: '',
    price: '',
    scheduledWeek: '',
    scheduledDate: '',
    scheduledTime: '',
    status: 'Planlagt',
    comment: '',
    address: '',
    priority: 'Normal',
    estimatedDuration: ''
  });

  useEffect(() => {
    if (order) {
      setFormData({
        orderType: order.orderType || '',
        customer: order.customer || '',
        customerEmail: order.customerEmail || '',
        price: order.price?.toString() || '',
        scheduledWeek: order.scheduledWeek?.toString() || '',
        scheduledDate: order.scheduledDate || '',
        scheduledTime: order.scheduledTime || '',
        status: order.status || 'Planlagt',
        comment: order.comment || '',
        address: order.address || '',
        priority: order.priority || 'Normal',
        estimatedDuration: order.estimatedDuration?.toString() || ''
      });
    } else {
      // Reset form for new order
      setFormData({
        orderType: '',
        customer: '',
        customerEmail: '',
        price: '',
        scheduledWeek: '',
        scheduledDate: '',
        scheduledTime: '',
        status: 'Planlagt',
        comment: '',
        address: '',
        priority: 'Normal',
        estimatedDuration: ''
      });
    }
  }, [order, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const orderData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      scheduledWeek: parseInt(formData.scheduledWeek) || 0,
      estimatedDuration: parseFloat(formData.estimatedDuration) || 0,
      id: order?.id || `ORD-${Date.now()}`
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
              <Label htmlFor="orderType">Ordre Type *</Label>
              <Select 
                value={formData.orderType} 
                onValueChange={(value) => setFormData({...formData, orderType: value})}
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
              <Label htmlFor="customerEmail">Kunde Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
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
              <Label htmlFor="scheduledWeek">Uge</Label>
              <Input
                id="scheduledWeek"
                type="number"
                value={formData.scheduledWeek}
                onChange={(e) => setFormData({...formData, scheduledWeek: e.target.value})}
                placeholder="29"
                min="1"
                max="53"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Estimeret tid (timer)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                step="0.5"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({...formData, estimatedDuration: e.target.value})}
                placeholder="2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Specifik Dato</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Tidspunkt</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
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
