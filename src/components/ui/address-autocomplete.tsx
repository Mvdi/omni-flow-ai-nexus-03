
import React, { useEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';
import { Shield } from 'lucide-react';

interface AddressData {
  address: string;
  latitude: number;
  longitude: number;
  bfe_number?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (addressData: AddressData) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  required?: boolean;
}

// DAWA types for selected address
interface DAWASelectedAddress {
  tekst: string;
  data: {
    id: string;
  };
}

// DAWA address details response
interface DAWAAddressDetails {
  id: string;
  adgangspunkt: {
    koordinater: [number, number]; // [longitude, latitude]
  };
  bfe?: number;
}

declare global {
  interface Window {
    dawaAutocomplete?: {
      dawaAutocomplete: (element: HTMLInputElement, options: any) => void;
    };
  }
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Skriv adresse...",
  label,
  id = "address-autocomplete",
  required = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasValidAddress, setHasValidAddress] = useState(false);

  // Load DAWA resources
  useEffect(() => {
    const loadDAWA = async () => {
      // Check if already loaded
      if (window.dawaAutocomplete) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('Loading DAWA autocomplete resources...');

        // Load CSS first
        const existingCSS = document.querySelector('#dawa-autocomplete-css');
        if (!existingCSS) {
          const cssLink = document.createElement('link');
          cssLink.id = 'dawa-autocomplete-css';
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://cdn.dataforsyningen.dk/dawa/assets/dawa-autocomplete2/latest/dawa-autocomplete2.css';
          document.head.appendChild(cssLink);
        }

        // Load JavaScript
        const existingScript = document.querySelector('#dawa-autocomplete-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'dawa-autocomplete-script';
          script.src = 'https://cdn.dataforsyningen.dk/dawa/assets/dawa-autocomplete2/latest/dawa-autocomplete2.min.js';
          script.async = true;
          
          script.onload = () => {
            console.log('DAWA script loaded successfully');
            setIsLoading(false);
          };
          
          script.onerror = () => {
            console.error('Failed to load DAWA script');
            setIsLoading(false);
          };
          
          document.head.appendChild(script);
        } else {
          setIsLoading(false);
        }

      } catch (error) {
        console.error('Error loading DAWA resources:', error);
        setIsLoading(false);
      }
    };

    loadDAWA();
  }, []);

  // Initialize DAWA autocomplete when ready
  useEffect(() => {
    if (!isLoading && inputRef.current && window.dawaAutocomplete && !isInitialized) {
      try {
        console.log('Initializing DAWA autocomplete');
        
        window.dawaAutocomplete.dawaAutocomplete(inputRef.current, {
          select: async (selected: DAWASelectedAddress) => {
            console.log('DAWA address selected:', selected.tekst);
            
            // Update input value immediately
            onChange(selected.tekst);
            setHasValidAddress(true);
            
            // Fetch detailed address information with coordinates
            if (onAddressSelect) {
              try {
                console.log('Fetching address details for secure coordinate storage...');
                
                const response = await fetch(
                  `https://api.dataforsyningen.dk/adresser/${selected.data.id}?struktur=mini`
                );
                
                if (!response.ok) {
                  throw new Error('Failed to fetch address details');
                }
                
                const addressDetails: DAWAAddressDetails = await response.json();
                
                const addressData: AddressData = {
                  address: selected.tekst,
                  latitude: addressDetails.adgangspunkt.koordinater[1], // latitude is second
                  longitude: addressDetails.adgangspunkt.koordinater[0], // longitude is first
                  bfe_number: addressDetails.bfe?.toString()
                };
                
                console.log('Address coordinates will be stored securely on backend');
                // Note: coordinates are NOT stored in frontend state for security
                onAddressSelect(addressData);
                
              } catch (error) {
                console.error('Error fetching address details:', error);
                // Still call onAddressSelect with basic data
                onAddressSelect({
                  address: selected.tekst,
                  latitude: 0,
                  longitude: 0
                });
              }
            }
          },
          minLength: 2,
          delay: 300,
          type: 'adresse', // Only show addresses, not street names
          per_side: 8 // Limit suggestions for better performance
        });
        
        setIsInitialized(true);
        console.log('DAWA autocomplete initialized successfully');
        
      } catch (error) {
        console.error('Error initializing DAWA autocomplete:', error);
      }
    }
  }, [isLoading, onAddressSelect, onChange, isInitialized]);

  // Reset address validation when value changes externally
  useEffect(() => {
    if (!value) {
      setHasValidAddress(false);
    }
  }, [value]);

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHasValidAddress(false);
          }}
          placeholder={isLoading ? "Indlæser adresse-søgning..." : placeholder}
          required={required}
          autoComplete="off"
          disabled={isLoading}
        />
      </div>
      
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1 text-gray-500">
          <Shield className="h-3 w-3" />
          Koordinater gemmes sikkert på server
        </div>
        {hasValidAddress && (
          <Badge variant="outline" className="text-xs">
            Gyldig adresse valgt
          </Badge>
        )}
      </div>
      
      {isLoading && (
        <p className="text-xs text-gray-500">Indlæser DAWA adresse-søgning...</p>
      )}
    </div>
  );
};
