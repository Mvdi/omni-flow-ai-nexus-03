
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
      
      <div className="p-6">
        {/* Enhanced header with new capabilities */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ruteplanlægning</h1>
          <div className="mt-1 space-y-1">
            <p className="text-green-600">
              🎯 Enhanced VRP-optimering med Mapbox integration aktiv
              {isOptimizing && <span className="ml-2">⚙️ Optimerer...</span>}
            </p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>✅ Multi-dag fordeling (mandag-fredag)</p>
              <p>✅ Automatisk geocoding af adresser</p>
              <p>✅ Realistiske køretider med Mapbox</p>
              <p>✅ Prioritets-baseret planlægning</p>
              <p>✅ Intelligent rute-optimering</p>
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
