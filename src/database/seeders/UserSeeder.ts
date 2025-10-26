import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Prosumers } from '../../models/Prosumers/Prosumers.entity';

export class UserSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const prosumerFactory = factoryManager.get(Prosumers);

    console.log('🪴 Seeding dummy prosumers...');
    await prosumerFactory.saveMany(1); // membuat 10 dummy prosumer
    console.log('✅ Done seeding prosumers!');
  }
}
