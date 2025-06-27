
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useOrderMigration = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const { user } = useAuth();

  const migrateOrderDurations = async () => {
    if (!user || isMigrating) return;
    
    setIsMigrating(true);
    console.log('🔧 Starting order duration migration...');

    try {
      // Get all orders with missing or zero estimated_duration
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_type, estimated_duration')
        .eq('user_id', user.id)
        .or('estimated_duration.is.null,estimated_duration.eq.0');

      if (fetchError) throw fetchError;

      if (!orders || orders.length === 0) {
        console.log('✅ All orders already have valid durations');
        return;
      }

      console.log(`🔧 Found ${orders.length} orders needing duration update`);

      // Service type to duration mapping (in minutes)
      const serviceDurations: Record<string, number> = {
        'Vinduespudsning': 45,
        'Kontorrengøring': 90,
        'Privatrengøring': 120,
        'Byggerengøring': 180,
        'Specialrengøring': 150,
        'Terrasse rengøring': 60,
        'Gulvbehandling': 240,
        'Tæpperengøring': 75,
        'Rengøring': 90, // Default for generic cleaning
        'Service': 60, // Default for generic service
      };

      let updated = 0;
      for (const order of orders) {
        // Find matching service type or use default
        let duration = 60; // Default fallback
        
        for (const [serviceType, serviceDuration] of Object.entries(serviceDurations)) {
          if (order.order_type?.toLowerCase().includes(serviceType.toLowerCase())) {
            duration = serviceDuration;
            break;
          }
        }

        // Add some realistic variance (±20%)
        const variance = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
        duration = Math.round(duration * variance);

        const { error: updateError } = await supabase
          .from('orders')
          .update({ estimated_duration: duration })
          .eq('id', order.id);

        if (updateError) {
          console.error('Error updating order:', order.id, updateError);
        } else {
          updated++;
        }
      }

      console.log(`✅ Updated ${updated} orders with realistic durations`);
      toast.success(`Opdateret ${updated} ordrer med realistiske service-tider`);

    } catch (error) {
      console.error('Order migration error:', error);
      toast.error('Fejl ved opdatering af ordre-tider');
    } finally {
      setIsMigrating(false);
    }
  };

  // Auto-run migration on mount
  useEffect(() => {
    const timer = setTimeout(migrateOrderDurations, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  return { migrateOrderDurations, isMigrating };
};
