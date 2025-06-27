
import React, { useEffect, useRef, useState, useCallback } from 'react';
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

interface DAWASuggestion {
  tekst: string;
  type: string;
  data: {
    id?: string;
    adgangspunkt?: {
      koordinater: [number, number]; // [longitude, latitude]
    };
    bfe?: number;
    vejkode?: number;
    husnr?: string;
    suppl?: string;
    postnr?: string;
    postnrnavn?: string;
  };
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
  const [suggestions, setSuggestions] = useState<DAWASuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidAddress, setHasValidAddress] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Debounced search function
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }, []);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const encodedQuery = encodeURIComponent(query);
      const caretPos = query.length;
      
      const response = await fetch(
        `https://api.dataforsyningen.dk/autocomplete?q=${encodedQuery}&caretpos=${caretPos}&type=adresse&per_side=10&fuzzy=`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      console.log('DAWA API Response:', data);
      
      if (Array.isArray(data)) {
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setHighlightedIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(debounce(searchAddresses, 300), [searchAddresses]);

  useEffect(() => {
    if (value) {
      debouncedSearch(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setHasValidAddress(false);
    }
  }, [value, debouncedSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHasValidAddress(false);
  };

  const handleSuggestionClick = (suggestion: DAWASuggestion) => {
    console.log('Selected suggestion:', suggestion);
    
    onChange(suggestion.tekst);
    setShowSuggestions(false);
    setHasValidAddress(true);
    
    if (onAddressSelect && suggestion.data.adgangspunkt) {
      const addressData: AddressData = {
        address: suggestion.tekst,
        latitude: suggestion.data.adgangspunkt.koordinater[1], // latitude is second
        longitude: suggestion.data.adgangspunkt.koordinater[0], // longitude is first
        bfe_number: suggestion.data.bfe?.toString()
      };
      
      console.log('Calling onAddressSelect with:', addressData);
      onAddressSelect(addressData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 200);
  };

  return (
    <div className="space-y-2 relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full"
        />
        
        {hasValidAddress && (
          <Badge variant="outline" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">
            Gyldig adresse
          </Badge>
        )}
        
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.tekst}-${index}`}
              ref={el => suggestionRefs.current[index] = el}
              className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                index === highlightedIndex ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="text-sm font-medium text-gray-900">
                {suggestion.tekst}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {suggestion.type === 'adresse' ? 'Adresse' : 
                 suggestion.type === 'adgangsadresse' ? 'Adgangsadresse' : 
                 suggestion.type === 'vejnavn' ? 'Vejnavn' : suggestion.type}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
