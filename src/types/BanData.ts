import { Snowflake } from 'pwss';

export interface BanData {
    id: Snowflake;
    reason: string;
}
