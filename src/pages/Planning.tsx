
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
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-4 lg:p-6">
        {/* Integrated Header with AI Info */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Ruteplanlægning</h1>
              <p className="text-muted-foreground">Professionel kalender med AI-optimering</p>
            </div>
            
            {/* AI Quick Actions */}
            <div className="flex items-center gap-3">
              {hasOrdersNeedingOptimization && (
                <Badge variant="default" className="bg-primary">
                  {stats.ordersNeedingOptimization} nye ordrer
                </Badge>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAIPanel(!showAIPanel)}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Analyse
              </Button>
              
              <Button 
                onClick={handleQuickOptimization}
                disabled={isOptimizing}
                size="sm"
              >
                {isOptimizing ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Optimerer...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Smart Optimering
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* AI Panel (collapsible) */}
          {showAIPanel && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5" />
                  AI Planlægnings-status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{stats.totalOrders}</p>
                    <p className="text-sm text-muted-foreground">Ordrer</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.optimizationRate}%</p>
                    <p className="text-sm text-muted-foreground">Optimeret</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.activeEmployees}</p>
                    <p className="text-sm text-muted-foreground">Medarbejdere</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.totalRevenue.toLocaleString()} kr
                    </p>
                    <p className="text-sm text-muted-foreground">Omsætning</p>
                  </div>
                </div>
                
                {lastOptimization && (
                  <div className="mt-4 p-3 bg-background rounded border">
                    <p className="text-sm font-medium">Sidste AI optimering:</p>
                    <p className="text-sm text-muted-foreground">
                      {lastOptimization.stats.ordersOptimized} ordrer optimeret • 
                      {lastOptimization.stats.routesCreated} ruter • 
                      Efficienscore: {lastOptimization.stats.avgEfficiency}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Calendar */}
        <ProfessionalCalendar />
      </div>
    </div>
  );
};

export default Planning;
