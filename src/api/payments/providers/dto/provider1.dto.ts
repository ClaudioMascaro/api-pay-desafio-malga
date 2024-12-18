import z from 'zod';

export const Provider1CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().max(255),
  paymentMethod: z.object({
    type: z.enum(['card']),
    card: z.object({
      number: z.string().regex(/^[0-9]{16}$/, 'Invalid card number'),
      holderName: z.string().min(1, 'Card holder name is required'),
      cvv: z.string().regex(/^[0-9]{3}$/, 'Invalid CVV'),
      expirationDate: z
        .string()
        .regex(/^\d{2}\/\d{4}$/, 'Invalid expiration date'),
      installments: z.number().min(1).max(12).optional(),
    }),
  }),
});

export type Provider1CreatePaymentDto = z.infer<
  typeof Provider1CreatePaymentSchema
>;

export type Provider1CreatePaymentResponse = {
  id: string;
  createdAt: string;
  status: 'authorized' | 'failed' | 'refunded';
  originalAmount: number;
  currentAmount: number;
  currency: string;
  description: string;
  paymentMethod: 'card';
  cardId: string;
};
