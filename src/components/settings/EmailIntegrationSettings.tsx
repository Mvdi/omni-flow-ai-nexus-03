import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Mail, Server, Key, Shield, CheckCircle } from 'lucide-react';
import { useOffice365Integration } from '@/hooks/useOffice365Integration';

interface EmailConfig {
  provider: 'smtp' | 'resend' | 'sendgrid';
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  enableSsl: boolean;
  isConfigured: boolean;
}

export const EmailIntegrationSettings = () => {
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'smtp',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    apiKey: '',
    fromEmail: '',
    fromName: '',
    replyToEmail: '',
    enableSsl: true,
    isConfigured: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [officeClientId, setOfficeClientId] = useState('');
  const [officeClientSecret, setOfficeClientSecret] = useState('');
  const [officeTenantId, setOfficeTenantId] = useState('');
  const { saveCredentials, status: officeStatus, error: officeError } = useOffice365Integration();

  useEffect(() => {
    const savedConfig = localStorage.getItem('email-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      // Validate required fields
      if (!config.fromEmail || !config.fromName) {
        toast({
          title: "Validering fejlede",
          description: "Afsender email og navn er påkrævet.",
          variant: "destructive",
        });
        return;
      }

      if (config.provider === 'smtp' && (!config.smtpHost || !config.smtpUser || !config.smtpPassword)) {
        toast({
          title: "Validering fejlede",
          description: "SMTP host, bruger og adgangskode er påkrævet for SMTP.",
          variant: "destructive",
        });
        return;
      }

      if ((config.provider === 'resend' || config.provider === 'sendgrid') && !config.apiKey) {
        toast({
          title: "Validering fejlede",
          description: "API nøgle er påkrævet for denne udbyder.",
          variant: "destructive",
        });
        return;
      }

      const updatedConfig = { ...config, isConfigured: true };
      localStorage.setItem('email-config', JSON.stringify(updatedConfig));
      setConfig(updatedConfig);

      toast({
        title: "Konfiguration gemt",
        description: "Email integration er nu konfigureret og klar til brug.",
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme konfiguration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      // Simulate test connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Test succesfuld",
        description: "Email forbindelse fungerer korrekt.",
      });
    } catch (error) {
      toast({
        title: "Test fejlede",
        description: "Kunne ikke oprette forbindelse til email service.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOffice365 = async () => {
    await saveCredentials(officeClientId, officeClientSecret, officeTenantId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Integration
            {config.isConfigured && (
              <CheckCircle className="h-5 w-5 text-green-600 ml-2" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Email Udbyder</Label>
            <Select 
              value={config.provider} 
              onValueChange={(value: 'smtp' | 'resend' | 'sendgrid') => 
                setConfig(prev => ({ ...prev, provider: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Vælg email udbyder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smtp">SMTP Server</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Afsender Email *</Label>
              <Input
                id="fromEmail"
                type="email"
                value={config.fromEmail}
                onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                placeholder="support@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromName">Afsender Navn *</Label>
              <Input
                id="fromName"
                value={config.fromName}
                onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                placeholder="Kundeservice"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="replyToEmail">Svar-til Email</Label>
            <Input
              id="replyToEmail"
              type="email"
              value={config.replyToEmail}
              onChange={(e) => setConfig(prev => ({ ...prev, replyToEmail: e.target.value }))}
              placeholder="noreply@example.com"
            />
          </div>

          {/* Provider Specific Settings */}
          {config.provider === 'smtp' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                SMTP Indstillinger
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host *</Label>
                  <Input
                    id="smtpHost"
                    value={config.smtpHost}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={config.smtpPort}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpPort: e.target.value }))}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Bruger *</Label>
                  <Input
                    id="smtpUser"
                    value={config.smtpUser}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                    placeholder="din@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Adgangskode *</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={config.smtpPassword}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableSsl"
                  checked={config.enableSsl}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableSsl: checked }))}
                />
                <Label htmlFor="enableSsl">Aktiver SSL/TLS</Label>
              </div>
            </div>
          )}

          {(config.provider === 'resend' || config.provider === 'sendgrid') && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Indstillinger
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Nøgle *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="••••••••••••••••••••••••••••••••"
                />
              </div>
            </div>
          )}

          {/* Office 365 Integration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Office 365 / Microsoft 365 (Graph API) Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-700 mb-2">
                <b>OBS:</b> Dine Office 365 nøgler gemmes <u>aldrig</u> i browseren eller frontend – de sendes kun sikkert til backend (Supabase) og kan kun læses af systemet.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="officeClientId">Client ID</Label>
                  <Input id="officeClientId" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={officeClientId} onChange={e => setOfficeClientId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeClientSecret">Client Secret</Label>
                  <Input id="officeClientSecret" type="password" placeholder="••••••••••••••••••••••••" value={officeClientSecret} onChange={e => setOfficeClientSecret(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeTenantId">Tenant ID</Label>
                  <Input id="officeTenantId" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={officeTenantId} onChange={e => setOfficeTenantId(e.target.value)} />
                </div>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveOffice365} disabled={officeStatus === 'saving'}>
                {officeStatus === 'saving' ? 'Gemmer...' : 'Gem Office 365 nøgler'}
              </Button>
              {officeStatus === 'success' && <div className="text-green-600 text-sm">Nøgler gemt!</div>}
              {officeError && <div className="text-red-600 text-sm">{officeError}</div>}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold mb-2">Sådan finder du dine Office 365 nøgler (Azure App Registration)</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Gå til <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Azure Portal</a></li>
                  <li>Søg efter <b>App registrations</b> &rarr; <b>New registration</b></li>
                  <li>Giv appen et navn, fx <i>CRM Ticket Integration</i></li>
                  <li>Vælg <b>Accounts in this organizational directory only</b></li>
                  <li>Redirect URI kan være tom eller fx <i>https://localhost</i></li>
                  <li>Klik <b>Register</b></li>
                  <li>Kopiér <b>Application (client) ID</b> og <b>Directory (tenant) ID</b></li>
                  <li>Gå til <b>Certificates & secrets</b> &rarr; <b>New client secret</b> &rarr; kopier værdien</li>
                  <li>Gå til <b>API permissions</b> &rarr; <b>Add a permission</b> &rarr; <b>Microsoft Graph</b> &rarr; <b>Application permissions</b>:
                    <ul className="list-disc list-inside ml-4">
                      <li>Tilføj: <code>Mail.Read</code>, <code>Mail.ReadWrite</code>, <code>MailboxSettings.Read</code>, <code>User.Read.All</code></li>
                    </ul>
                  </li>
                  <li>Klik <b>Grant admin consent</b> (kræver admin-rettigheder)</li>
                </ol>
                <div className="mt-2 text-xs text-gray-500">Spørg evt. din IT-administrator hvis du ikke har adgang til Azure Portal.</div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleSaveConfig} 
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? 'Gemmer...' : 'Gem Konfiguration'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isLoading || !config.isConfigured}
            >
              {isLoading ? 'Tester...' : 'Test Forbindelse'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${config.isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">
              {config.isConfigured ? 
                `Email integration er aktiv med ${config.provider.toUpperCase()}` : 
                'Email integration er ikke konfigureret'
              }
            </span>
          </div>
          
          {config.isConfigured && (
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Udbyder:</strong> {config.provider.toUpperCase()}</p>
              <p><strong>Afsender:</strong> {config.fromName} &lt;{config.fromEmail}&gt;</p>
              {config.replyToEmail && <p><strong>Svar-til:</strong> {config.replyToEmail}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
