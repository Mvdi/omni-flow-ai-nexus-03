
import React, { useEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';

// DAWA API types
interface DAWAAddress {
  id: string;
  tekst: string;
  type: 'vejnavn' | 'adgangsadresse' | 'adresse';
  data: {
    id: string;
    href: string;
  };
}

interface DAWAAddressDetails {
  id: string;
  href: string;
  adgangspunkt: {
    koordinater: [number, number]; // [longitude, latitude]
  };
  bfe?: number;
  vejstykke?: {
    navn: string;
  };
  husnr?: string;
  postnr?: {
    nr: string;
    navn: string;
  };
}

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

declare global {
  interface Window {
    dawaAutocomplete?: any;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load DAWA script and CSS
  useEffect(() => {
    const loadDAWA = async () => {
      // Check if already loaded
      if (window.dawaAutocomplete) {
        setIsLoaded(true);
        return;
      }

      try {
        // Load the script
        const script = document.createElement('script');
        script.src = 'https://cdn.dataforsyningen.dk/dawa/assets/dawa-autocomplete2/latest/dawa-autocomplete2.min.js';
        script.async = true;
        
        script.onload = () => {
          console.log('DAWA script loaded successfully');
          setIsLoaded(true);
        };
        
        script.onerror = () => {
          console.error('Failed to load DAWA script');
        };
        
        document.head.appendChild(script);

        // Add CSS for styling
        if (!document.querySelector('#dawa-autocomplete-styles')) {
          const style = document.createElement('style');
          style.id = 'dawa-autocomplete-styles';
          style.textContent = `
            .dawa-autocomplete-container {
              position: relative;
            }
            .dawa-autocomplete-suggestions {
              position: absolute;
              top: 100%;
              left: 0;
              right: 0;
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              z-index: 1000;
              max-height: 200px;
              overflow-y: auto;
              margin-top: 1px;
            }
            .dawa-autocomplete-suggestion {
              padding: 12px;
              border-bottom: 1px solid #f1f5f9;
              cursor: pointer;
              font-size: 14px;
              line-height: 1.4;
            }
            .dawa-autocomplete-suggestion:hover {
              background-color: #f8fafc;
            }
            .dawa-autocomplete-suggestion:last-child {
              border-bottom: none;
            }
            .dawa-autocomplete-suggestion-selected {
              background-color: #e2e8f0;
            }
          `;
          document.head.appendChild(style);
        }
      } catch (error) {
        console.error('Error loading DAWA:', error);
      }
    };

    loadDAWA();
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (isLoaded && inputRef.current && window.dawaAutocomplete && !isInitialized) {
      try {
        console.log('Initializing DAWA autocomplete');
        
        window.dawaAutocomplete.dawaAutocomplete(inputRef.current, {
          select: async (selected: DAWAAddress) => {
            console.log('DAWA address selected:', selected);
            
            // Update input value
            onChange(selected.tekst);
            
            // Fetch detailed address information
            if (onAddressSelect) {
              try {
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
                
                console.log('Address data with coordinates:', addressData);
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
          delay: 300
        });
        
        setIsInitialized(true);
        console.log('DAWA autocomplete initialized successfully');
      } catch (error) {
        console.error('Error initializing DAWA autocomplete:', error);
      }
    }
  }, [isLoaded, onAddressSelect, onChange, isInitialized]);

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="dawa-autocomplete-container">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
      </div>
      {!isLoaded && (
        <p className="text-xs text-gray-500">Indlæser adresse-søgning...</p>
      )}
    </div>
  );
};
