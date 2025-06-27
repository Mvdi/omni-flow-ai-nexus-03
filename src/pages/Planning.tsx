
import { Navigation } from '@/components/Navigation';
import { WeeklyCalendar } from '@/components/planning/WeeklyCalendar';
import { useIntelligentScheduler } from '@/hooks/useIntelligentScheduler';
import { useBackendVRPScheduler } from '@/hooks/useBackendVRPScheduler';
import { useOrderMigration } from '@/hooks/useOrderMigration';

const Planning = () => {
  // Automatically run order migration to fix durations
  useOrderMigration();
  
  // Use backend VRP scheduler (primary)
  const { isOptimizing, solverHealthy } = useBackendVRPScheduler();
  
  // Fallback to browser-based intelligent scheduling if backend is not available
  useIntelligentScheduler();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-6">
        {/* Enhanced header with backend status */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ruteplanlægning</h1>
          <div className="mt-1 space-y-1">
            {solverHealthy ? (
              <p className="text-green-600">
                🚀 Backend VRP-optimering aktiv - realistisk ruteplanlægning med OR-Tools
                {isOptimizing && <span className="ml-2">⚙️ Optimerer...</span>}
              </p>
            ) : (
              <p className="text-amber-600">
                ⚠️ Backend VRP ikke tilgængelig - bruger browser-baseret optimering
              </p>
            )}
            <p className="text-sm text-gray-500">
              Systemet optimerer automatisk ruter med realistiske køretider og multi-dag planlægning
            </p>
          </div>
        </div>

        {/* Main calendar component */}
        <WeeklyCalendar />
      </div>
    </div>
  );
};

export default Planning;
