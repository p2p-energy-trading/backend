import { setSeederFactory } from 'typeorm-extension';
import { Wallets } from '../../models/wallet/wallet.entity';
import { CryptoService } from '../../common/crypto.service';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

export const WalletsFactory = setSeederFactory(Wallets, (faker) => {
  const cryptoService = new CryptoService();
  const encryptionKey =
    process.env.WALLET_ENCRYPTION_KEY || 'default-wallet-key';

  // Generate random Ethereum wallet
  const newWallet = ethers.Wallet.createRandom();

  const wallet = new Wallets();
  wallet.walletAddress = newWallet.address;
  wallet.walletName = `${faker.person.firstName()}'s Wallet`;
  wallet.encryptedPrivateKey = cryptoService.encrypt(
    newWallet.privateKey,
    encryptionKey,
  );
  wallet.importMethod = 'GENERATED';
  wallet.isActive = true;
  wallet.createdAt = new Date();

  // Note: prosumerId will be set in seeder

  return wallet;
});
