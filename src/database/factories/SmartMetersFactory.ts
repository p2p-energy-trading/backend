import { setSeederFactory } from 'typeorm-extension';
import { SmartMeter } from '../../models/smartMeter/smartMeter.entity';

export const SmartMetersFactory = setSeederFactory(SmartMeter, (faker) => {
  const smartMeter = new SmartMeter();

  // Generate random meter ID
  smartMeter.meterId = `METER${faker.number.int({ min: 1000, max: 9999 })}`;
  smartMeter.location = faker.location.streetAddress();
  smartMeter.status = 'ACTIVE';
  smartMeter.deviceModel = 'Generic Smart Meter';
  smartMeter.deviceVersion = '1.0.0';
  smartMeter.createdAt = new Date();
  smartMeter.updatedAt = new Date();

  // Note: prosumerId will be set in seeder

  return smartMeter;
});
