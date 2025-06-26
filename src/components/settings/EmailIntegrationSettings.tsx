
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOffice365Integration } from '@/hooks/useOffice365Integration';
import { Office365EmailStatus } from '@/components/support/Office365EmailStatus';
import { Mail, Settings, Activity } from 'lucide-react';

export const EmailIntegrationSettings = () => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tenantId, setTenantId] = useState('');
  
  const { saveCredentials, status, error } = useOffice365Integration();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !clientSecret || !tenantId) {
      return;
    }
    await saveCredentials(clientId, clientSecret, tenantId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Office 365 Email Integration
          </CardTitle>
          <CardDescription>
            Konfigurer Microsoft 365 integration til automatisk email håndtering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Konfiguration
              </TabsTrigger>
              <TabsTrigger value="status" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status & Aktivitet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Setup Guide</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>1. Gå til Azure Portal → App registrations</p>
                  <p>2. Opret en ny app registration</p>
                  <p>3. Tilføj følgende API permissions: Mail.Read, Mail.Send, User.Read</p>
                  <p>4. Generer en client secret</p>
                  <p>5. Indtast credentials nedenfor</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenantId">Tenant ID</Label>
                    <Input
                      id="tenantId"
                      type="text"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      placeholder="12345678-1234-1234-1234-123456789012"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID (Application ID)</Label>
                    <Input
                      id="clientId"
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="12345678-1234-1234-1234-123456789012"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Din client secret fra Azure"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <Button 
                  type="submit" 
                  disabled={status === 'saving'}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {status === 'saving' ? 'Gemmer...' : 'Gem Office 365 Credentials'}
                </Button>

                {status === 'success' && (
                  <div className="text-green-600 text-sm">
                    Office 365 credentials gemt succesfuldt! Email integration er nu aktiv.
                  </div>
                )}
              </form>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Monitored Email Addresses</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• info@mmmultipartner.dk</p>
                  <p>• salg@mmmultipartner.dk</p>
                  <p>• faktura@mmmultipartner.dk</p>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Emails bliver automatisk scannet hver 3. minut og tickets oprettes automatisk.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="status">
              <Office365EmailStatus />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
