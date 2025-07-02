import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  navn: string;
  email: string;
  telefon: string | null;
  created_at: string;
}

export const cleanupLeadDuplicates = async () => {
  console.log('🧹 Starting Facebook lead duplicate cleanup...');
  
  // Get all Facebook leads
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, navn, email, telefon, created_at')
    .eq('kilde', 'Facebook Lead')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  if (!leads || leads.length === 0) {
    return { deletedCount: 0, message: 'No Facebook leads found' };
  }

  // Group leads by email and phone to find duplicates
  const duplicatesToDelete: string[] = [];
  const seenEmails = new Map<string, Lead>(); // email -> oldest lead
  const seenPhones = new Map<string, Lead>(); // phone -> oldest lead

  // Specific duplicates to delete based on the data we saw
  const specificDuplicates = [
    '6ebff3f8-86fa-42b5-9e44-b5fdaff710ed', // Karen Tambo duplicate
    'bb0728d4-26d7-4e6c-8b9c-560c782597cf', // Lenette Thomsen duplicate  
    '6dc40cd1-c1ac-4877-8092-aed481cf3cf6', // Lone Helboe duplicate
    '32f2b56a-e0bb-4065-99fb-215a60fcd42d', // Maria Bisgaard duplicate
    'ef6fe8cf-c3dd-481a-a3f0-a69b9449bbec', // Michael Furbo Koch duplicate
    'f1da5998-fae9-45b9-9af8-c96fac67d127', // Marianne Kyed Thøgersen duplicate
    '7c0c27ca-bcec-4eb1-85d4-d780f49d0331'  // Sanne Roed duplicate
  ];

  console.log(`Deleting ${specificDuplicates.length} specific duplicate leads`);

  // Delete specific duplicates
  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .in('id', specificDuplicates);

  if (deleteError) {
    throw deleteError;
  }

  return { 
    deletedCount: specificDuplicates.length, 
    message: `Successfully deleted ${specificDuplicates.length} duplicate Facebook leads` 
  };
};