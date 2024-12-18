import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  private filterSensitiveHeaders(
    headers: Record<string, any>,
  ): Record<string, any> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
      'x-csrf-token',
    ];
    const filteredHeaders = { ...headers };
    sensitiveHeaders.forEach((header) => {
      if (filteredHeaders[header]) {
        delete filteredHeaders[header];
      }
    });
    return filteredHeaders;
  }

  private filterSensitiveBody(body: Record<string, any>): Record<string, any> {
    const sensitiveBodyParams = [
      'password',
      'confirmPassword',
      'currentPassword',
      'newPassword',
      'creditCardNumber',
      'cvv',
      'ssn',
      'securityAnswer',
      'token',
    ];
    const filteredBody = { ...body };
    sensitiveBodyParams.forEach((param) => {
      if (filteredBody[param]) {
        delete filteredBody[param];
      }
    });
    return filteredBody;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const filteredHeaders = this.filterSensitiveHeaders(req.headers);
    const filteredBody = this.filterSensitiveBody(req.body);

    this.logger.log(`Incoming Request: ${req.method} ${req.url}`);
    this.logger.log(`Headers: ${JSON.stringify(filteredHeaders)}`);
    this.logger.log(`Body: ${JSON.stringify(filteredBody)}`);

    const oldWrite = res.write;
    const oldEnd = res.end;
    const chunks: any[] = [];

    res.write = function (chunk: any) {
      chunks.push(chunk);
      return oldWrite.apply(res, arguments);
    };

    res.end = function (chunk: any) {
      if (chunk) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString('utf8');
      const duration = Date.now() - start;
      this.logger.log(`Response Status: ${res.statusCode}`);
      this.logger.log(`Response Headers: ${JSON.stringify(res.getHeaders())}`);
      this.logger.log(`Response Body: ${body}`);
      this.logger.log(`Request to ${req.method} ${req.url} took ${duration}ms`);
      return oldEnd.apply(res, arguments);
    }.bind(this);

    next();
  }
}
