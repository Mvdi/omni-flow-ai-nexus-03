import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, User, Mail, Phone, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

export interface Customer {
  id: string;
  navn: string | null;
  email: string;
  telefon: string | null;
  adresse: string | null;
  by: string | null;
  postnummer: string | null;
  virksomhedsnavn: string | null;
  kundetype: string | null;
}

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer) => void;
  placeholder?: string;
  label?: string;
}

export const CustomerSearch = ({ onCustomerSelect, placeholder = "Søg efter eksisterende kunder...", label = "Kunde søgning" }: CustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const searchCustomers = async () => {
      if (debouncedSearchTerm.length < 2) {
        setCustomers([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`navn.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,telefon.ilike.%${debouncedSearchTerm}%,virksomhedsnavn.ilike.%${debouncedSearchTerm}%`)
          .limit(10);

        if (error) throw error;
        setCustomers(data || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchCustomers();
  }, [debouncedSearchTerm]);

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchTerm(customer.navn || customer.email);
    setShowResults(false);
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for clicks
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="space-y-2 relative">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 z-50 max-h-60 overflow-y-auto bg-background border shadow-lg">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Søger...
              </div>
            ) : customers.length > 0 ? (
              <div className="space-y-1">
                {customers.map((customer) => (
                  <Button
                    key={customer.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 text-left"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <User className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {customer.navn || 'Ingen navn'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                        {customer.telefon && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.telefon}
                          </div>
                        )}
                        {customer.virksomhedsnavn && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {customer.virksomhedsnavn}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : searchTerm.length >= 2 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Ingen kunder fundet
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};