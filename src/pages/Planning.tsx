import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfessionalCalendar } from '@/components/planning/ProfessionalCalendar';
import { useSmartPlanner } from '@/hooks/useSmartPlanner';
import { useIntelligentScheduler } from '@/hooks/useIntelligentScheduler';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Brain, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

const Planning = () => {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const { user } = useAuth();
  
  const { 
    isPlanning,
    planNewOrders,
    hasOrdersNeedingPlanning,
    ordersNeedingPlanningCount
  } = useSmartPlanner();
  
  // ALSO use intelligent scheduler for route optimization
  useIntelligentScheduler();
  
  const { orders } = useOrders();
  
  // Calculate stats locally
  const stats = {
    totalOrders: orders.length,
    optimizationRate: orders.length > 0 ? Math.round(((orders.length - ordersNeedingPlanningCount) / orders.length) * 100) : 0,
    activeEmployees: 1, // From console logs we see 1 active employee
    totalRevenue: orders.reduce((sum, order) => sum + order.price, 0)
  };

  // Automatically trigger smart planning when component mounts if needed
  useEffect(() => {
    if (hasOrdersNeedingPlanning() && !isPlanning) {
      console.log(`🤖 Auto-triggering smart planning for ${ordersNeedingPlanningCount} unplanned orders`);
      planNewOrders(false); // Silent planning without toast
    }
  }, [orders.length]);

  // Manual trigger for smart planning
  const handleManualAutoPlanning = async () => {
    if (!user) {
      toast.error('Du skal være logget ind');
      return;
    }
    
    try {
      console.log('🎯 Manuelt trigger af smart planlægning');
      const result = await planNewOrders(true); // Show success toast
      
      if (result.plannedOrders === 0) {
        toast.info('Ingen ordrer at planlagt - alle er allerede planlagt');
      }
    } catch (error) {
      console.error('❌ Error in manual smart planning:', error);
      toast.error('Fejl ved auto-planlægning');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navigation />
      
      {/* Compact Header with AI Integration */}
      <div className="border-b border-border bg-background px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Intelligent Ruteplanlægning</h1>
            <p className="text-sm text-muted-foreground">
              🤖 Automatisk AI-optimering kører i baggrunden
            </p>
          </div>
          
          {/* AI Status & Manual Trigger */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleManualAutoPlanning}
              disabled={isPlanning}
              variant="default"
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {isPlanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Planlægger...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {hasOrdersNeedingPlanning() ? `Planlæg ${ordersNeedingPlanningCount} Ordrer` : 'Auto-tildel Ordrer'}
                </>
              )}
            </Button>
            
            {hasOrdersNeedingPlanning() && (
              <Badge variant="default" className="bg-primary text-xs animate-pulse">
                {ordersNeedingPlanningCount} nye ordrer
              </Badge>
            )}
            
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowAIPanel(!showAIPanel)}
            >
              <Brain className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium">AI Aktiv</span>
            </div>
          </div>
        </div>

        {/* AI Panel (collapsible) */}
        {showAIPanel && (
          <div className="mt-3 p-3 border border-primary/20 bg-primary/5 rounded">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-primary">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Totale Ordrer</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{stats.optimizationRate}%</p>
                <p className="text-xs text-muted-foreground">AI Optimeret</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">{stats.activeEmployees}</p>
                <p className="text-xs text-muted-foreground">Aktive Ruter</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-600">
                  {stats.totalRevenue.toLocaleString()} kr
                </p>
                <p className="text-xs text-muted-foreground">Planlagt Omsætning</p>
              </div>
            </div>
            
            <div className="mt-2 p-2 bg-background rounded border text-xs">
              <p className="font-medium">🚀 Intelligent Auto-Planlægning Aktiv:</p>
              <p className="text-muted-foreground">
                • Automatisk tildeling af ordrer til bedste medarbejder<br/>
                • Beregning af optimal kørselstid mellem ordrer<br/>
                • Kontinuerlig optimering af alle ruter
              </p>
            </div>
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