import { setSeederFactory } from 'typeorm-extension';
import { User } from '../../models/user/user.entity';
import * as bcrypt from 'bcryptjs';

export const UsersFactory = setSeederFactory(User, (faker) => {
  const user = new User();

  // Required primary key
  user.userId = `user_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 10)}`;

  user.name = faker.person.fullName();
  user.email = faker.internet.email();

  // Hash password "password" using bcrypt with 12 salt rounds
  // This is a pre-computed hash to avoid async operations in factory
  user.passwordHash = bcrypt.hashSync('password', 12);

  // Timestamps
  user.createdAt = new Date();
  user.updatedAt = new Date();

  return user;
});
