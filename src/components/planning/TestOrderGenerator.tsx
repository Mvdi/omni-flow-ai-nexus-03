
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { toast } from 'sonner';

export const TestOrderGenerator: React.FC = () => {
  const [numberOfOrders, setNumberOfOrders] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const { createOrder } = useOrders();
  const { employees } = useEmployees();

  const testCustomers = [
    { name: 'Lars Hansen', email: 'lars@example.com', address: 'Vestergade 10, 8000 Aarhus' },
    { name: 'Anne Sørensen', email: 'anne@example.com', address: 'Nørregade 25, 7100 Vejle' },
    { name: 'Peter Nielsen', email: 'peter@example.com', address: 'Søndergade 15, 8200 Aarhus N' },
    { name: 'Mette Larsen', email: 'mette@example.com', address: 'Østergade 5, 7400 Herning' },
    { name: 'Jens Andersen', email: 'jens@example.com', address: 'Hovedgaden 30, 8300 Odder' },
    { name: 'Kirsten Pedersen', email: 'kirsten@example.com', address: 'Brogade 12, 7000 Fredericia' },
    { name: 'Michael Christensen', email: 'michael@example.com', address: 'Torvet 8, 8600 Silkeborg' },
    { name: 'Susanne Møller', email: 'susanne@example.com', address: 'Skolegade 20, 7800 Skive' },
  ];

  const orderTypes = [
    'Vinduespudsning',
    'Rengøring',
    'Byggerengøring',
    'Kontorrengøring',
    'Privatrengøring',
    'Specialrengøring'
  ];

  const priorities = ['Lav', 'Normal', 'Høj', 'Kritisk'];

  const getRandomItem = <T,>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  };

  const getRandomPrice = () => {
    return Math.floor(Math.random() * 2000) + 200; // 200-2200 kr
  };

  const getRandomDuration = () => {
    return Math.floor(Math.random() * 180) + 30; // 30-210 minutes
  };

  const getCurrentWeekNumber = () => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getRandomWeek = () => {
    const currentWeek = getCurrentWeekNumber();
    // Generate orders for current week and next 4 weeks
    return currentWeek + Math.floor(Math.random() * 5);
  };

  const getWeekDates = (weekNumber: number) => {
    const now = new Date();
    const currentWeek = getCurrentWeekNumber();
    const weekDiff = weekNumber - currentWeek;
    
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + (weekDiff * 7));
    
    // Get Monday of that week
    const startOfWeek = new Date(targetDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 5; i++) { // Only weekdays
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDates.push(day);
    }
    return weekDates;
  };

  const getRandomWorkingTime = () => {
    const workingHours = [8, 9, 10, 11, 13, 14, 15, 16, 17]; // Skip lunch hour 12
    const hour = getRandomItem(workingHours);
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const generateTestOrders = async () => {
    if (employees.length === 0) {
      toast.error('Ingen medarbejdere fundet. Opret medarbejdere først.');
      return;
    }

    setIsGenerating(true);
    let created = 0;
    let failed = 0;

    for (let i = 0; i < numberOfOrders; i++) {
      const customer = getRandomItem(testCustomers);
      const orderType = getRandomItem(orderTypes);
      const priority = getRandomItem(priorities);
      const employee = getRandomItem(employees);
      const week = getRandomWeek();
      
      // Get working days for the selected week
      const weekDates = getWeekDates(week);
      const randomDay = getRandomItem(weekDates);
      const randomTime = getRandomWorkingTime();

      const orderData = {
        customer: customer.name,
        customer_email: customer.email,
        order_type: orderType,
        address: customer.address,
        price: getRandomPrice(),
        priority: priority,
        estimated_duration: getRandomDuration(),
        scheduled_week: week,
        scheduled_date: randomDay.toISOString().split('T')[0], // YYYY-MM-DD format
        scheduled_time: randomTime,
        status: 'Planlagt',
        assigned_employee_id: employee.id,
        comment: `Test ordre ${i + 1} - genereret automatisk for uge ${week}`
      };

      console.log('Creating test order:', {
        customer: orderData.customer,
        week: orderData.scheduled_week,
        date: orderData.scheduled_date,
        time: orderData.scheduled_time
      });

      try {
        const result = await createOrder(orderData);
        if (result) {
          created++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Error creating test order:', error);
        failed++;
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsGenerating(false);
    toast.success(`${created} test ordre oprettet${failed > 0 ? `, ${failed} fejlede` : ''}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Ordre Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="numberOfOrders">Antal ordre at oprette</Label>
          <Input
            id="numberOfOrders"
            type="number"
            min="1"
            max="50"
            value={numberOfOrders}
            onChange={(e) => setNumberOfOrders(parseInt(e.target.value) || 1)}
          />
        </div>
        
        <div className="text-sm text-gray-600">
          <p>Nuværende uge: {getCurrentWeekNumber()}</p>
          <p>Ordrer vil blive spredt over de næste 5 uger</p>
          <p>Medarbejdere tilgængelige: {employees.length}</p>
          <p className="font-semibold text-green-600">✓ Alle ordrer får både uge-nummer og specifik dato/tid</p>
        </div>

        <Button 
          onClick={generateTestOrders} 
          disabled={isGenerating || employees.length === 0}
          className="w-full"
        >
          {isGenerating ? 'Genererer...' : `Opret ${numberOfOrders} Test Ordre`}
        </Button>
      </CardContent>
    </Card>
  );
};
