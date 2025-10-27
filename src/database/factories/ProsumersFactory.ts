import { setSeederFactory } from 'typeorm-extension';
import { Prosumers } from '../../models/prosumer/user.entity';
import * as bcrypt from 'bcryptjs';

export const ProsumersFactory = setSeederFactory(Prosumers, (faker) => {
  const prosumer = new Prosumers();

  // Required primary key
  prosumer.prosumerId = `prosumer_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 10)}`;

  prosumer.name = faker.person.fullName();
  prosumer.email = faker.internet.email();

  // Hash password "password" using bcrypt with 12 salt rounds
  // This is a pre-computed hash to avoid async operations in factory
  prosumer.passwordHash = bcrypt.hashSync('password', 12);

  // Timestamps
  prosumer.createdAt = new Date();
  prosumer.updatedAt = new Date();

  return prosumer;
});
