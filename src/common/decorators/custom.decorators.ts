import { SetMetadata } from '@nestjs/common';

export const HighFrequency = () => SetMetadata('highFrequency', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('isPublic', true);
