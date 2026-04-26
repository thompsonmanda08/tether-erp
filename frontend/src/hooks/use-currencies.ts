import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrencies,
  createCurrency,
  updateCurrency,
} from "@/app/_actions/currencies";

const CURRENCIES_KEY = ["currencies"] as const;

interface CurrencyParams {
  code: string;
  name: string;
  symbol: string;
  isDefault?: boolean;
  active?: boolean;
}

/**
 * Hook for fetching all currencies
 */
export function useCurrencies() {
  return useQuery({
    queryKey: CURRENCIES_KEY,
    queryFn: async () => {
      const result = await fetchCurrencies();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
  });
}

/**
 * Hook for creating a new currency
 */
export function useCreateCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCIES_KEY });
    },
  });
}

/**
 * Hook for updating an existing currency
 */
export function useUpdateCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ currencyId, ...data }: CurrencyParams & { currencyId: string }) =>
      updateCurrency(currencyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCIES_KEY });
    },
  });
}
