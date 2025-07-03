
import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfessionalCalendar } from '@/components/planning/ProfessionalCalendar';
import { useAdvancedPlanner } from '@/hooks/useAdvancedPlanner';
import { Brain, Calendar, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';

const Planning = () => {
  const [showAIPanel, setShowAIPanel] = useState(false);
  
  const { 
    isOptimizing, 
    lastOptimization, 
    runAdvancedOptimization, 
    getPlanningStats,
    hasOrdersNeedingOptimization 
  } = useAdvancedPlanner();
  
  const stats = getPlanningStats();

  const handleQuickOptimization = async () => {
    const result = await runAdvancedOptimization(new Date(), false);
    if (result) {
      toast.success('AI optimering komplet!');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navigation />
      
      {/* Compact Header with AI Integration */}
      <div className="border-b border-border bg-background px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Ruteplanlægning</h1>
            <p className="text-sm text-muted-foreground">Professionel kalender med AI-optimering</p>
          </div>
          
          {/* AI Quick Actions */}
          <div className="flex items-center gap-2">
            {hasOrdersNeedingOptimization && (
              <Badge variant="default" className="bg-primary text-xs">
                {stats.ordersNeedingOptimization} nye
              </Badge>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
            >
              <Brain className="h-4 w-4 mr-1" />
              AI
            </Button>
            
            <Button 
              onClick={handleQuickOptimization}
              disabled={isOptimizing}
              size="sm"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                  Optimerer
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Smart Optimering
                </>
              )}
            </Button>
          </div>
        </div>

        {/* AI Panel (collapsible) */}
        {showAIPanel && (
          <div className="mt-3 p-3 border border-primary/20 bg-primary/5 rounded">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-primary">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Ordrer</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{stats.optimizationRate}%</p>
                <p className="text-xs text-muted-foreground">Optimeret</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">{stats.activeEmployees}</p>
                <p className="text-xs text-muted-foreground">Medarbejdere</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-600">
                  {stats.totalRevenue.toLocaleString()} kr
                </p>
                <p className="text-xs text-muted-foreground">Omsætning</p>
              </div>
            </div>
            
            {lastOptimization && (
              <div className="mt-2 p-2 bg-background rounded border text-xs">
                <p className="font-medium">Sidste AI optimering:</p>
                <p className="text-muted-foreground">
                  {lastOptimization.stats.ordersOptimized} ordrer • 
                  {lastOptimization.stats.routesCreated} ruter • 
                  Score: {lastOptimization.stats.avgEfficiency}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen Calendar */}
      <div className="flex-1 overflow-hidden">
        <ProfessionalCalendar />
      </div>
    </div>
  );
};

export default Planning;
