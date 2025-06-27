
import { Navigation } from '@/components/Navigation';
import { WeeklyCalendar } from '@/components/planning/WeeklyCalendar';
import { useIntelligentScheduler } from '@/hooks/useIntelligentScheduler';
import { useOrderMigration } from '@/hooks/useOrderMigration';

const Planning = () => {
  // Automatically run order migration to fix durations
  useOrderMigration();
  
  // Automatically run intelligent scheduling in the background
  useIntelligentScheduler();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-6">
        {/* Clean, minimal header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ruteplanlægning</h1>
          <p className="text-green-600 mt-1">🤖 Automatisk intelligent planlægning aktiv - systemet optimerer selv</p>
        </div>

        {/* Main calendar component - this is the focus */}
        <WeeklyCalendar />
      </div>
    </div>
  );
};

export default Planning;
