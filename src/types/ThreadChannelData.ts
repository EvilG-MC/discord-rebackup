import { Snowflake, ThreadAutoArchiveDuration, ThreadChannelType } from "pwss";
import { MessageData } from "./MessageData";

export interface ThreadChannelData {
    type: ThreadChannelType;
    name: string;
    archived: boolean;
    autoArchiveDuration: ThreadAutoArchiveDuration;
    locked: boolean;
    rateLimitPerUser: number;
    messages: MessageData[];
}
