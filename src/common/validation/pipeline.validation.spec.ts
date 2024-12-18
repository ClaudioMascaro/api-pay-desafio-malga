import { ZodValidationPipe } from './pipeline.validation';
import { ZodSchema, z } from 'zod';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;
  let schema: ZodSchema;

  beforeEach(() => {
    schema = z.object({
      name: z.string(),
      age: z.number().min(0),
    });
    pipe = new ZodValidationPipe(schema);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should validate and transform the value correctly', () => {
    const value = { name: 'John', age: 30 };
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: null,
      data: '',
    };

    expect(pipe.transform(value, metadata)).toEqual(value);
  });

  it('should throw BadRequestException if validation fails', () => {
    const value = { name: 'John', age: -1 };
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: null,
      data: '',
    };

    try {
      pipe.transform(value, metadata);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toEqual({
        message: 'Validation failed',
        statusCode: 400,
        validationErrors: expect.any(Array),
      });
    }
  });

  it('should throw BadRequestException if value is not an object', () => {
    const value = 'invalid';
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: null,
      data: '',
    };

    try {
      pipe.transform(value, metadata);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toEqual({
        message: 'Validation failed',
        statusCode: 400,
        validationErrors: expect.any(Array),
      });
    }
  });
});
