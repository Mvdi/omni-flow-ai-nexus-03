import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const KEATECH_API_BASE = 'https://api.keatech.com';
const KEATECH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2FwaS5rZWF0ZWNoLmNvbSIsImlzcyI6IktlYXRlY2guQWRtaW4uQ29uc29sZSIsImV4cCI6MTg0NjE0MTE5MiwiaWF0IjoxNzUxNDQ2NzkyLCJuYmYiOjE3NTE0NDY3OTIsImp0aSI6Ijk5Zjc0YzFkLWFhZDItNGQ3Ny05OGRjLTI0NjkwYjFkMWJkYiIsInN1YiI6IjI0NDAwIn0.SeQxV1D4CYzgSmTu8w3Yz1blrz5qWWbnaKm1t2nO-B8';

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
      const response = await fetch(`${KEATECH_API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${KEATECH_TOKEN}`,
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