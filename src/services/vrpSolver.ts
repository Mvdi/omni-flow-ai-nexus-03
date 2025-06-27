
import { toast } from 'sonner';

export interface VRPStop {
  id: number;
  lat: number;
  lon: number;
  service_min: number;
  tw_start: number; // minutes from Monday 00:00
  tw_end: number;
  priority?: string;
  customer_name?: string;
}

export interface VRPVehicle {
  id: string;
  name: string;
  max_hours_per_day?: number;
  start_lat: number;
  start_lon: number;
}

export interface VRPRouteStop {
  stop_id: number;
  sequence: number;
  arrival_time: number;
  departure_time: number;
  travel_time_from_prev: number;
  day_idx: number; // 0=Monday, 1=Tuesday, etc.
}

export interface VRPVehicleRoute {
  vehicle_id: string;
  day_idx: number;
  stops: VRPRouteStop[];
  total_duration: number;
  total_travel_time: number;
}

export interface VRPOptimizeResponse {
  routes: VRPVehicleRoute[];
  total_distance_km: number;
  optimization_score: number;
  computation_time_ms: number;
}

export interface VRPOptimizeRequest {
  stops: VRPStop[];
  vehicles: VRPVehicle[];
  depot_lat?: number;
  depot_lon?: number;
}

class VRPSolverService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or fallback to localhost in development
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-solver-url.fly.dev' 
      : 'http://localhost:8000';
  }

  async optimizeRoutes(request: VRPOptimizeRequest): Promise<VRPOptimizeResponse> {
    try {
      console.log('🚀 Calling VRP solver with request:', request);

      const response = await fetch(`${this.baseUrl}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VRP solver error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ VRP solver response:', result);

      return result;
    } catch (error) {
      console.error('❌ VRP solver failed:', error);
      toast.error('Route optimization failed');
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Helper method to convert time to minutes from Monday 00:00
  static timeToMinutesFromMonday(dayOfWeek: number, hour: number, minute: number = 0): number {
    // dayOfWeek: 1=Monday, 2=Tuesday, ..., 5=Friday
    const dayOffset = (dayOfWeek - 1) * 24 * 60;
    const timeOffset = hour * 60 + minute;
    return dayOffset + timeOffset;
  }

  // Helper method to convert minutes from Monday 00:00 back to day and time
  static minutesFromMondayToDateTime(minutes: number): { day: number; hour: number; minute: number } {
    const day = Math.floor(minutes / (24 * 60)) + 1; // 1=Monday
    const remainingMinutes = minutes % (24 * 60);
    const hour = Math.floor(remainingMinutes / 60);
    const minute = remainingMinutes % 60;
    return { day, hour, minute };
  }
}

export const vrpSolver = new VRPSolverService();
