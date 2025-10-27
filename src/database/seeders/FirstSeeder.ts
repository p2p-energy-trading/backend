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
    const prosumerFactory = factoryManager.get(User);
    const walletFactory = factoryManager.get(Wallet);
    const smartMeterFactory = factoryManager.get(SmartMeter);

    console.log('🪴 Seeding dummy prosumers with wallets and meters...');

    // Generate 5 prosumers
    const prosumers = await prosumerFactory.saveMany(5);

    // For each prosumer, create wallet and smart meter
    for (let i = 0; i < prosumers.length; i++) {
      const prosumer = prosumers[i];

      // Create Wallet using factory
      const wallet = await walletFactory.make({
        prosumerId: prosumer.prosumerId,
        walletName: `${prosumer.name}'s Wallet`,
      });
      await walletFactory.save(wallet);

      // Update prosumer's primary wallet
      prosumer.primaryWalletAddress = wallet.walletAddress;
      await dataSource.getRepository(User).save(prosumer);

      // Create Smart Meter using factory
      const smartMeter = await smartMeterFactory.make({
        prosumerId: prosumer.prosumerId,
        meterId: `METER${String(i + 1).padStart(3, '0')}`,
      });
      await smartMeterFactory.save(smartMeter);

      console.log(
        `✅ Created prosumer: ${prosumer.email} with wallet: ${wallet.walletAddress} and meter: ${smartMeter.meterId}`,
      );
    }

    console.log('✅ Done seeding prosumers with wallets and meters!');
  }
}
