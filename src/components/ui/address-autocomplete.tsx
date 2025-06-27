
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

// DAWA types based on official documentation
interface DAWAAutocompleteItem {
  tekst: string;
  adresse?: {
    id: string;
    adgangspunkt: {
      koordinater: [number, number]; // [longitude, latitude]
    };
    bfe?: number;
  };
}

declare global {
  interface Window {
    dawaAutocomplete?: (element: HTMLInputElement, options: any) => void;
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
  const [hasValidAddress, setHasValidAddress] = useState(false);

  // Load DAWA autocomplete library
  useEffect(() => {
    const loadDAWA = () => {
      // Check if already loaded
      if (window.dawaAutocomplete) {
        setIsLoading(false);
        return;
      }

      console.log('Loading DAWA autocomplete...');

      // Load the script
      const script = document.createElement('script');
      script.src = 'https://dawa.aws.dk/js/autocomplete/autocomplete.js';
      script.async = true;
      
      script.onload = () => {
        console.log('DAWA autocomplete loaded successfully');
        setIsLoading(false);
      };
      
      script.onerror = () => {
        console.error('Failed to load DAWA autocomplete');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    };

    loadDAWA();
  }, []);

  // Initialize DAWA autocomplete when ready
  useEffect(() => {
    if (!isLoading && inputRef.current && window.dawaAutocomplete) {
      try {
        console.log('Initializing DAWA autocomplete on input');
        
        window.dawaAutocomplete(inputRef.current, {
          id: 'autocomplete-container-' + id,
          select: (selected: DAWAAutocompleteItem) => {
            console.log('DAWA address selected:', selected);
            
            // Update input value
            onChange(selected.tekst);
            setHasValidAddress(true);
            
            // Extract coordinates and call onAddressSelect if provided
            if (onAddressSelect && selected.adresse) {
              const addressData: AddressData = {
                address: selected.tekst,
                latitude: selected.adresse.adgangspunkt.koordinater[1], // latitude is second
                longitude: selected.adresse.adgangspunkt.koordinater[0], // longitude is first
                bfe_number: selected.adresse.bfe?.toString()
              };
              
              console.log('Calling onAddressSelect with:', addressData);
              onAddressSelect(addressData);
            }
          },
          minLength: 2,
          delay: 300
        });
        
        console.log('DAWA autocomplete initialized successfully');
        
      } catch (error) {
        console.error('Error initializing DAWA autocomplete:', error);
      }
    }
  }, [isLoading, onAddressSelect, onChange, id]);

  // Reset address validation when value changes externally
  useEffect(() => {
    if (!value) {
      setHasValidAddress(false);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setHasValidAddress(false);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={isLoading ? "Indlæser..." : placeholder}
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
        <p className="text-xs text-gray-500">Indlæser adresse-søgning...</p>
      )}
    </div>
  );
};
