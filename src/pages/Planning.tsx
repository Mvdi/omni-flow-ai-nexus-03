
import { Navigation } from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdvancedPlanningDashboard } from '@/components/planning/AdvancedPlanningDashboard';
import { ProfessionalCalendar } from '@/components/planning/ProfessionalCalendar';
import { Brain, Calendar, TrendingUp } from 'lucide-react';

const Planning = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Ruteplanlægning</h1>
          <p className="text-muted-foreground">
            Professionel AI-drevet planlægnings- og optimeringssystem
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Dashboard
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Kalender
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analyse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdvancedPlanningDashboard />
          </TabsContent>

          <TabsContent value="calendar">
            <ProfessionalCalendar />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Avanceret Analyse</h3>
              <p className="text-muted-foreground">
                Kommer snart - detaljeret analyse af ruteeffektivitet og performance
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Planning;
