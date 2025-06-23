
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignatureSettings } from '@/components/support/SignatureSettings';
import { EmailIntegrationSettings } from '@/components/settings/EmailIntegrationSettings';
import { Settings as SettingsIcon, Users, Mail, Bell, Shield, Database, FileSignature } from 'lucide-react';

const Settings = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              <SettingsIcon className="h-7 w-7 text-gray-600" />
              Indstillinger
            </h1>
            <p className="text-gray-600">Konfigurér dit system og administrér indstillinger</p>
          </div>
        </div>

        <Card className="shadow-sm border-0">
          <CardContent className="p-0">
            <Tabs defaultValue="signature" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="signature" className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4" />
                  Signatur
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Integration
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Medarbejdere
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  System
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signature" className="mt-0 p-6">
                <SignatureSettings />
              </TabsContent>

              <TabsContent value="email" className="mt-0 p-6">
                <EmailIntegrationSettings />
              </TabsContent>

              <TabsContent value="users" className="mt-0 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Medarbejdere
                    </CardTitle>
                    <CardDescription>
                      Administrér medarbejdere og deres tilladelser
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-600 mb-6">Medarbejderadministration kommer snart</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="system" className="mt-0 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SettingsIcon className="h-5 w-5" />
                      Systemindstillinger
                    </CardTitle>
                    <CardDescription>
                      Generelle systemindstillinger og konfiguration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <SettingsIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-600 mb-6">Systemindstillinger kommer snart</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <Bell className="h-6 w-6 text-gray-600 mb-2" />
                          <h3 className="font-medium text-sm">Notifikationer</h3>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <Shield className="h-6 w-6 text-gray-600 mb-2" />
                          <h3 className="font-medium text-sm">Sikkerhed</h3>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
