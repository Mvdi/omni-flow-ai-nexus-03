import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const KEATECH_API_BASE = 'https://api.keatech.com';

// Get Keatech token from Supabase secrets via edge function
const getKeatechToken = async (): Promise<string> => {
  try {
    const response = await fetch('https://tckynbgheicyqezqprdp.supabase.co/functions/v1/get-keatech-token');
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to get Keatech token:', error);
    throw new Error('Authentication failed');
  }
};

export interface Vehicle {
  id: string;
  name: string;
  deviceSerialNumber: string;
  licensePlateNumber: string;
  make: string;
  model: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  isDriving: boolean;
  mileage: number;
}

export interface Trip {
  id: string;
  vehicleId: string;
  startTime: string;
  endTime?: string;
  startLocation: {
    latitude: number;
    longitude: number;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
}

export interface TripPosition {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export function useKeatechAPI() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeKeatechRequest = useCallback(async (endpoint: string) => {
    try {
      const token = await getKeatechToken();
      const response = await fetch(`${KEATECH_API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      console.error('Keatech API error:', err);
      throw new Error(err.message || 'Failed to fetch from Keatech API');
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await makeKeatechRequest('/v2/vehicles');
      setVehicles(data);
      console.log('Fetched vehicles:', data);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Fejl ved hentning af køretøjer: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [makeKeatechRequest]);

  const fetchVehicleTrips = useCallback(async (vehicleId: string, startDate: string, endDate: string): Promise<Trip[]> => {
    try {
      const data = await makeKeatechRequest(`/v2/vehicles/${vehicleId}/trips?startTime=${startDate}&endTime=${endDate}`);
      return data;
    } catch (err: any) {
      console.error(`Error fetching trips for vehicle ${vehicleId}:`, err);
      return [];
    }
  }, [makeKeatechRequest]);

  const fetchTripPositions = useCallback(async (vehicleId: string, tripId: string): Promise<TripPosition[]> => {
    try {
      const data = await makeKeatechRequest(`/v2/vehicles/${vehicleId}/trips/${tripId}/positions`);
      return data;
    } catch (err: any) {
      console.error(`Error fetching positions for trip ${tripId}:`, err);
      return [];
    }
  }, [makeKeatechRequest]);

  const getVehicleByDeviceId = useCallback(async (deviceId: string): Promise<Vehicle | null> => {
    try {
      const data = await makeKeatechRequest(`/v2/vehicles/byDeviceId/${deviceId}`);
      return data;
    } catch (err: any) {
      console.error(`Error fetching vehicle by device ID ${deviceId}:`, err);
      return null;
    }
  }, [makeKeatechRequest]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    vehicles,
    isLoading,
    error,
    fetchVehicles,
    fetchVehicleTrips,
    fetchTripPositions,
    getVehicleByDeviceId,
  };
}