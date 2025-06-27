
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployees } from '@/hooks/useEmployees';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { toast } from 'sonner';
import { Clock, Save } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mandag' },
  { value: 2, label: 'Tirsdag' },
  { value: 3, label: 'Onsdag' },
  { value: 4, label: 'Torsdag' },
  { value: 5, label: 'Fredag' },
  { value: 6, label: 'Lørdag' },
  { value: 0, label: 'Søndag' }
];

export const WorkScheduleManagement = () => {
  const { employees } = useEmployees();
  const { workSchedules, createWorkSchedule, updateWorkSchedule } = useWorkSchedules();
  const [scheduleData, setScheduleData] = useState<Record<string, any>>({});

  const getEmployeeSchedule = (employeeId: string, dayOfWeek: number) => {
    return workSchedules.find(ws => 
      ws.employee_id === employeeId && ws.day_of_week === dayOfWeek
    );
  };

  const handleScheduleChange = (employeeId: string, dayOfWeek: number, field: string, value: any) => {
    const key = `${employeeId}_${dayOfWeek}`;
    setScheduleData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        employee_id: employeeId,
        day_of_week: dayOfWeek,
        [field]: value
      }
    }));
  };

  const saveSchedule = async (employeeId: string, dayOfWeek: number) => {
    const key = `${employeeId}_${dayOfWeek}`;
    const data = scheduleData[key];
    
    if (!data) return;

    try {
      const existingSchedule = getEmployeeSchedule(employeeId, dayOfWeek);
      
      const schedulePayload = {
        employee_id: employeeId,
        day_of_week: dayOfWeek,
        start_time: data.start_time || '08:00',
        end_time: data.end_time || '17:00',
        is_working_day: data.is_working_day !== undefined ? data.is_working_day : true
      };

      if (existingSchedule) {
        await updateWorkSchedule(existingSchedule.id, schedulePayload);
      } else {
        await createWorkSchedule(schedulePayload);
      }

      // Clear the temporary data
      setScheduleData(prev => {
        const newData = { ...prev };
        delete newData[key];
        return newData;
      });

      toast.success('Arbejdstid gemt');
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Fejl ved gemning af arbejdstid');
    }
  };

  const getScheduleValue = (employeeId: string, dayOfWeek: number, field: string) => {
    const key = `${employeeId}_${dayOfWeek}`;
    const tempData = scheduleData[key];
    if (tempData && tempData[field] !== undefined) {
      return tempData[field];
    }

    const existingSchedule = getEmployeeSchedule(employeeId, dayOfWeek);
    if (existingSchedule) {
      return existingSchedule[field as keyof typeof existingSchedule];
    }

    // Defaults
    if (field === 'start_time') return '08:00';
    if (field === 'end_time') return '17:00';
    if (field === 'is_working_day') return true;
    
    return '';
  };

  const hasUnsavedChanges = (employeeId: string, dayOfWeek: number) => {
    const key = `${employeeId}_${dayOfWeek}`;
    return !!scheduleData[key];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Arbejdstidsplanlægning
        </CardTitle>
        <p className="text-sm text-gray-600">
          Definer arbejdstider for hver medarbejder og dag. Dette bruges til automatisk ruteplanlægning.
        </p>
      </CardHeader>
      <CardContent>
        {employees.filter(e => e.is_active).length === 0 ? (
          <p className="text-gray-500">Ingen aktive medarbejdere fundet. Tilføj medarbejdere først.</p>
        ) : (
          <div className="space-y-6">
            {employees.filter(e => e.is_active).map(employee => (
              <div key={employee.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-4">{employee.name}</h3>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dag</TableHead>
                      <TableHead>Arbejder</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Slut</TableHead>
                      <TableHead>Timer</TableHead>
                      <TableHead>Handlinger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DAYS_OF_WEEK.map(day => {
                      const isWorkingDay = getScheduleValue(employee.id, day.value, 'is_working_day');
                      const startTime = getScheduleValue(employee.id, day.value, 'start_time');
                      const endTime = getScheduleValue(employee.id, day.value, 'end_time');
                      
                      const calculateHours = () => {
                        if (!isWorkingDay || !startTime || !endTime) return 0;
                        const start = new Date(`2000-01-01T${startTime}:00`);
                        const end = new Date(`2000-01-01T${endTime}:00`);
                        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        return Math.max(0, diff);
                      };

                      return (
                        <TableRow key={day.value}>
                          <TableCell className="font-medium">{day.label}</TableCell>
                          <TableCell>
                            <Switch
                              checked={isWorkingDay}
                              onCheckedChange={(checked) => 
                                handleScheduleChange(employee.id, day.value, 'is_working_day', checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={startTime}
                              disabled={!isWorkingDay}
                              onChange={(e) => 
                                handleScheduleChange(employee.id, day.value, 'start_time', e.target.value)
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={endTime}
                              disabled={!isWorkingDay}
                              onChange={(e) => 
                                handleScheduleChange(employee.id, day.value, 'end_time', e.target.value)
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            {isWorkingDay ? (
                              <Badge variant={calculateHours() > 0 ? "default" : "destructive"}>
                                {calculateHours().toFixed(1)}t
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Fri</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasUnsavedChanges(employee.id, day.value) && (
                              <Button
                                size="sm"
                                onClick={() => saveSchedule(employee.id, day.value)}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Gem
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
