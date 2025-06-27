
import { Navigation } from '@/components/Navigation';
import { WeeklyCalendar } from '@/components/planning/WeeklyCalendar';

const Planning = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-6">
        {/* Clean, minimal header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ruteplanlægning</h1>
          <p className="text-gray-600 mt-1">Planlæg og optimer dine ruter</p>
        </div>

        {/* Main calendar component - this is the focus */}
        <WeeklyCalendar />
      </div>
    </div>
  );
};

export default Planning;
