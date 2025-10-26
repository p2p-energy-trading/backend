import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('telemetry_data')
export class TelemetryData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  meterId: string;

  @Column()
  datetime: Date;

  @Column('jsonb')
  data: any;
}
