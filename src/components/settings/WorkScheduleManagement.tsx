
import React, { useState, useEffect } from 'react';
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
import { Clock, Save, Zap } from 'lucide-react';

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

  // Auto-create default work schedules for all employees
  useEffect(() => {
    const createDefaultSchedules = async () => {
      if (!employees.length) return;

      console.log('🕐 Checking for missing work schedules...');
      
      let created = 0;
      for (const employee of employees.filter(e => e.is_active)) {
        // Check for missing weekday schedules (Mon-Fri)
        for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
          const existingSchedule = workSchedules.find(ws => 
            ws.employee_id === employee.id && ws.day_of_week === dayOfWeek
          );
          
          if (!existingSchedule) {
            try {
              await createWorkSchedule({
                employee_id: employee.id,
                day_of_week: dayOfWeek,
                start_time: '08:00',
                end_time: '16:00',
                is_working_day: true
              });
              created++;
            } catch (error) {
              console.error('Error creating default schedule:', error);
            }
          }
        }
      }
      
      if (created > 0) {
        console.log(`✅ Created ${created} default work schedules`);
        toast.success(`Oprettet ${created} standard arbejdstider (08:00-16:00)`);
      }
    };

    // Create default schedules after a short delay to allow data to load
    const timer = setTimeout(createDefaultSchedules, 1000);
    return () => clearTimeout(timer);
  }, [employees.length, workSchedules.length]);

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
      
      // Ensure times are in correct format
      const startTime = data.start_time || '08:00';
      const endTime = data.end_time || '16:00';
      
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        toast.error('Ugyldig tidsformat. Brug HH:MM format (f.eks. 08:00)');
        return;
      }
      
      const schedulePayload = {
        employee_id: employeeId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_working_day: data.is_working_day !== undefined ? data.is_working_day : true
      };

      console.log('Saving schedule:', schedulePayload);

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

  const createWeekdaySchedulesForAll = async () => {
    console.log('🚀 Creating standard weekday schedules for all employees...');
    
    let created = 0;
    for (const employee of employees.filter(e => e.is_active)) {
      for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
        const existingSchedule = getEmployeeSchedule(employee.id, dayOfWeek);
        
        if (!existingSchedule) {
          try {
            await createWorkSchedule({
              employee_id: employee.id,
              day_of_week: dayOfWeek,
              start_time: '08:00',
              end_time: '16:00',
              is_working_day: true
            });
            created++;
          } catch (error) {
            console.error('Error creating schedule:', error);
          }
        }
      }
    }
    
    toast.success(`Oprettet ${created} standard arbejdstider (Mandag-Fredag 08:00-16:00)`);
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

    // Defaults for weekdays
    if (field === 'start_time') return '08:00';
    if (field === 'end_time') return '16:00';
    if (field === 'is_working_day') return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri default
    
    return '';
  };

  const hasUnsavedChanges = (employeeId: string, dayOfWeek: number) => {
    const key = `${employeeId}_${dayOfWeek}`;
    return !!scheduleData[key];
  };

  const calculateHours = (startTime: string, endTime: string, isWorkingDay: boolean) => {
    if (!isWorkingDay || !startTime || !endTime) return 0;
    
    try {
      // Parse times
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      const diffMinutes = endMinutes - startMinutes;
      return Math.max(0, diffMinutes / 60);
    } catch (error) {
      return 0;
    }
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
        <div className="flex gap-2 mt-4">
          <Button 
            onClick={createWeekdaySchedulesForAll}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Zap className="h-4 w-4" />
            Opret Standard Arbejdstider (Man-Fre 08-16)
          </Button>
        </div>
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
                      
                      const hours = calculateHours(startTime, endTime, isWorkingDay);

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
                              className="w-32"
                              min="00:00"
                              max="23:59"
                              step="900"
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
                              className="w-32"
                              min="00:00"
                              max="23:59"
                              step="900"
                            />
                          </TableCell>
                          <TableCell>
                            {isWorkingDay ? (
                              <Badge variant={hours > 0 ? "default" : "destructive"}>
                                {hours.toFixed(1)}t
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
