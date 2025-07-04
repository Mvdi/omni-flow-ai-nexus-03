import { supabase } from '@/integrations/supabase/client';

export const uploadCompanyLogo = async () => {
  try {
    // Fetch the logo from the public folder
    const response = await fetch('/mm-multipartner-logo.png');
    if (!response.ok) {
      throw new Error('Failed to fetch logo');
    }
    
    const blob = await response.blob();
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload('mm-multipartner-logo.png', blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      throw error;
    }

    console.log('Logo uploaded successfully:', data);
    return data;
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
};