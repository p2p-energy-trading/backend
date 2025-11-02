import { setSeederFactory } from 'typeorm-extension';
import { Wallet } from '../../models/wallet/wallet.entity';
import { CryptoService } from '../../common/crypto.service';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

export const WalletsFactory = setSeederFactory(Wallet, (faker) => {
  const cryptoService = new CryptoService();
  const encryptionKey =
    process.env.WALLET_ENCRYPTION_KEY || 'default-wallet-key';

  // Generate random Ethereum wallet
  const newWallet = ethers.Wallet.createRandom();

  const wallet = new Wallet();
  wallet.walletAddress = newWallet.address;
  wallet.walletName = `${faker.person.firstName()}'s Wallet`;
  wallet.encryptedPrivateKey = cryptoService.encrypt(
    newWallet.privateKey,
    encryptionKey,
  );
  wallet.importMethod = 'GENERATED';
  wallet.isActive = true;
  wallet.createdAt = new Date();

  // Note: userId will be set in seeder

  return wallet;
});
