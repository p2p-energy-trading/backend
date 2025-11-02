import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { User } from '../../models/user/user.entity';
import { Wallet } from '../../models/wallet/wallet.entity';
import { SmartMeter } from '../../models/smartMeter/smartMeter.entity';

export class FirstSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const userFactory = factoryManager.get(User);
    const walletFactory = factoryManager.get(Wallet);
    const smartMeterFactory = factoryManager.get(SmartMeter);

    console.log('🪴 Seeding dummy users with wallets and meters...');

    // Generate 5 users
    const users = await userFactory.saveMany(5);

    // For each user, create wallet and smart meter
    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // Create Wallet using factory
      const wallet = await walletFactory.make({
        userId: user.userId,
        walletName: `${user.name}'s Wallet`,
      });
      await walletFactory.save(wallet);

      // Update user's primary wallet
      user.primaryWalletAddress = wallet.walletAddress;
      await dataSource.getRepository(User).save(user);

      // Create Smart Meter using factory
      const smartMeter = await smartMeterFactory.make({
        userId: user.userId,
        meterId: `METER${String(i + 1).padStart(3, '0')}`,
      });
      await smartMeterFactory.save(smartMeter);

      console.log(
        `✅ Created user: ${user.email} with wallet: ${wallet.walletAddress} and meter: ${smartMeter.meterId}`,
      );
    }

    console.log('✅ Done seeding users with wallets and meters!');
  }
}
