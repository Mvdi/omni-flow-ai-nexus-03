
export interface MapboxGeocodingResponse {
  features: Array<{
    geometry: {
      coordinates: [number, number]; // [longitude, latitude]
    };
    place_name: string;
    relevance: number;
  }>;
}

export interface MapboxDirectionsResponse {
  routes: Array<{
    distance: number; // meters
    duration: number; // seconds
    geometry: {
      coordinates: Array<[number, number]>;
    };
  }>;
}

export class MapboxService {
  private readonly accessToken: string;
  private readonly baseUrl = 'https://api.mapbox.com';

  constructor() {
    // Use a public token for development - in production, this should be from environment
    this.accessToken = 'pk.eyJ1IjoibG92YWJsZS1kZXYiLCJhIjoiY2x6NHQ4YmZqMGFjeTJycGZpb2VmbGhzZCJ9.qzHLmkYaBHjfJGCGGGfZ3Q';
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const encodedAddress = encodeURIComponent(`${address}, Denmark`);
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${this.accessToken}&country=dk&limit=1`;
      
      console.log('🌍 Geocoding address:', address);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Mapbox geocoding error:', response.status);
        return null;
      }

      const data: MapboxGeocodingResponse = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        console.log(`✅ Geocoded "${address}" to ${lat}, ${lng}`);
        return { lat, lng };
      }
      
      console.warn('No geocoding results for:', address);
      return null;
    } catch (error) {
      console.error('Geocoding failed for:', address, error);
      return null;
    }
  }

  async getDistanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>
  ): Promise<{ distances: number[][]; durations: number[][] }> {
    try {
      const distances: number[][] = [];
      const durations: number[][] = [];

      // Mapbox Directions API doesn't have a matrix endpoint in the free tier
      // So we calculate point-to-point distances using Haversine for now
      // For production, you'd use Mapbox Matrix API or make individual direction requests

      for (let i = 0; i < origins.length; i++) {
        const distanceRow: number[] = [];
        const durationRow: number[] = [];
        
        for (let j = 0; j < destinations.length; j++) {
          const distance = this.calculateHaversineDistance(
            origins[i].lat, origins[i].lng,
            destinations[j].lat, destinations[j].lng
          );
          
          // Estimate driving time: ~2.5 minutes per km in city traffic
          const duration = Math.round(distance * 2.5 * 60); // seconds
          
          distanceRow.push(Math.round(distance * 1000)); // meters
          durationRow.push(duration);
        }
        
        distances.push(distanceRow);
        durations.push(durationRow);
      }

      return { distances, durations };
    } catch (error) {
      console.error('Distance matrix calculation failed:', error);
      throw error;
    }
  }

  async getRouteDistance(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): Promise<{ distance: number; duration: number } | null> {
    try {
      const url = `${this.baseUrl}/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?access_token=${this.accessToken}&geometries=geojson`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Mapbox directions error:', response.status);
        return null;
      }

      const data: MapboxDirectionsResponse = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          distance: route.distance, // meters
          duration: route.duration  // seconds
        };
      }
      
      return null;
    } catch (error) {
      console.error('Route calculation failed:', error);
      return null;
    }
  }

  private calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // kilometers
  }
}

export const mapboxService = new MapboxService();
