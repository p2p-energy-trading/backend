import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'enerlink_redis_password',
});

async function testRedis() {
  console.log('🔍 Testing Redis Connection...\n');

  try {
    // 1. Test Connection
    const pong = await redis.ping();
    console.log('✅ Redis Connection:', pong);

    // 2. Check all keys
    const allKeys = await redis.keys('*');
    console.log(`\n📊 Total Keys: ${allKeys.length}`);

    if (allKeys.length > 0) {
      console.log('\n🔑 All Keys:');
      allKeys.forEach((key) => console.log(`  - ${key}`));

      // 3. Check telemetry latest data
      console.log('\n📡 Latest Telemetry Data:');
      const latestData = await redis.hgetall('telemetry:latest:data');
      const latestStatus = await redis.hgetall('telemetry:latest:status');

      if (Object.keys(latestData).length > 0) {
        console.log('\n  📍 Latest Data (Device Info):');
        for (const [meterId, data] of Object.entries(latestData)) {
          const parsed = JSON.parse(data);
          console.log(`    Meter: ${meterId}`);
          console.log(`    Datetime: ${parsed.datetime}`);
          console.log(`    WiFi RSSI: ${parsed.data.wifi.rssi} dBm`);
          console.log(`    MQTT Connected: ${parsed.data.mqtt.connected}`);
          console.log('');
        }
      } else {
        console.log('  ⚠️  No latest data found');
      }

      if (Object.keys(latestStatus).length > 0) {
        console.log('  ⚡ Latest Status (Energy Measurements):');
        for (const [meterId, status] of Object.entries(latestStatus)) {
          const parsed = JSON.parse(status);
          console.log(`    Meter: ${meterId}`);
          console.log(`    Datetime: ${parsed.datetime}`);
          console.log(`    Battery SOC: ${parsed.data.battery.soc}%`);
          console.log(`    Solar Output: ${parsed.data.solar_output.power} mW`);
          console.log(`    Load Smart: ${parsed.data.load_smart_mtr.power} mW`);
          console.log(`    Net Grid: ${parsed.data.net_grid.net_power} mW`);
          console.log('');
        }
      } else {
        console.log('  ⚠️  No latest status found');
      }

      // 4. Check time-series data
      console.log('\n📈 Time-Series Data:');
      for (const key of allKeys) {
        if (key.startsWith('telemetry:timeseries:')) {
          const meterId = key.replace('telemetry:timeseries:', '');
          const count = await redis.zcard(key);
          const ttl = await redis.ttl(key);
          console.log(`  Meter ${meterId}: ${count} snapshots (TTL: ${ttl}s)`);

          // Get latest 3 snapshots
          const latest = await redis.zrevrange(key, 0, 2);
          if (latest.length > 0) {
            console.log(`    Latest snapshot preview:`);
            const snapshot = JSON.parse(latest[0]);
            console.log(
              `      Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
            );
            console.log(
              `      Has Data: ${snapshot.meterData ? '✅' : '❌'} | Has Status: ${snapshot.statusData ? '✅' : '❌'}`,
            );
          }
          console.log('');
        }
      }
    } else {
      console.log('\n⚠️  No data in Redis yet. Make sure:');
      console.log('  1. MQTT broker is running');
      console.log('  2. Backend server is running (npm run start:dev)');
      console.log(
        '  3. IoT meter is publishing to enerlink/meters/data and enerlink/meters/status',
      );
    }

    // 5. Redis Info
    console.log('\n📊 Redis Server Info:');
    const info = await redis.info('memory');
    const usedMemory = info.match(/used_memory_human:(.+)/)?.[1]?.trim();
    const peakMemory = info.match(/used_memory_peak_human:(.+)/)?.[1]?.trim();
    console.log(`  Used Memory: ${usedMemory}`);
    console.log(`  Peak Memory: ${peakMemory}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await redis.quit();
    console.log('\n✅ Test completed!');
  }
}

testRedis();
