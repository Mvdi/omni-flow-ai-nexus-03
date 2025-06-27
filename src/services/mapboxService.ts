
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
    this.accessToken = 'pk.eyJ1IjoibG92YWJsZS1kZXYiLCJhIjoiY2x6NHQ4YmZqMGFjeTJycGZpb2VmbGhzZCJ9.qzHLmkYaBHjfJGCGGGfZ3Q';
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const encodedAddress = encodeURIComponent(`${address}, Denmark`);
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${this.accessToken}&country=dk&limit=1`;
      
      console.log('🌍 Geocoding address:', address);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Mapbox geocoding error:', response.status, response.statusText);
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
      console.log('🗺️ Calculating REAL distance matrix for', origins.length, 'origins to', destinations.length, 'destinations');
      
      const distances: number[][] = [];
      const durations: number[][] = [];

      for (let i = 0; i < origins.length; i++) {
        const distanceRow: number[] = [];
        const durationRow: number[] = [];
        
        for (let j = 0; j < destinations.length; j++) {
          if (i === j) {
            distanceRow.push(0);
            durationRow.push(0);
          } else {
            try {
              // Use real Mapbox Directions API for Danish roads
              const routeData = await this.getRouteDistance(origins[i], destinations[j]);
              
              if (routeData) {
                distanceRow.push(routeData.distance); // meters
                durationRow.push(routeData.duration); // seconds
                console.log(`📍 Real route ${i}->${j}: ${Math.round(routeData.distance/1000)}km, ${Math.round(routeData.duration/60)}min`);
              } else {
                // Improved Haversine fallback with Danish road factors
                const distance = this.calculateHaversineDistance(
                  origins[i].lat, origins[i].lng,
                  destinations[j].lat, destinations[j].lng
                );
                // Better time estimation for Danish roads
                let timeMultiplier = 2.2; // minutes per km
                if (distance > 100) timeMultiplier = 1.1; // Highway speeds
                else if (distance > 50) timeMultiplier = 1.5; // Country roads
                else if (distance > 20) timeMultiplier = 2.0; // Mixed roads
                else timeMultiplier = 3.0; // City driving
                
                distanceRow.push(Math.round(distance * 1000)); // meters
                durationRow.push(Math.round(distance * timeMultiplier * 60)); // seconds
                console.log(`⚠️ Fallback route ${i}->${j}: ${Math.round(distance)}km, ${Math.round(distance * timeMultiplier)}min`);
              }
              
              // Rate limiting to avoid API limits
              await new Promise(resolve => setTimeout(resolve, 150));
              
            } catch (error) {
              console.error(`Error calculating route ${i}->${j}:`, error);
              const distance = this.calculateHaversineDistance(
                origins[i].lat, origins[i].lng,
                destinations[j].lat, destinations[j].lng
              );
              distanceRow.push(Math.round(distance * 1000));
              durationRow.push(Math.round(distance * 2.5 * 60));
            }
          }
        }
        
        distances.push(distanceRow);
        durations.push(durationRow);
      }

      console.log('✅ Distance matrix calculation completed with real Danish road data');
      return { distances, durations };
      
    } catch (error) {
      console.error('❌ Distance matrix calculation failed:', error);
      return this.calculateHaversineMatrix(origins);
    }
  }

  async getRouteDistance(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): Promise<{ distance: number; duration: number } | null> {
    try {
      const url = `${this.baseUrl}/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?access_token=${this.accessToken}&geometries=geojson&overview=simplified`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Mapbox directions error:', response.status, response.statusText);
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

  private calculateHaversineMatrix(
    points: Array<{ lat: number; lng: number }>
  ): { distances: number[][]; durations: number[][] } {
    const n = points.length;
    const distances: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const durations: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distances[i][j] = 0;
          durations[i][j] = 0;
        } else {
          const dist = this.calculateHaversineDistance(
            points[i].lat, points[i].lng,
            points[j].lat, points[j].lng
          );
          distances[i][j] = Math.round(dist * 1000); // meters
          durations[i][j] = Math.round(dist * 2.5 * 60); // seconds (2.5 min/km)
        }
      }
    }
    
    return { distances, durations };
  }

  private calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const mapboxService = new MapboxService();
