import { z } from 'zod';
import currencyCodes from 'currency-codes';

const currencyEnum = currencyCodes.codes() as [string, ...string[]];

export const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(currencyEnum),
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

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

export type CreatePaymentResponse = {
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
