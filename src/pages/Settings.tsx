
import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { LogoUpload } from "@/components/ui/logo-upload";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Users,
  Mail,
  Database,
  Clock,
  FileText
} from 'lucide-react';
import { EmailIntegrationSettings } from '@/components/settings/EmailIntegrationSettings';
import { EmployeeManagement } from '@/components/settings/EmployeeManagement';
import { WorkScheduleManagement } from '@/components/settings/WorkScheduleManagement';
import { QuoteTemplateManagement } from '@/components/settings/QuoteTemplateManagement';
import { QuoteTemplateEditor } from '@/components/settings/QuoteTemplateEditor';
import { OrderSettingsDialog } from '@/components/orders/OrderSettingsDialog';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [orderSettingsOpen, setOrderSettingsOpen] = useState(false);
  const { toast } = useToast();
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  // Company form state  
  const [companyData, setCompanyData] = useState({
    companyName: '',
    cvr: '',
    address: ''
  });

  const [companyLogo, setCompanyLogo] = useState<string | null>(
    localStorage.getItem('company-logo')
  );

  // Load saved data on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('profile-settings');
    if (savedProfile) {
      setProfileData(JSON.parse(savedProfile));
    }

    const savedCompany = localStorage.getItem('company-settings');
    if (savedCompany) {
      setCompanyData(JSON.parse(savedCompany));
    }
  }, []);

  const handleProfileSave = () => {
    localStorage.setItem('profile-settings', JSON.stringify(profileData));
    toast({
      title: "Profil gemt",
      description: "Dine profiloplysninger er blevet gemt",
    });
  };

  const handleCompanySave = () => {
    localStorage.setItem('company-settings', JSON.stringify(companyData));
    toast({
      title: "Virksomhedsoplysninger gemt",
      description: "Dine virksomhedsoplysninger er blevet gemt",
    });
  };

  const handleCompanyAddressSelect = (addressData: { address: string; latitude: number; longitude: number; bfe_number?: string }) => {
    setCompanyData(prev => ({ ...prev, address: addressData.address }));
    console.log('Company address selected');
  };

  const handleLogoChange = (logoUrl: string | null) => {
    setCompanyLogo(logoUrl);
    // Force navigation component to re-render by triggering a storage event
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-2 md:p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2 sm:gap-3">
              <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              Indstillinger
            </h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Administrer dine kontoindstillinger og præferencer</p>
          </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 min-w-[700px] sm:min-w-full h-auto gap-1">
                <TabsTrigger value="general" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <User className="h-4 w-4" />
                  <span>Generelt</span>
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <Database className="h-4 w-4" />
                  <span>Ordrer</span>
                </TabsTrigger>
                <TabsTrigger value="employees" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <Users className="h-4 w-4" />
                  <span>Medarbejdere</span>
                </TabsTrigger>
                <TabsTrigger value="schedules" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <Clock className="h-4 w-4" />
                  <span>Arbejdstider</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <Bell className="h-4 w-4" />
                  <span>Notifikationer</span>
                </TabsTrigger>
                <TabsTrigger value="integrations" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <Mail className="h-4 w-4" />
                  <span>Integrationer</span>
                </TabsTrigger>
                <TabsTrigger value="quotes" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                  <FileText className="h-4 w-4" />
                  <span>Tilbud</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profil Indstillinger</CardTitle>
                  <CardDescription>
                    Administrer dine personlige oplysninger
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Fornavn</Label>
                      <Input 
                        id="firstName" 
                        placeholder="Dit fornavn" 
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="mobile-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Efternavn</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Dit efternavn" 
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="mobile-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="din@email.dk" 
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="mobile-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input 
                      id="phone" 
                      placeholder="+45 12 34 56 78" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="mobile-input"
                    />
                  </div>
                  <Button onClick={handleProfileSave} className="touch-target">Gem Ændringer</Button>
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
                  <LogoUpload 
                    currentLogo={companyLogo}
                    onLogoChange={handleLogoChange}
                  />
                  <div>
                    <Label htmlFor="companyName">Virksomhedsnavn</Label>
                    <Input 
                      id="companyName" 
                      placeholder="Din virksomhed" 
                      value={companyData.companyName}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvr">CVR-nummer</Label>
                    <Input 
                      id="cvr" 
                      placeholder="12345678" 
                      value={companyData.cvr}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, cvr: e.target.value }))}
                    />
                  </div>
                  <div>
                    <AddressAutocomplete
                      label="Adresse"
                      value={companyData.address}
                      onChange={(value) => setCompanyData(prev => ({ ...prev, address: value }))}
                      onAddressSelect={handleCompanyAddressSelect}
                      placeholder="Vælg virksomhedsadresse"
                    />
                  </div>
                  <Button onClick={handleCompanySave}>Gem Ændringer</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ordre Indstillinger</CardTitle>
                  <CardDescription>
                    Administrer ordre typer og status muligheder
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setOrderSettingsOpen(true)}>
                    Åbn Ordre Indstillinger
                  </Button>
                  
                  <OrderSettingsDialog 
                    isOpen={orderSettingsOpen} 
                    onClose={() => setOrderSettingsOpen(false)}
                    onSave={(settings) => {
                      toast({
                        title: "Indstillinger gemt",
                        description: "Ordre indstillinger er blevet opdateret",
                      });
                      setOrderSettingsOpen(false);
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employees" className="space-y-4">
              <EmployeeManagement />
            </TabsContent>

            <TabsContent value="schedules" className="space-y-4">
              <WorkScheduleManagement />
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

            <TabsContent value="quotes" className="space-y-4">
              <QuoteTemplateEditor />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
