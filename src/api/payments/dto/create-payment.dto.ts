import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().max(255),
  paymentMethod: z.object({
    type: z.enum(['card']),
    card: z.object({
      number: z.string().regex(/^\d{16}$/, 'Invalid card number'),
      holderName: z.string().min(1, 'Card holder name is required'),
      cvv: z.string().regex(/^\d{3}$/, 'Invalid CVV'),
      expirationDate: z
        .string()
        .regex(/^\d{2}\/\d{4}$/, 'Invalid expiration date'),
      installments: z.number().min(1).max(12).optional(),
    }),
  }),
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

export type CreatePaymentResponse = {
  id: string;
  createdDate: string;
  status: 'success' | 'failed' | 'refunded';
  amount: number;
  originalAmount: number;
  currency: string;
  description: string;
  paymentMethod: 'card';
  cardId: string;
  provider: 'provider1' | 'provider2';
};
