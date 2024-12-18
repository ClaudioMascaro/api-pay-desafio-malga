import z from 'zod';

export const Provider2CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  statementDescriptor: z.string().max(255),
  paymentType: z.enum(['card']),
  card: z.object({
    number: z.string().regex(/^[0-9]{16}$/, 'Invalid card number'),
    holder: z.string().min(1, 'Card holder name is required'),
    cvv: z.string().regex(/^[0-9]{3}$/, 'Invalid CVV'),
    expiration: z.string().regex(/^\d{2}\/\d{2}$/, 'Invalid expiration date'),
    installmentNumber: z.number().min(1).max(12).optional(),
  }),
});

export type Provider2CreatePaymentDto = z.infer<
  typeof Provider2CreatePaymentSchema
>;

export type Provider2CreatePaymentResponse = {
  id: string;
  date: string;
  status: 'paid' | 'failed' | 'voided';
  amount: number;
  originalAmount: number;
  currency: string;
  statementDescriptor: string;
  paymentType: 'card';
  cardId: string;
};
