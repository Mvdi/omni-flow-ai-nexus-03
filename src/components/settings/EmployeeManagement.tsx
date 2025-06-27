
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEmployees, CreateEmployeeData } from '@/hooks/useEmployees';
import { Plus, Edit, Trash2, User, MapPin, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const SPECIALTY_OPTIONS = [
  'Vinduespolering',
  'Facaderengøring',
  'Gulvrengøring',
  'Kontorrengøring',
  'Byggegrundsrengøring',
  'Trappeopgang',
  'Specialrengøring'
];

const AREA_OPTIONS = [
  'København',
  'Frederiksberg',
  'Gentofte',
  'Gladsaxe',
  'Herlev',
  'Rødovre',
  'Albertslund',
  'Ballerup',
  'Brøndby',
  'Høje-Taastrup'
];

export const EmployeeManagement = () => {
  const { employees, loading, createEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [formData, setFormData] = useState<CreateEmployeeData>({
    name: '',
    email: '',
    phone: '',
    specialties: [],
    preferred_areas: [],
    max_hours_per_day: 8,
    hourly_rate: 0,
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Navn og email er påkrævet');
      return;
    }

    try {
      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id, formData);
      } else {
        await createEmployee(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const handleEdit = (employee: any) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      specialties: employee.specialties || [],
      preferred_areas: employee.preferred_areas || [],
      max_hours_per_day: employee.max_hours_per_day,
      hourly_rate: employee.hourly_rate || 0,
      is_active: employee.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Er du sikker på, at du vil slette denne medarbejder?')) {
      await deleteEmployee(id);
    }
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialties: [],
      preferred_areas: [],
      max_hours_per_day: 8,
      hourly_rate: 0,
      is_active: true
    });
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const toggleArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_areas: prev.preferred_areas.includes(area)
        ? prev.preferred_areas.filter(a => a !== area)
        : [...prev.preferred_areas, area]
    }));
  };

  if (loading) {
    return <div className="p-6">Indlæser medarbejdere...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Medarbejderadministration</h2>
          <p className="text-gray-600">Administrer medarbejdere og deres specialer</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Ny Medarbejder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEmployee ? 'Rediger Medarbejder' : 'Ny Medarbejder'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Navn *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="hourly_rate">Timeløn (kr)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="max_hours">Max timer per dag</Label>
                <Input
                  id="max_hours"
                  type="number"
                  step="0.5"
                  value={formData.max_hours_per_day}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_hours_per_day: parseFloat(e.target.value) || 8 }))}
                />
              </div>

              <div>
                <Label>Specialer</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SPECIALTY_OPTIONS.map(specialty => (
                    <div key={specialty} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.specialties.includes(specialty)}
                        onChange={() => toggleSpecialty(specialty)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{specialty}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Foretrukne områder</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AREA_OPTIONS.map(area => (
                    <div key={area} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.preferred_areas.includes(area)}
                        onChange={() => toggleArea(area)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Aktiv medarbejder</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuller
                </Button>
                <Button type="submit">
                  {selectedEmployee ? 'Opdater' : 'Opret'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medarbejdere ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Specialer</TableHead>
                <TableHead>Områder</TableHead>
                <TableHead>Timer/dag</TableHead>
                <TableHead>Timeløn</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {employee.specialties?.slice(0, 2).map(specialty => (
                        <Badge key={specialty} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {employee.specialties?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{employee.specialties.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {employee.preferred_areas?.slice(0, 2).map(area => (
                        <Badge key={area} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                      {employee.preferred_areas?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{employee.preferred_areas.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{employee.max_hours_per_day}t</TableCell>
                  <TableCell>{employee.hourly_rate ? `${employee.hourly_rate} kr` : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(employee.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
