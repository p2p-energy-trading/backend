import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard, LocalAuthGuard } from './guards/auth.guards';
import { Request as ExpressRequest } from 'express';

interface ValidatedProsumer {
  prosumerId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: { user: ValidatedProsumer }) {
    // User sudah divalidasi oleh LocalAuthGuard, tersedia di req.user
    return this.authService.generateTokens(req.user);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: { user: { prosumerId: string } }) {
    return this.authService.getProfile(req.user.prosumerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: ExpressRequest & { user: { prosumerId: string } },
  ) {
    // Token akan diambil otomatis dari Authorization header
    return await this.authService.logout(req.user.prosumerId, undefined, req);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(
    @Request() req: ExpressRequest & { user: { prosumerId: string } },
  ) {
    return await this.authService.logoutAll(req.user.prosumerId, req);
  }
}
