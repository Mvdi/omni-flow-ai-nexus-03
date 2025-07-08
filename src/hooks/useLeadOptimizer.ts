import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Lead system optimizer - handles Facebook lead processing,
 * duplicate detection, and AI scoring improvements
 */
export const useLeadOptimizer = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  // Optimize Facebook lead processing
  const optimizeFacebookLeads = async () => {
    setIsOptimizing(true);
    
    try {
      console.log('🚀 Starting Facebook lead optimization...');
      
      // Get Facebook leads that need processing
      const { data: unprocessedLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, navn, email, telefon, adresse, kilde, noter, ai_score, ai_last_scored_at')
        .eq('kilde', 'Facebook Lead')
        .or('ai_score.is.null,ai_last_scored_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (leadsError) throw leadsError;

      if (!unprocessedLeads || unprocessedLeads.length === 0) {
        toast({
          title: "Alle Facebook leads er optimeret",
          description: "Ingen leads behøver behandling.",
        });
        return;
      }

      console.log(`Found ${unprocessedLeads.length} Facebook leads to optimize`);

      // Process each lead with AI scoring
      const optimizedLeads = [];
      
      for (const lead of unprocessedLeads) {
        let score = 50; // Base score
        const scoreFactors = [];

        // Phone number scoring
        if (lead.telefon && lead.telefon.trim() && lead.telefon.length >= 8) {
          score += 20;
          scoreFactors.push('Har telefonnummer');
        }

        // Address scoring
        if (lead.adresse && lead.adresse.trim()) {
          score += 15;
          scoreFactors.push('Har adresse');
        }

        // Name quality scoring
        if (lead.navn && lead.navn.includes(' ') && !lead.navn.toLowerCase().includes('test')) {
          score += 10;
          scoreFactors.push('Komplet navn');
        }

        // Content quality scoring
        if (lead.noter && lead.noter.length > 50) {
          score += 15;
          scoreFactors.push('Detaljerede noter');
        }

        // Email quality scoring
        if (lead.email && !lead.email.includes('noreply') && !lead.email.includes('no-reply')) {
          score += 10;
          scoreFactors.push('Ægte email');
        }

        // Service detection from notes
        let detectedServices = [];
        if (lead.noter) {
          const serviceKeywords = [
            'vinduespudsning', 'rengøring', 'vinduer', 'facade', 'erhverv', 'privat'
          ];
          
          detectedServices = serviceKeywords.filter(keyword => 
            lead.noter.toLowerCase().includes(keyword)
          );
          
          if (detectedServices.length > 0) {
            score += 15;
            scoreFactors.push(`Service: ${detectedServices.join(', ')}`);
          }
        }

        // Cap score at 100
        score = Math.min(score, 100);

        optimizedLeads.push({
          id: lead.id,
          ai_score: score,
          ai_score_factors: scoreFactors,
          ai_last_scored_at: new Date().toISOString(),
          services: detectedServices.length > 0 ? detectedServices.join(', ') : null
        });
      }

      // Update leads with optimized scores
      for (const optimizedLead of optimizedLeads) {
        await supabase
          .from('leads')
          .update({
            ai_score: optimizedLead.ai_score,
            ai_score_factors: optimizedLead.ai_score_factors,
            ai_last_scored_at: optimizedLead.ai_last_scored_at,
            services: optimizedLead.services
          })
          .eq('id', optimizedLead.id);
      }

      toast({
        title: "Facebook leads optimeret",
        description: `${optimizedLeads.length} leads blev analyseret og scoret.`,
      });

      console.log(`✅ Optimized ${optimizedLeads.length} Facebook leads`);
      return optimizedLeads;

    } catch (error: any) {
      console.error('Failed to optimize Facebook leads:', error);
      toast({
        title: "Lead optimering fejlede",
        description: error.message || "Kunne ikke optimere Facebook leads.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Detect and handle lead duplicates
  const detectLeadDuplicates = async () => {
    setIsOptimizing(true);
    
    try {
      console.log('🔍 Detecting lead duplicates...');
      
      // Get all leads for duplicate detection
      const { data: allLeads, error } = await supabase
        .from('leads')
        .select('id, navn, email, telefon, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group leads by email and phone
      const emailGroups = new Map();
      const phoneGroups = new Map();
      
      allLeads?.forEach(lead => {
        // Group by email
        if (lead.email) {
          const email = lead.email.toLowerCase().trim();
          if (!emailGroups.has(email)) {
            emailGroups.set(email, []);
          }
          emailGroups.get(email).push(lead);
        }
        
        // Group by phone
        if (lead.telefon) {
          const phone = lead.telefon.replace(/\D/g, ''); // Remove non-digits
          if (phone.length >= 8) {
            if (!phoneGroups.has(phone)) {
              phoneGroups.set(phone, []);
            }
            phoneGroups.get(phone).push(lead);
          }
        }
      });

      // Find duplicates
      const duplicateGroups = [];
      
      // Check email duplicates
      emailGroups.forEach((leads, email) => {
        if (leads.length > 1) {
          duplicateGroups.push({
            type: 'email',
            key: email,
            leads: leads
          });
        }
      });

      // Check phone duplicates
      phoneGroups.forEach((leads, phone) => {
        if (leads.length > 1) {
          duplicateGroups.push({
            type: 'phone',
            key: phone,
            leads: leads
          });
        }
      });

      if (duplicateGroups.length === 0) {
        toast({
          title: "Ingen duplikater fundet",
          description: "Alle leads er unikke.",
        });
        return [];
      }

      console.log(`Found ${duplicateGroups.length} duplicate groups`);

      toast({
        title: "Duplikater detekteret",
        description: `${duplicateGroups.length} grupper af duplikerede leads fundet.`,
        variant: "default",
      });

      return duplicateGroups;

    } catch (error: any) {
      console.error('Failed to detect lead duplicates:', error);
      toast({
        title: "Duplikat detektion fejlede",
        description: error.message || "Kunne ikke detektere duplikerede leads.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsOptimizing(false);
    }
  };

  // Convert high-quality leads to customers
  const convertLeadsToCustomers = async () => {
    setIsOptimizing(true);
    
    try {
      console.log('🎯 Converting high-quality leads to customers...');
      
      // Get high-scoring leads that aren't converted yet
      const { data: highQualityLeads, error } = await supabase
        .from('leads')
        .select('id, navn, email, telefon, adresse, by, postnummer, virksomhed, ai_score')
        .gte('ai_score', 80)
        .not('id', 'in', `(SELECT lead_id FROM customer_conversions WHERE lead_id IS NOT NULL)`);

      if (error) throw error;

      if (!highQualityLeads || highQualityLeads.length === 0) {
        toast({
          title: "Ingen leads til konvertering",
          description: "Ingen høj-kvalitets leads fundet til konvertering.",
        });
        return;
      }

      const conversions = [];

      for (const lead of highQualityLeads) {
        // Check if customer already exists
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', lead.email)
          .limit(1)
          .maybeSingle();

        if (!existingCustomer) {
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              navn: lead.navn,
              email: lead.email,
              telefon: lead.telefon,
              adresse: lead.adresse,
              by: lead.by,
              postnummer: lead.postnummer,
              virksomhedsnavn: lead.virksomhed,
              score: lead.ai_score,
              noter: `Konverteret fra lead med AI score: ${lead.ai_score}`,
              kundetype: 'Potentiel'
            })
            .select('id')
            .single();

          if (customerError) {
            console.error('Failed to create customer from lead:', customerError);
            continue;
          }

          conversions.push({
            leadId: lead.id,
            customerId: newCustomer.id,
            leadName: lead.navn
          });

          // Update lead status
          await supabase
            .from('leads')
            .update({ status: 'Konverteret' })
            .eq('id', lead.id);
        }
      }

      if (conversions.length > 0) {
        toast({
          title: "Leads konverteret til kunder",
          description: `${conversions.length} høj-kvalitets leads blev konverteret til kunder.`,
        });
      }

      console.log(`✅ Converted ${conversions.length} leads to customers`);
      return conversions;

    } catch (error: any) {
      console.error('Failed to convert leads to customers:', error);
      toast({
        title: "Lead konvertering fejlede",
        description: error.message || "Kunne ikke konvertere leads til kunder.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return {
    optimizeFacebookLeads,
    detectLeadDuplicates,
    convertLeadsToCustomers,
    isOptimizing
  };
};