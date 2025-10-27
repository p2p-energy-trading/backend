import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Prosumers } from '../../models/prosumer/Prosumers.entity';
import { Wallets } from '../../models/Wallets/Wallets.entity';
import { SmartMeters } from '../../models/SmartMeters/SmartMeters.entity';

export class FirstSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const prosumerFactory = factoryManager.get(Prosumers);
    const walletFactory = factoryManager.get(Wallets);
    const smartMeterFactory = factoryManager.get(SmartMeters);

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
      await dataSource.getRepository(Prosumers).save(prosumer);

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
