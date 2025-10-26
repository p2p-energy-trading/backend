import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryData } from './TelemetryData.entity';

@Injectable()
export class TelemetryDataService {
  constructor(
    @InjectRepository(TelemetryData)
    private readonly telemetryRepo: Repository<TelemetryData>,
  ) {}

  async create(data: Partial<TelemetryData>) {
    const entry = this.telemetryRepo.create(data);
    return this.telemetryRepo.save(entry);
  }

  async findRecent(limit = 100) {
    return this.telemetryRepo.find({
      order: { datetime: 'DESC' },
      take: limit,
    });
  }
}
