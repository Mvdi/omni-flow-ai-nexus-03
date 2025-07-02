import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuoteProduct {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  unit: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const useQuoteProducts = () => {
  return useQuery({
    queryKey: ['quote-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_products')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as QuoteProduct[];
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: Omit<QuoteProduct, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'is_active'>) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('quote_products')
        .insert({
          ...productData,
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<QuoteProduct> }) => {
      const { data, error } = await supabase
        .from('quote_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-products'] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('quote_products')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-products'] });
    },
  });
};