
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
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load DAWA script
  useEffect(() => {
    const loadDAWAScript = () => {
      if (window.dawaAutocomplete) {
        setIsScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.dataforsyningen.dk/dawa/assets/dawa-autocomplete2/latest/dawa-autocomplete2.min.js';
      script.onload = () => setIsScriptLoaded(true);
      script.onerror = () => console.error('Failed to load DAWA autocomplete script');
      document.head.appendChild(script);

      // Add CSS for autocomplete styling
      const style = document.createElement('style');
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
        }
        .dawa-autocomplete-suggestion {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          font-size: 14px;
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
    };

    loadDAWAScript();
  }, []);

  // Initialize DAWA autocomplete
  useEffect(() => {
    if (isScriptLoaded && inputRef.current && window.dawaAutocomplete && !isInitialized) {
      try {
        window.dawaAutocomplete.dawaAutocomplete(inputRef.current, {
          select: async (selected: DAWAAddress) => {
            console.log('DAWA address selected:', selected);
            
            // Update the input value
            onChange(selected.tekst);
            
            // Fetch detailed address information including coordinates
            if (onAddressSelect) {
              try {
                const response = await fetch(
                  `https://api.dataforsyningen.dk/adresser/${selected.data.id}?struktur=mini`
                );
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
          }
        });
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing DAWA autocomplete:', error);
      }
    }
  }, [isScriptLoaded, onAddressSelect, onChange, isInitialized]);

  return (
    <div className="dawa-autocomplete-container">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
    </div>
  );
};
