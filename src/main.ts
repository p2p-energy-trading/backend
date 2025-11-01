import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import {
//   HttpExceptionFilter,
//   AllExceptionsFilter,
// } from './common/filters/exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     transform: true,
  //     transformOptions: {
  //       enableImplicitConversion: true,
  //     },
  //   }),
  // );

  // Global exception filters
  // app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // CORS configuration - Parse multiple frontend URLs
  const frontendUrls = process.env.FRONTEND_URL?.split(',').map((url) =>
    url.trim(),
  ) || ['http://localhost:3000'];

  console.log('🔒 CORS enabled for origins:', frontendUrls);

  app.enableCors({
    origin: frontendUrls,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['/health', '/health/ready', '/health/live'],
  });

  // Swagger documentation
  if ((process.env.NODE_ENV as string) !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('EnerLink P2P Energy Trading API')
      .setDescription(
        `
        ## EnerLink P2P Energy Trading System API

        This API enables peer-to-peer energy trading using IoT smart meters, 
        private Ethereum blockchain, and modern web technologies.

        ### Key Features:
        - **Authentication**: JWT-based authentication with prosumer management
        - **Energy Management**: Real-time energy data collection and settlement
        - **Trading**: P2P energy trading with ETK/IDRS token pairs
        - **IoT Integration**: MQTT communication with smart meters
        - **Blockchain**: Ethereum smart contracts for secure transactions
        - **Real-time**: WebSocket notifications for live updates
      `,
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication and authorization')
      .addTag(
        'Blockchain',
        'Ethereum blockchain interactions and smart contracts',
      )
      .addTag('Energy', 'Energy readings and settlement management')
      .addTag('Smart Meters', 'Smart meter device management')
      .addTag('Statistics', 'Energy and trading statistics')
      .addTag('System', 'Health checks and system status')
      .addTag('Trading', 'P2P energy trading operations')
      .addTag('Wallet', 'Cryptocurrency wallet management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    console.log(
      `📖 API Documentation: http://localhost:${(process.env.PORT as string) || '3000'}/api/docs`,
    );
  }

  const port = (process.env.PORT as string) || '3000';
  await app.listen(port);

  console.log(`🚀 EnerLink Backend Server: http://localhost:${port}`);
  console.log(`🔗 GraphQL Playground: http://localhost:${port}/graphql`);
  console.log(
    `💬 WebSocket Notifications: ws://localhost:${port}/notifications`,
  );
  console.log(`💚 Health Check: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
