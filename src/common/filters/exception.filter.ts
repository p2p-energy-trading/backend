// import {
//   ExceptionFilter,
//   Catch,
//   ArgumentsHost,
//   HttpException,
//   Logger,
// } from '@nestjs/common';
// import { Request, Response } from 'express';

// @Catch(HttpException)
// export class HttpExceptionFilter implements ExceptionFilter {
//   private readonly logger = new Logger(HttpExceptionFilter.name);

//   catch(exception: HttpException, host: ArgumentsHost) {
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse<Response>();
//     const request = ctx.getRequest<Request>();
//     const status = exception.getStatus();

//     const errorResponse = {
//       success: false,
//       statusCode: status,
//       timestamp: new Date().toISOString(),
//       path: request.url,
//       method: request.method,
//       message: exception.message,
//       error: exception.getResponse(),
//     };

//     this.logger.error(
//       `HTTP Exception: ${status} ${exception.message}`,
//       exception.stack,
//       {
//         url: request.url,
//         method: request.method,
//         body: request.body,
//         params: request.params,
//         query: request.query,
//         user: (request as any).user?.prosumerId,
//       },
//     );

//     response.status(status).json(errorResponse);
//   }
// }

// @Catch()
// export class AllExceptionsFilter implements ExceptionFilter {
//   private readonly logger = new Logger(AllExceptionsFilter.name);

//   catch(exception: unknown, host: ArgumentsHost) {
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse<Response>();
//     const request = ctx.getRequest<Request>();

//     const status =
//       exception instanceof HttpException ? exception.getStatus() : 500;
//     const message =
//       exception instanceof Error ? exception.message : 'Internal server error';

//     const errorResponse = {
//       success: false,
//       statusCode: status,
//       timestamp: new Date().toISOString(),
//       path: request.url,
//       method: request.method,
//       message,
//     };

//     this.logger.error(
//       `Unhandled Exception: ${message}`,
//       exception instanceof Error ? exception.stack : JSON.stringify(exception),
//       {
//         url: request.url,
//         method: request.method,
//         body: request.body,
//         params: request.params,
//         query: request.query,
//         user: (request as any).user?.prosumerId,
//       },
//     );

//     response.status(status).json(errorResponse);
//   }
// }
