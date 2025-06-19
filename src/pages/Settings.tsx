
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Users, Mail, Bell, Shield, Database } from 'lucide-react';

const Settings = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-gray-600" />
              Indstillinger
            </h1>
            <p className="text-gray-600">Konfigurér dit system og administrér medarbejdere</p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Systemindstillinger kommer snart</CardTitle>
            <CardDescription>
              Administrér dit CRM system, invitér medarbejdere og konfigurér integrationer
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12">
            <div className="text-center">
              <SettingsIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">Denne side implementeres i næste iteration</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Users className="h-6 w-6 text-gray-600 mb-2" />
                  <h3 className="font-medium text-sm">Medarbejdere</h3>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Mail className="h-6 w-6 text-gray-600 mb-2" />
                  <h3 className="font-medium text-sm">Email Integration</h3>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Bell className="h-6 w-6 text-gray-600 mb-2" />
                  <h3 className="font-medium text-sm">Notifikationer</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
