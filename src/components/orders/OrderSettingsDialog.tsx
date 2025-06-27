import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from 'lucide-react';

interface OrderSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
}

export const OrderSettingsDialog = ({ isOpen, onClose, onSave }: OrderSettingsDialogProps) => {
  const [orderTypes, setOrderTypes] = useState([
    { id: 1, name: 'Vinduespolering', enabled: true },
    { id: 2, name: 'Rengøring', enabled: true },
    { id: 3, name: 'Algebehandling', enabled: true },
    { id: 4, name: 'Impregnering', enabled: true },
    { id: 5, name: 'Facaderengøring', enabled: true },
    { id: 6, name: 'Gulvbehandling', enabled: true },
    { id: 7, name: 'Andet', enabled: true }
  ]);

  const [statusOptions, setStatusOptions] = useState([
    { id: 1, name: 'Ikke planlagt', enabled: true, color: '#6B7280' },
    { id: 2, name: 'Planlagt', enabled: true, color: '#3B82F6' },
    { id: 3, name: 'I gang', enabled: true, color: '#F59E0B' },
    { id: 4, name: 'Færdig', enabled: true, color: '#10B981' },
    { id: 5, name: 'Skal impregneres', enabled: true, color: '#8B5CF6' },
    { id: 6, name: 'Skal algebehandles', enabled: true, color: '#F97316' },
    { id: 7, name: 'Skal planlægges om', enabled: true, color: '#EF4444' },
    { id: 8, name: 'Annulleret', enabled: true, color: '#6B7280' }
  ]);

  const [newOrderType, setNewOrderType] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3B82F6');

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('orderSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.orderTypes) {
          setOrderTypes(settings.orderTypes);
        }
        if (settings.statusOptions) {
          setStatusOptions(settings.statusOptions);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, [isOpen]);

  const addOrderType = () => {
    if (newOrderType.trim()) {
      setOrderTypes([...orderTypes, {
        id: Date.now(),
        name: newOrderType.trim(),
        enabled: true
      }]);
      setNewOrderType('');
    }
  };

  const removeOrderType = (id: number) => {
    setOrderTypes(orderTypes.filter(type => type.id !== id));
  };

  const toggleOrderType = (id: number) => {
    setOrderTypes(orderTypes.map(type => 
      type.id === id ? { ...type, enabled: !type.enabled } : type
    ));
  };

  const addStatus = () => {
    if (newStatus.trim()) {
      setStatusOptions([...statusOptions, {
        id: Date.now(),
        name: newStatus.trim(),
        enabled: true,
        color: newStatusColor
      }]);
      setNewStatus('');
      setNewStatusColor('#3B82F6');
    }
  };

  const removeStatus = (id: number) => {
    setStatusOptions(statusOptions.filter(status => status.id !== id));
  };

  const toggleStatus = (id: number) => {
    setStatusOptions(statusOptions.map(status => 
      status.id === id ? { ...status, enabled: !status.enabled } : status
    ));
  };

  const updateStatusColor = (id: number, color: string) => {
    setStatusOptions(statusOptions.map(status => 
      status.id === id ? { ...status, color } : status
    ));
  };

  const handleSave = () => {
    const settings = {
      orderTypes: orderTypes.filter(type => type.enabled),
      statusOptions: statusOptions.filter(status => status.enabled)
    };
    
    // Save to localStorage
    localStorage.setItem('orderSettings', JSON.stringify(settings));
    
    onSave(settings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ordre Indstillinger</DialogTitle>
          <DialogDescription>
            Tilpas ordretyper, statusser og andre indstillinger efter dine behov.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Types */}
          <Card>
            <CardHeader>
              <CardTitle>Ordretyper</CardTitle>
              <CardDescription>
                Administrer tilgængelige ordretyper
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {orderTypes.map((type) => (
                  <div key={type.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={type.enabled}
                        onCheckedChange={() => toggleOrderType(type.id)}
                      />
                      <span className={type.enabled ? '' : 'text-gray-500 line-through'}>
                        {type.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOrderType(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Ny ordretype"
                  value={newOrderType}
                  onChange={(e) => setNewOrderType(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addOrderType()}
                />
                <Button onClick={addOrderType} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status Options */}
          <Card>
            <CardHeader>
              <CardTitle>Status Muligheder</CardTitle>
              <CardDescription>
                Administrer tilgængelige statusser og deres farver
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <div key={status.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={status.enabled}
                        onCheckedChange={() => toggleStatus(status.id)}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className={status.enabled ? '' : 'text-gray-500 line-through'}>
                        {status.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={status.color}
                        onChange={(e) => updateStatusColor(status.id, e.target.value)}
                        className="w-8 h-8 border rounded cursor-pointer"
                        disabled={!status.enabled}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStatus(status.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Ny status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addStatus()}
                  />
                  <input
                    type="color"
                    value={newStatusColor}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                    className="w-10 h-10 border rounded cursor-pointer"
                  />
                  <Button onClick={addStatus} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuller
          </Button>
          <Button onClick={handleSave}>
            Gem Indstillinger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
