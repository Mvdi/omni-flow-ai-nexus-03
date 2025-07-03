import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { Database, Plus, Search, Filter, Phone, Mail, MapPin, Building, Hash, TrendingUp, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

const Customers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');

  const { data: customers = [], isLoading } = useCustomers();

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchQuery || 
      customer.navn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.virksomhedsnavn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.telefon?.includes(searchQuery) ||
      customer.cvr?.includes(searchQuery);
    
    const matchesType = typeFilter === 'all' || customer.kundetype === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'navn':
        return (a.navn || '').localeCompare(b.navn || '');
      case 'email':
        return a.email.localeCompare(b.email);
      case 'score':
        return b.score - a.score;
      case 'updated_at':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      default:
        return 0;
    }
  });

  const getCustomerInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Eksisterende': return 'bg-blue-100 text-blue-800';
      case 'Ny': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-2 md:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2 sm:gap-3">
              <Database className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
              <span className="truncate">Kundekartotek</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Centraliseret administration af alle kundedata</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button className="bg-green-600 hover:bg-green-700 touch-target whitespace-nowrap">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Ny</span> Kunde
            </Button>
          </div>
        </div>

        {/* Stats Cards - Mobile optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card className="shadow-sm border-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Totale</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{customers.length}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nye Kunder</p>
                  <p className="text-xl font-bold text-gray-900">
                    {customers.filter(c => c.kundetype === 'Ny').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Plus className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Eksisterende</p>
                  <p className="text-xl font-bold text-gray-900">
                    {customers.filter(c => c.kundetype === 'Eksisterende').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gns. Score</p>
                  <p className="text-xl font-bold text-gray-900">
                    {customers.length > 0 
                      ? Math.round(customers.reduce((sum, c) => sum + c.score, 0) / customers.length)
                      : 0
                    }
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-0 mb-4">
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Søg kunder..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Kundetype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle typer</SelectItem>
                  <SelectItem value="Ny">Nye kunder</SelectItem>
                  <SelectItem value="Eksisterende">Eksisterende</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sorter efter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Senest opdateret</SelectItem>
                  <SelectItem value="navn">Navn</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customers List */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Indlæser kunder...</p>
              </div>
            ) : sortedCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery || typeFilter !== 'all' 
                    ? 'Ingen kunder matcher dine søgekriterier' 
                    : 'Ingen kunder fundet endnu'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-target"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm">
                            {getCustomerInitials(customer.navn, customer.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {customer.navn || customer.email}
                            </h3>
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                              <Badge className={`text-xs ${getTypeColor(customer.kundetype)}`}>
                                {customer.kundetype}
                              </Badge>
                              <Badge className={`text-xs ${getScoreBadge(customer.score)}`}>
                                {customer.score}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                            {customer.telefon && (
                              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span>{customer.telefon}</span>
                              </div>
                            )}
                            {customer.virksomhedsnavn && (
                              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                                <Building className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{customer.virksomhedsnavn}</span>
                              </div>
                            )}
                            {customer.adresse && (
                              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{customer.adresse}, {customer.postnummer} {customer.by}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-2 justify-end sm:justify-start">
                        <Button variant="outline" size="sm" className="text-xs touch-target">
                          Tickets
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs touch-target">
                          Rediger
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Customers;
