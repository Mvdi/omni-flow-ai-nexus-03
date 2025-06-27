
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeAssignments } from '@/hooks/useEmployeeAssignments';
import { useOrders } from '@/hooks/useOrders';
import { User, Mail, Phone, MapPin, Clock, DollarSign, Plus } from 'lucide-react';

export const EmployeeOverview = () => {
  const { employees, loading: employeesLoading } = useEmployees();
  const { assignments, loading: assignmentsLoading } = useEmployeeAssignments();
  const { orders } = useOrders();

  const getEmployeeStats = (employeeId: string) => {
    const employeeOrders = orders.filter(order => order.assigned_employee_id === employeeId);
    const employeeAssignments = assignments.filter(assignment => assignment.employee_id === employeeId);
    
    const totalRevenue = employeeOrders.reduce((sum, order) => sum + order.price, 0);
    const totalHours = employeeOrders.reduce((sum, order) => sum + (order.estimated_duration || 2), 0);
    
    return {
      totalOrders: employeeOrders.length,
      totalCustomers: employeeAssignments.length,
      totalRevenue,
      totalHours,
      upcomingOrders: employeeOrders.filter(order => 
        order.status === 'Planlagt' && new Date(order.scheduled_date || '') >= new Date()
      ).length
    };
  };

  if (employeesLoading || assignmentsLoading) {
    return <div className="p-6">Indlæser medarbejder oversigt...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Medarbejder Oversigt</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tilføj Medarbejder
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map(employee => {
          const stats = getEmployeeStats(employee.id);
          const employeeAssignments = assignments.filter(assignment => assignment.employee_id === employee.id);
          
          return (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                        {employee.is_active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">{employee.phone}</span>
                    </div>
                  )}
                </div>

                {/* Specialties */}
                {employee.specialties.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Specialer</h4>
                    <div className="flex flex-wrap gap-1">
                      {employee.specialties.map(specialty => (
                        <Badge key={specialty} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preferred Areas */}
                {employee.preferred_areas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Foretrukne Områder</h4>
                    <div className="flex flex-wrap gap-1">
                      {employee.preferred_areas.map(area => (
                        <Badge key={area} variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalOrders}</div>
                    <div className="text-xs text-gray-600">Ordre Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.upcomingOrders}</div>
                    <div className="text-xs text-gray-600">Kommende</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{stats.totalCustomers}</div>
                    <div className="text-xs text-gray-600">Kunder</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{Math.round(stats.totalHours)}t</div>
                    <div className="text-xs text-gray-600">Timer</div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Omsætning</span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">
                        {stats.totalRevenue.toLocaleString()} kr
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned Customers */}
                {employeeAssignments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Tildelte Kunder</h4>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {employeeAssignments.slice(0, 3).map(assignment => (
                        <div key={assignment.id} className="text-xs text-gray-600 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {assignment.customer_name || assignment.customer_email}
                        </div>
                      ))}
                      {employeeAssignments.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{employeeAssignments.length - 3} flere...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
