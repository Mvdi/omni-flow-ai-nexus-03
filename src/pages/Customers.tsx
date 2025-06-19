
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Plus, Search, Filter, Phone, Mail, MapPin } from 'lucide-react';

const Customers = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Database className="h-8 w-8 text-green-600" />
              Kundekartotek
            </h1>
            <p className="text-gray-600">Centraliseret administration af alle kundedata</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrér
            </Button>
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Søg
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Ny Kunde
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Kundekartotek kommer snart</CardTitle>
            <CardDescription>
              Her vil du kunne administrere alle kundeoplysninger, abonnementer og aftaler
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12">
            <div className="text-center">
              <Database className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">Denne side implementeres i næste iteration</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-green-50 rounded-lg">
                  <Phone className="h-6 w-6 text-green-600 mb-2" />
                  <h3 className="font-medium text-sm">Kontaktinformation</h3>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <Mail className="h-6 w-6 text-green-600 mb-2" />
                  <h3 className="font-medium text-sm">Abonnementer</h3>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <MapPin className="h-6 w-6 text-green-600 mb-2" />
                  <h3 className="font-medium text-sm">Adresser</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Customers;
