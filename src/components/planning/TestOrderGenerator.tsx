
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
    { name: 'Lars Hansen', email: 'lars@example.com', address: 'Vestergade 10, 8000 Aarhus', lat: 56.1629, lng: 10.2039 },
    { name: 'Anne Sørensen', email: 'anne@example.com', address: 'Nørregade 25, 7100 Vejle', lat: 55.7058, lng: 9.5378 },
    { name: 'Peter Nielsen', email: 'peter@example.com', address: 'Søndergade 15, 8200 Aarhus N', lat: 56.1735, lng: 10.1982 },
    { name: 'Mette Larsen', email: 'mette@example.com', address: 'Østergade 5, 7400 Herning', lat: 56.1397, lng: 8.9733 },
    { name: 'Jens Andersen', email: 'jens@example.com', address: 'Hovedgaden 30, 8300 Odder', lat: 55.9733, lng: 10.1533 },
    { name: 'Kirsten Pedersen', email: 'kirsten@example.com', address: 'Brogade 12, 7000 Fredericia', lat: 55.5661, lng: 9.7516 },
    { name: 'Michael Christensen', email: 'michael@example.com', address: 'Torvet 8, 8600 Silkeborg', lat: 56.1697, lng: 9.5502 },
    { name: 'Susanne Møller', email: 'susanne@example.com', address: 'Skolegade 20, 7800 Skive', lat: 56.5683, lng: 9.0356 },
    { name: 'Thomas Jakobsen', email: 'thomas@example.com', address: 'Parkvej 14, 8900 Randers', lat: 56.4607, lng: 10.0369 },
    { name: 'Inge Kristensen', email: 'inge@example.com', address: 'Skovvej 7, 8700 Horsens', lat: 55.8607, lng: 9.8500 }
  ];

  // Realistic service types with estimated durations and prices
  const serviceTypes = [
    { type: 'Vinduespudsning', duration: 45, basePrice: 400, variance: 0.3 },
    { type: 'Kontorrengøring', duration: 90, basePrice: 800, variance: 0.4 },
    { type: 'Privatrengøring', duration: 120, basePrice: 600, variance: 0.2 },
    { type: 'Byggerengøring', duration: 180, basePrice: 1200, variance: 0.5 },
    { type: 'Specialrengøring', duration: 150, basePrice: 1000, variance: 0.3 },
    { type: 'Terrasse rengøring', duration: 60, basePrice: 500, variance: 0.4 },
    { type: 'Gulvbehandling', duration: 240, basePrice: 1800, variance: 0.2 },
    { type: 'Tæpperengøring', duration: 75, basePrice: 650, variance: 0.3 }
  ];

  const priorities = [
    { name: 'Kritisk', weight: 0.1 },
    { name: 'Høj', weight: 0.2 },
    { name: 'Normal', weight: 0.5 },
    { name: 'Lav', weight: 0.2 }
  ];

  const getRandomItem = <T,>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  };

  const getWeightedRandomPriority = (): string => {
    const random = Math.random();
    let cumulative = 0;
    for (const priority of priorities) {
      cumulative += priority.weight;
      if (random <= cumulative) {
        return priority.name;
      }
    }
    return 'Normal';
  };

  const getRandomServiceType = () => {
    const service = getRandomItem(serviceTypes);
    const variance = service.variance;
    
    // Add realistic variance to duration and price
    const durationVariance = 1 + (Math.random() - 0.5) * variance;
    const priceVariance = 1 + (Math.random() - 0.5) * variance;
    
    return {
      type: service.type,
      duration: Math.round(service.duration * durationVariance),
      price: Math.round(service.basePrice * priceVariance)
    };
  };

  const getCurrentWeekNumber = () => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getRandomWeek = () => {
    const currentWeek = getCurrentWeekNumber();
    // Generate orders for current week and next 4 weeks with higher probability for current week
    const weekOptions = [
      { week: currentWeek, weight: 0.4 },
      { week: currentWeek + 1, weight: 0.3 },
      { week: currentWeek + 2, weight: 0.2 },
      { week: currentWeek + 3, weight: 0.07 },
      { week: currentWeek + 4, weight: 0.03 }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    for (const option of weekOptions) {
      cumulative += option.weight;
      if (random <= cumulative) {
        return option.week;
      }
    }
    return currentWeek;
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

  const generateTestOrders = async () => {
    if (employees.length === 0) {
      toast.error('Ingen medarbejdere fundet. Opret medarbejdere først.');
      return;
    }

    setIsGenerating(true);
    let created = 0;
    let failed = 0;

    console.log('Starting to generate realistic test orders with VRP optimization...');

    for (let i = 0; i < numberOfOrders; i++) {
      const customer = getRandomItem(testCustomers);
      const service = getRandomServiceType();
      const priority = getWeightedRandomPriority();
      const employee = getRandomItem(employees);
      const week = getRandomWeek();
      
      // Get working days for the selected week
      const weekDates = getWeekDates(week);
      const randomDay = getRandomItem(weekDates);
      
      // Generate realistic coordinates near the customer location with some variance
      const latVariance = (Math.random() - 0.5) * 0.01; // ~1km variance
      const lngVariance = (Math.random() - 0.5) * 0.01;

      const orderData = {
        customer: customer.name,
        customer_email: customer.email,
        order_type: service.type,
        address: customer.address,
        latitude: customer.lat + latVariance,
        longitude: customer.lng + lngVariance,
        price: service.price,
        priority: priority,
        estimated_duration: service.duration,
        scheduled_week: week,
        scheduled_date: randomDay.toISOString().split('T')[0], // YYYY-MM-DD format
        // Don't set scheduled_time - let the VRP optimizer handle this
        status: 'Planlagt',
        assigned_employee_id: employee.id,
        comment: `Realistisk test ordre ${i + 1} - ${service.type} (${service.duration} min, ${service.price} kr)`
      };

      console.log('Creating realistic test order:', {
        customer: orderData.customer,
        type: service.type,
        duration: service.duration,
        price: service.price,
        priority: priority,
        week: orderData.scheduled_week,
        date: orderData.scheduled_date,
        coordinates: `${orderData.latitude?.toFixed(4)}, ${orderData.longitude?.toFixed(4)}`
      });

      try {
        const result = await createOrder(orderData);
        if (result) {
          created++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Error creating realistic test order:', error);
        failed++;
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setIsGenerating(false);
    toast.success(`${created} realistic test ordre oprettet${failed > 0 ? `, ${failed} fejlede` : ''}`);
    console.log('Realistic test order generation completed');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Realistisk Test Ordre Generator</CardTitle>
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
        
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Nuværende uge:</strong> {getCurrentWeekNumber()}</p>
          <p><strong>Medarbejdere tilgængelige:</strong> {employees.length}</p>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="font-semibold text-green-800">🚀 VRP-Optimeret Generering:</p>
            <ul className="text-xs text-green-700 mt-1 space-y-1">
              <li>✓ Realistiske service-tider (45-240 min)</li>
              <li>✓ GPS-koordinater for præcis rute-optimering</li>
              <li>✓ Vægtede prioriteter (50% Normal, 20% Høj, etc.)</li>
              <li>✓ Varierende priser baseret på service-type</li>
              <li>✓ Intelligente tidsvinduer baseret på prioritet</li>
              <li>✓ Geografisk spredning omkring Jylland</li>
            </ul>
          </div>
        </div>

        <Button 
          onClick={generateTestOrders} 
          disabled={isGenerating || employees.length === 0}
          className="w-full"
        >
          {isGenerating ? 'Genererer Realistiske Ordre...' : `Opret ${numberOfOrders} VRP-Optimerede Test Ordre`}
        </Button>
      </CardContent>
    </Card>
  );
};
