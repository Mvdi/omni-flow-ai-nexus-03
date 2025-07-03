import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  address: string;
}

interface GeocodeResponse {
  lat: number;
  lng: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address }: GeocodeRequest = await req.json();
    
    if (!address || typeof address !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid address parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Input validation and sanitization
    const sanitizedAddress = address.trim().substring(0, 200); // Limit length
    if (!sanitizedAddress) {
      return new Response(
        JSON.stringify({ error: 'Address cannot be empty' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const mapboxToken = Deno.env.get('MAPBOX_API_KEY');
    if (!mapboxToken) {
      console.error('MAPBOX_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not available' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const encodedAddress = encodeURIComponent(`${sanitizedAddress}, Denmark`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=dk&limit=1`;
    
    console.log('🌍 Geocoding address:', sanitizedAddress);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox geocoding error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Geocoding failed' }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      console.log(`✅ Geocoded "${sanitizedAddress}" to ${lat}, ${lng}`);
      
      const result: GeocodeResponse = { lat, lng };
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    console.warn('No geocoding results for:', sanitizedAddress);
    return new Response(
      JSON.stringify({ error: 'Address not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
    
  } catch (error) {
    console.error('Geocoding function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);