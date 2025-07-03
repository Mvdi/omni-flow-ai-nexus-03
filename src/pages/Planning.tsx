
import { Navigation } from '@/components/Navigation';
import { WeeklyCalendar } from '@/components/planning/WeeklyCalendar';
import { useIntelligentScheduler } from '@/hooks/useIntelligentScheduler';
import { useBackendVRPScheduler } from '@/hooks/useBackendVRPScheduler';
import { useOrderMigration } from '@/hooks/useOrderMigration';

const Planning = () => {
  // Automatically run order migration to fix durations
  useOrderMigration();
  
  // Use enhanced VRP scheduler with Mapbox integration
  const { isOptimizing, solverHealthy } = useBackendVRPScheduler();
  
  // Fallback to browser-based intelligent scheduling (now rarely needed)
  useIntelligentScheduler();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-2 md:p-4 lg:p-6">
        {/* Enhanced header with new capabilities - Mobile optimized */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ruteplanlægning</h1>
          <div className="space-y-1 sm:space-y-2">
            <p className="text-sm sm:text-base text-green-600">
              🎯 Enhanced VRP-optimering aktiv
              {isOptimizing && <span className="ml-2">⚙️ Optimerer...</span>}
            </p>
            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                <p>✅ Multi-dag fordeling</p>
                <p>✅ Automatisk geocoding</p>
                <p>✅ Realistiske køretider</p>
                <p>✅ Prioritets-baseret</p>
                <p>✅ Intelligent optimering</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main calendar component */}
        <WeeklyCalendar />
      </div>
    </div>
  );
};

export default Planning;
