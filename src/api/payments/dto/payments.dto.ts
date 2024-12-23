import { z } from 'zod';
import currencyCodes from 'currency-codes';

const currencyEnum = currencyCodes.codes() as [string, ...string[]];

export const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(currencyEnum),
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

export const RefundPaymentSchema = z.object({
  amount: z.number().positive(),
});

export type RefundPaymentDto = z.infer<typeof RefundPaymentSchema>;

export type PaymentStatus = 'success' | 'refused' | 'refunded';

export type PaymentResponse = {
  id: string;
  createdDate: string;
  status: PaymentStatus;
  amount: number;
  originalAmount: number;
  currency: string;
  description: string;
  paymentMethod: 'card';
  cardId: string;
};
