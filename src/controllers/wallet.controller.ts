import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { IdrsConversionsService } from '../modules/IdrsConversions/IdrsConversions.service';
import { CryptoService } from '../common/crypto.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { ConversionType, WalletImportMethod } from '../common/enums';
import { ProsumersService } from 'src/modules/Prosumers/Prosumers.service';

interface CreateWalletRequest {
  walletName: string;
  importMethod: 'GENERATED' | 'IMPORTED_PRIVATE_KEY' | 'IMPORTED_MNEMONIC';
  privateKey?: string;
  mnemonic?: string;
}

interface IdrsConversionRequest {
  walletAddress: string;
  conversionType: 'ON_RAMP' | 'OFF_RAMP';
  amount: number;
}

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private walletsService: WalletsService,
    private idrsConversionsService: IdrsConversionsService,
    private cryptoService: CryptoService,
    private prosumersService: ProsumersService, // Assuming this is the correct service for prosumer validation
  ) {}

  @Post('create')
  async createWallet(@Body() body: CreateWalletRequest, @Request() req) {
    const prosumerId = req.user.prosumerId;

    let walletAddress: string;
    let privateKey: string;

    if (body.importMethod === 'GENERATED') {
      // Generate new wallet
      const ethers = require('ethers');
      const wallet = ethers.Wallet.createRandom();
      walletAddress = wallet.address;
      privateKey = wallet.privateKey;
    } else if (body.importMethod === 'IMPORTED_PRIVATE_KEY') {
      if (!body.privateKey) {
        throw new BadRequestException('Private key is required for import');
      }
      const ethers = require('ethers');
      const wallet = new ethers.Wallet(body.privateKey);
      walletAddress = wallet.address;
      privateKey = body.privateKey;
    } else if (body.importMethod === 'IMPORTED_MNEMONIC') {
      if (!body.mnemonic) {
        throw new BadRequestException('Mnemonic is required for import');
      }
      const ethers = require('ethers');
      const wallet = ethers.Wallet.fromPhrase(body.mnemonic);
      walletAddress = wallet.address;
      privateKey = wallet.privateKey;
    } else {
      throw new BadRequestException('Invalid import method');
    }

    // Encrypt private key
    const encryptedPrivateKey = this.cryptoService.encrypt(
      privateKey,
      process.env.WALLET_ENCRYPTION_KEY || 'default-wallet-key',
    );

    // Create wallet record
    const wallet = await this.walletsService.create({
      walletAddress,
      prosumerId: prosumerId,
      walletName: body.walletName,
      encryptedPrivateKey,
      importMethod: body.importMethod as WalletImportMethod,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });

    return {
      success: true,
      data: {
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        createdAt: wallet.createdAt,
      },
      message: 'Wallet created successfully',
    };
  }

  @Get('list')
  async getWallets(@Request() req) {
    const prosumerId = req.user.prosumerId;

    const wallets = await this.walletsService.findAll({ prosumerId });

    return {
      success: true,
      data: wallets.map((wallet) => ({
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
        lastUsedAt: wallet.lastUsedAt,
      })),
    };
  }

  @Get(':walletAddress')
  async getWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    const wallet = await this.walletsService.findOne(walletAddress);
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized: You do not own this wallet');
    }

    return {
      success: true,
      data: {
        walletAddress: wallet.walletAddress,
        walletName: wallet.walletName,
        importMethod: wallet.importMethod,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
        lastUsedAt: wallet.lastUsedAt,
      },
    };
  }

  @Post('idrs-conversion')
  async convertIdrs(@Body() body: IdrsConversionRequest, @Request() req) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    const wallet = await this.walletsService.findOne(body.walletAddress);
    const prosumers = await this.prosumersService.findByWalletAddress(
      body.walletAddress,
    );

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized: You do not own this wallet');
    }

    // For simulation purposes, we'll create a conversion record
    // In real implementation, this would interact with a payment gateway
    const exchangeRate = 1.0; // 1 IDR = 1 IDRS for simulation
    const conversionAmount = body.amount * exchangeRate;

    const conversion = await this.idrsConversionsService.create({
      prosumerId,
      walletAddress: body.walletAddress,
      conversionType: body.conversionType as ConversionType,
      idrAmount:
        body.conversionType === 'ON_RAMP' ? body.amount : conversionAmount,
      idrsAmount:
        body.conversionType === 'ON_RAMP' ? conversionAmount : body.amount,
      exchangeRate,
      status: 'COMPLETED', // Simulated completion
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    });

    return {
      success: true,
      data: conversion,
      message: `${body.conversionType} conversion completed (simulated)`,
    };
  }

  @Get(':walletAddress/conversions')
  async getConversions(
    @Param('walletAddress') walletAddress: string,
    @Request() req,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    const wallet = await this.walletsService.findOne(walletAddress);
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized');
    }

    const conversions =
      await this.idrsConversionsService.findByWalletAddress(walletAddress);

    return {
      success: true,
      data: conversions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    };
  }

  @Post(':walletAddress/activate')
  async activateWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    const wallet = await this.walletsService.findOne(walletAddress);
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized');
    }

    // Get current wallet data and update
    const currentWallet = await this.walletsService.findOne(walletAddress);
    await this.walletsService.update(walletAddress, {
      walletAddress: currentWallet.walletAddress,
      prosumerId: currentWallet.prosumerId,
      walletName: currentWallet.walletName,
      encryptedPrivateKey: currentWallet.encryptedPrivateKey,
      createdAt: currentWallet.createdAt.toISOString(),
      importMethod: currentWallet.importMethod,
      isActive: true,
      lastUsedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Wallet activated successfully',
    };
  }

  @Post(':walletAddress/deactivate')
  async deactivateWallet(
    @Param('walletAddress') walletAddress: string,
    @Request() req,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    const currentWallet = await this.walletsService.findOne(walletAddress);
    const prosumers =
      await this.prosumersService.findByWalletAddress(walletAddress);

    if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
      throw new BadRequestException('Unauthorized');
    }

    await this.walletsService.update(walletAddress, {
      walletAddress: currentWallet.walletAddress,
      prosumerId: currentWallet.prosumerId,
      walletName: currentWallet.walletName,
      encryptedPrivateKey: currentWallet.encryptedPrivateKey,
      createdAt: currentWallet.createdAt.toISOString(),
      importMethod: currentWallet.importMethod,
      isActive: false,
      lastUsedAt:
        currentWallet.lastUsedAt?.toISOString() || new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Wallet deactivated successfully',
    };
  }
}
