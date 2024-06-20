import { TextBasedChannelTypes, VoiceBasedChannelTypes, ThreadChannelType, ChannelType } from 'pwss';
import { ChannelPermissionsData } from './';

export interface BaseChannelData {
    type: TextBasedChannelTypes | VoiceBasedChannelTypes | ThreadChannelType | ChannelType;
    name: string;
    parent?: string;
    permissions: ChannelPermissionsData[];
}
