import type {
    BanData,
    CategoryData,
    ChannelsData,
    CreateOptions,
    EmojiData,
    RoleData,
    TextChannelData,
    VoiceChannelData
} from './types';
import { ChannelType, CategoryChannel, Collection, Guild, GuildChannel, Snowflake, StageChannel, TextChannel, ThreadChannel, VoiceChannel } from 'discord.js';
import { fetchChannelPermissions, fetchTextChannelData, fetchVoiceChannelData, fetchStageChannelData } from './util';
import { MemberData } from './types/MemberData';

export async function getBans(guild: Guild): Promise<BanData[]> {
    const bans: BanData[] = [];
    const cases = await guild.bans.fetch(); // Gets the list of the banned members
    cases.forEach((ban) => {
        bans.push({
            id: ban.user.id, // Banned member ID
            reason: ban.reason // Ban reason
        });
    });
    return bans;
}

export async function getMembers(guild: Guild): Promise<MemberData[]> {
    const members: MemberData[] = [];
    guild.members.cache.forEach((member) => {
        members.push({
            userId: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatarUrl: member.user.avatarURL(),
            joinedTimestamp: member.joinedTimestamp,
            roles: member.roles.cache.map((role) => role.id),
            bot: member.user.bot
        });
    });
    return members;
}

export async function getRoles(guild: Guild): Promise<RoleData[]> {
    const roles: RoleData[] = [];
    guild.roles.cache
        .filter((role) => !role.managed)
        .sort((a, b) => b.position - a.position)
        .forEach((role) => {
            const roleData = {
                name: role.name,
                color: role.hexColor,
                hoist: role.hoist,
                permissions: role.permissions.bitfield.toString(),
                mentionable: role.mentionable,
                position: role.position,
                isEveryone: guild.id === role.id
            };
            roles.push(roleData);
        });
    return roles;
}

export async function getEmojis(guild: Guild, options: CreateOptions): Promise<EmojiData[]> {
    const emojis: EmojiData[] = [];
    guild.emojis.cache.forEach(async (emoji) => {
        const eData: EmojiData = {
            name: emoji.name
        };
        if (options.saveImages && options.saveImages === 'base64') {
            eData.base64 = (await fetch(emoji.imageURL()).then((res) => (res as any).buffer())).toString('base64');
        } else {
            eData.url = emoji.imageURL();
        }
        emojis.push(eData);
    });
    return emojis;
}

export async function getChannels(guild: Guild, options: CreateOptions): Promise<ChannelsData> {
    return new Promise<ChannelsData>(async (resolve) => {
        const channels: ChannelsData = {
            categories: [],
            others: []
        };

        const categories = guild.channels.cache
            .filter((ch) => ch.type === ChannelType.GuildCategory)
            .sort((a, b) => ('position' in a && 'position' in b) ? a.position - b.position : 0)
            .map((category) => category) as CategoryChannel[];

        for (const category of categories) {
            const categoryData: CategoryData = {
                name: category.name,
                permissions: fetchChannelPermissions(category),
                children: []
            };

            const children = Array.from(category.children.cache.values()).sort((a, b) => a.position - b.position);
            for (const child of children) {
                if (child.type === ChannelType.GuildText
                    || child.type === ChannelType.GuildAnnouncement
                    || child.type === ChannelType.GuildForum
                    || child.type === ChannelType.GuildMedia
                ) {
                    if (
                        guild.rulesChannelId === child.id
                        || guild.safetyAlertsChannelId === child.id
                        || guild.widgetChannelId === child.id
                        || guild.publicUpdatesChannelId === child.id
                    ) continue;

                    const channelData: TextChannelData = await fetchTextChannelData(child as TextChannel, options);
                    categoryData.children.push(channelData);
                } else if (child.type === ChannelType.GuildStageVoice) {
                    const channelData: VoiceChannelData = await fetchStageChannelData(child as StageChannel);
                    channelData.userLimit = 0;
                    categoryData.children.push(channelData);
                } else {
                    const channelData: VoiceChannelData = await fetchVoiceChannelData(child as VoiceChannel);
                    categoryData.children.push(channelData);
                }
            }
            channels.categories.push(categoryData);
        }

        const others = guild.channels.cache
            .filter((ch) => {
                return !ch.parent && ch.type !== ChannelType.GuildCategory
                    && ch.type !== ChannelType.AnnouncementThread && ch.type !== ChannelType.PrivateThread && ch.type !== ChannelType.PublicThread
            })
            .sort((a, b) => {
                if (!('position' in a) || !('position' in b)) return 0;
                return a.position - b.position;
            })
            .map((channel) => channel);

        for (const channel of others) {
            if (channel.type === ChannelType.GuildText
                || channel.type === ChannelType.GuildAnnouncement
                || channel.type === ChannelType.GuildForum
                || channel.type === ChannelType.GuildMedia
            ) {
                if (
                    guild.rulesChannelId === channel.id
                    || guild.safetyAlertsChannelId === channel.id
                    || guild.widgetChannelId === channel.id
                    || guild.publicUpdatesChannelId === channel.id
                ) continue;

                const channelData: TextChannelData = await fetchTextChannelData(channel as TextChannel, options);
                channels.others.push(channelData);
            } else if (channel.type === ChannelType.GuildStageVoice) {
                const channelData: VoiceChannelData = await fetchStageChannelData(channel as StageChannel);
                channelData.userLimit = 0;
                channels.others.push(channelData);
            } else {
                const channelData: VoiceChannelData = await fetchVoiceChannelData(channel as VoiceChannel);
                channels.others.push(channelData);
            }
        }
        resolve(channels);
    });
}
