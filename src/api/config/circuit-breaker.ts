import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env' });

const config = {
  timeout: `${process.env.CIRCUIT_BREAKER_TIMEOUT}`,
  errorThresholdPercentage: `${process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE}`,
  resetTimeout: `${process.env.CIRCUIT_BREAKER_RESET_TIMEOUT}`,
};

export default registerAs('circuitBreaker', () => config);
