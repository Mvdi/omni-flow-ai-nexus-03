
import React, { useEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';

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

// DAWA types
interface DAWASelectedAddress {
  tekst: string;
  data: {
    id: string;
  };
}

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
          
          cssLink.onload = () => {
            console.log('DAWA CSS loaded successfully');
          };
          
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
                console.log('Fetching address details...');
                
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
                
                console.log('Address data ready for backend storage');
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
          type: 'adresse',
          per_side: 8
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
        {hasValidAddress && (
          <Badge variant="outline" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">
            Gyldig adresse
          </Badge>
        )}
      </div>
      
      {isLoading && (
        <p className="text-xs text-gray-500">Indlæser DAWA adresse-søgning...</p>
      )}
    </div>
  );
};
