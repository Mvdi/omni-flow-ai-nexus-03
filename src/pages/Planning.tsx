
import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ProfessionalCalendar } from '@/components/planning/ProfessionalCalendar';

const Planning = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 lg:p-6">
        {/* KALENDER ER ALTID I FOKUS - PRIMÆRT VIEW */}
        <ProfessionalCalendar />
      </div>
    </div>
  );
};

export default Planning;
