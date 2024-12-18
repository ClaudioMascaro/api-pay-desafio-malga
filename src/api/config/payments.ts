import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env' });

const config = {
  provider1: {
    apiUrl: `${process.env.PAYMENTS_PROVIDER1_API_URL}`,
  },
  provider2: {
    apiUrl: `${process.env.PAYMENTS_PROVIDER2_API_URL}`,
  },
};

export default registerAs('payments', () => config);
