
import { useState } from 'react';
import { TicketOverview } from '@/components/support/TicketOverview';
import { TicketConversation } from '@/components/support/TicketConversation';
import { CreateTicketDialog } from '@/components/support/CreateTicketDialog';
import { SignatureSettings } from '@/components/support/SignatureSettings';
import { Office365EmailStatus } from '@/components/support/Office365EmailStatus';
import { CleanupDuplicates } from '@/components/support/CleanupDuplicates';
import { ReprocessTicket } from '@/components/support/ReprocessTicket';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTickets, SupportTicket } from '@/hooks/useTickets';
import { Mail, Settings, RefreshCw, Download } from 'lucide-react';

const Support = () => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const { data: tickets = [], isLoading } = useTickets();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <CreateTicketDialog />
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets">
            <Mail className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Indstillinger
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <RefreshCw className="h-4 w-4 mr-2" />
            Vedligeholdelse
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Download className="h-4 w-4 mr-2" />
            Værktøjer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <TicketOverview 
                tickets={tickets}
                isLoading={isLoading}
                onTicketSelect={setSelectedTicket}
                selectedTicket={selectedTicket}
              />
            </div>
            <div className="space-y-4">
              {selectedTicket ? (
                <TicketConversation ticket={selectedTicket} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Mail className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Vælg en ticket for at se samtalen</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SignatureSettings />
          <Office365EmailStatus />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <CleanupDuplicates />
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <ReprocessTicket />
          <Card>
            <CardHeader>
              <CardTitle>Andre Værktøjer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Flere værktøjer vil blive tilføjet her efterhånden som de bliver udviklet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Support;
