import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

export class DeviceNotFoundException extends NotFoundException {
  constructor(meterId: string) {
    super(`Device with ID ${meterId} not found`);
  }
}

export class DeviceOfflineException extends BadRequestException {
  constructor(meterId: string) {
    super(`Device ${meterId} is currently offline`);
  }
}

export class InsufficientFundsException extends BadRequestException {
  constructor(required: number, available: number, token: string) {
    super(
      `Insufficient ${token} balance. Required: ${required}, Available: ${available}`,
    );
  }
}

export class UnauthorizedWalletException extends ForbiddenException {
  constructor(walletAddress: string) {
    super(`You are not authorized to access wallet ${walletAddress}`);
  }
}

export class OrderNotActiveException extends BadRequestException {
  constructor(orderId: string) {
    super(`Order ${orderId} is not in active state`);
  }
}

export class SettlementInProgressException extends ConflictException {
  constructor(meterId: string) {
    super(`Settlement is already in progress for device ${meterId}`);
  }
}

export class BlockchainTransactionFailedException extends BadRequestException {
  constructor(txHash: string, reason: string) {
    super(`Blockchain transaction ${txHash} failed: ${reason}`);
  }
}

export class InvalidCommandException extends BadRequestException {
  constructor(command: string, reason: string) {
    super(`Invalid device command '${command}': ${reason}`);
  }
}

export class CommandTimeoutException extends BadRequestException {
  constructor(correlationId: string) {
    super(`Command with correlation ID ${correlationId} timed out`);
  }
}

export class WalletDecryptionFailedException extends BadRequestException {
  constructor() {
    super('Failed to decrypt wallet private key');
  }
}
