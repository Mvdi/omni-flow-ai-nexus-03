import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfessionalCalendar } from '@/components/planning/ProfessionalCalendar';
import { useAdvancedPlanner } from '@/hooks/useAdvancedPlanner';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

const Planning = () => {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isAutoPlanning, setIsAutoPlanning] = useState(false);
  const { user } = useAuth();
  
  const { 
    getPlanningStats,
    hasOrdersNeedingOptimization 
  } = useAdvancedPlanner();
  
  const { orders } = useOrders();
  
  const stats = getPlanningStats();

  // Automatically trigger intelligent planning when component mounts or orders change
  useEffect(() => {
    const triggerIntelligentPlanning = async () => {
      if (!user) return;
      
      // Check for unplanned orders
      const unplannedOrders = orders.filter(order => 
        order.status === 'Ikke planlagt' || 
        !order.assigned_employee_id || 
        !order.scheduled_week
      );

      if (unplannedOrders.length > 0) {
        console.log(`🤖 Auto-triggering intelligent planning for ${unplannedOrders.length} unplanned orders`);
        
        try {
          const response = await supabase.functions.invoke('intelligent-auto-planner', {
            body: { userId: user.id }
          });
          
          if (response.data?.success) {
            console.log('✅ Intelligent planning completed:', response.data);
            // Refresh orders after planning
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        } catch (error) {
          console.error('❌ Error in automatic intelligent planning:', error);
        }
      }
    };

    // Run immediately and then after a delay
    if (orders.length > 0) {
      triggerIntelligentPlanning();
    }
  }, [user, orders]);

  // Manual trigger for intelligent planning
  const handleManualAutoPlanning = async () => {
    if (!user) {
      toast.error('Du skal være logget ind');
      return;
    }

    setIsAutoPlanning(true);
    
    try {
      console.log('🎯 Manuelt trigger af intelligent auto-planlægning');
      
      const response = await supabase.functions.invoke('intelligent-auto-planner', {
        body: { userId: user.id }
      });
      
      if (response.data?.success) {
        toast.success(`✅ ${response.data.planned} ordrer blev planlagt intelligent`);
        console.log('✅ Manual intelligent planning completed:', response.data);
        
        // Refresh page to show updated orders
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.info('Ingen ordrer at planlagt');
      }
    } catch (error) {
      console.error('❌ Error in manual intelligent planning:', error);
      toast.error('Fejl ved auto-planlægning');
    } finally {
      setIsAutoPlanning(false);
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
              disabled={isAutoPlanning}
              variant="default"
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {isAutoPlanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Planlægger...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-tildel Ordrer
                </>
              )}
            </Button>
            
            {hasOrdersNeedingOptimization && (
              <Badge variant="default" className="bg-primary text-xs animate-pulse">
                AI arbejder...
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