
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Users,
  Mail,
  Database
} from 'lucide-react';
import { EmailIntegrationSettings } from '@/components/settings/EmailIntegrationSettings';
import { EmployeeManagement } from '@/components/settings/EmployeeManagement';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-blue-600" />
              Indstillinger
            </h1>
            <p className="text-gray-600">Administrer dine kontoindstillinger og præferencer</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Generelt
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Medarbejdere
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifikationer
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Integrationer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profil Indstillinger</CardTitle>
                  <CardDescription>
                    Administrer dine personlige oplysninger
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Fornavn</Label>
                      <Input id="firstName" placeholder="Dit fornavn" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Efternavn</Label>
                      <Input id="lastName" placeholder="Dit efternavn" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="din@email.dk" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input id="phone" placeholder="+45 12 34 56 78" />
                  </div>
                  <Button>Gem Ændringer</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Virksomhed</CardTitle>
                  <CardDescription>
                    Indstillinger for din virksomhed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Virksomhedsnavn</Label>
                    <Input id="companyName" placeholder="Din virksomhed" />
                  </div>
                  <div>
                    <Label htmlFor="cvr">CVR-nummer</Label>
                    <Input id="cvr" placeholder="12345678" />
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse</Label>
                    <Input id="address" placeholder="Vej 123, 1234 By" />
                  </div>
                  <Button>Gem Ændringer</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employees" className="space-y-4">
              <EmployeeManagement />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notifikationer</CardTitle>
                  <CardDescription>
                    Vælg hvilke notifikationer du vil modtage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email notifikationer</p>
                      <p className="text-sm text-gray-500">Modtag emails om nye leads og tickets</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Push notifikationer</p>
                      <p className="text-sm text-gray-500">Modtag push beskeder i browseren</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Daglige sammendrag</p>
                      <p className="text-sm text-gray-500">Modtag daglige rapporter om aktivitet</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4">
              <EmailIntegrationSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
