import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class SystemConfig {
  @PrimaryColumn({ type: 'varchar', name: 'config_key' })
  configKey: string;

  @Column({ type: 'varchar', name: 'config_value' })
  configValue: string;

  @Column({ type: 'varchar', name: 'description', nullable: true })
  description: string;

  @Column({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', name: 'updated_by', nullable: true })
  updatedBy: string;
}
