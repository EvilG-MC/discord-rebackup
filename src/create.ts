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
import { fetchChannelPermissions, fetchTextChannelData, fetchVoiceChannelData, fetchStageChannelData } from './util';
import { MemberData } from './types/MemberData';

// Support pour discord.js v14 et discord.js-selfbot-v13
let ChannelType: any;
try {
    // discord.js v14
    ChannelType = require('discord.js').ChannelType;
} catch {
    // discord.js-selfbot-v13 (simulation des types de canaux)
    ChannelType = {
        GuildText: 'GUILD_TEXT',
        GuildVoice: 'GUILD_VOICE',
        GuildCategory: 'GUILD_CATEGORY',
        GuildAnnouncement: 'GUILD_NEWS',
        GuildStageVoice: 'GUILD_STAGE_VOICE',
        AnnouncementThread: 'ANNOUNCEMENT_THREAD',
        PublicThread: 'PUBLIC_THREAD',
        PrivateThread: 'PRIVATE_THREAD',
        GuildForum: 'GUILD_FORUM',
        GuildMedia: 'GUILD_MEDIA'
    };
}

// Import des types nécessaires en fonction de la version disponible
let discordjs: any;
try {
    // Tenter d'importer discord.js v14
    discordjs = require('discord.js');
} catch {
    // Si échec, on suppose que c'est discord.js-selfbot-v13
    discordjs = require('discord.js-selfbot-v13');
}

// Extraction des types/classes pour les utiliser dans le code
const { CategoryChannel, Collection, Guild, GuildChannel, Snowflake, StageChannel, TextChannel, ThreadChannel, VoiceChannel } = discordjs;

// Types pour TypeScript
type GuildType = typeof Guild;
type CategoryChannelType = typeof CategoryChannel;
type TextChannelType = typeof TextChannel;
type VoiceChannelType = typeof VoiceChannel;
type StageChannelType = typeof StageChannel;

export async function getBans(guild: InstanceType<GuildType>): Promise<BanData[]> {
    const bans: BanData[] = [];
    try {
        const cases = await guild.bans.fetch(); // Gets the list of the banned members
        cases.forEach((ban: any) => {
            bans.push({
                id: ban.user.id, // Banned member ID
                reason: ban.reason // Ban reason
            });
        });
    } catch (error) {
        console.error('Error fetching bans:', error);
        // If the bot doesn't have the permission to see the bans
        // It will throw an error, so we catch it and return an empty array
        return [];
    }

    return bans;
}

export async function getMembers(guild: InstanceType<GuildType>): Promise<MemberData[]> {
    const members: MemberData[] = [];
    guild.members.cache.forEach((member: any) => {
        members.push({
            userId: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatarUrl: member.user.avatarURL(),
            joinedTimestamp: member.joinedTimestamp,
            roles: member.roles.cache.map((role: any) => role.id),
            bot: member.user.bot
        });
    });
    return members;
}

export async function getRoles(guild: InstanceType<GuildType>): Promise<RoleData[]> {
    const roles: RoleData[] = [];
    guild.roles.cache
        .filter((role: any) => !role.managed)
        .sort((a: any, b: any) => b.position - a.position)
        .forEach((role: any) => {
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

export async function getEmojis(guild: InstanceType<GuildType>, options: CreateOptions): Promise<EmojiData[]> {
    const emojis: EmojiData[] = [];
    guild.emojis.cache.forEach(async (emoji: any) => {
        const eData: EmojiData = {
            name: emoji.name
        };
        if (options.saveImages && options.saveImages === 'base64') {
            eData.base64 = (await fetch(emoji.url).then((res) => (res as any).buffer())).toString('base64');
        } else {
            eData.url = emoji.url;
        }
        emojis.push(eData);
    });

    return emojis;
}

export async function getChannels(guild: InstanceType<GuildType>, options: CreateOptions): Promise<ChannelsData> {
    return new Promise<ChannelsData>(async (resolve) => {
        const channels: ChannelsData = {
            categories: [],
            others: []
        };

        const categories = guild.channels.cache
            .filter((ch: any) =>
                ch.type === ChannelType.GuildCategory ||
                // Pour discord.js-selfbot-v13
                ch.type === 'GUILD_CATEGORY'
            )
            .sort((a: any, b: any) => ('position' in a && 'position' in b) ? a.position - b.position : 0)
            .map((category: any) => category) as InstanceType<CategoryChannelType>[];

        for (const category of categories) {
            // Typage explicite pour éviter les erreurs
            const typedCategory = category as any;
            const categoryData: CategoryData = {
                name: typedCategory.name,
                permissions: fetchChannelPermissions(typedCategory),
                children: []
            };

            // Récupérer les canaux enfants de manière compatible avec les deux versions
            let children: any[] = [];
            try {
                // discord.js v14
                if (typedCategory.children && typedCategory.children.cache) {
                    children = Array.from(typedCategory.children.cache.values());
                }
                // discord.js-selfbot-v13 (structure différente)
                else if (typedCategory.children) {
                    children = Array.from(typedCategory.children.values());
                }
                // Autre structure possible dans discord.js-selfbot-v13
                else {
                    // Filtrer tous les canaux du serveur qui ont cette catégorie comme parent
                    children = guild.channels.cache
                        .filter((ch: any) => ch.parentId === typedCategory.id || ch.parent?.id === typedCategory.id)
                        .map((ch: any) => ch);
                }
                
                // Trier les canaux par position
                children = children.sort((a: any, b: any) => {
                    if (!a || !b || typeof a.position !== 'number' || typeof b.position !== 'number') return 0;
                    return a.position - b.position;
                });
            } catch (error) {
                console.error('Erreur lors de la récupération des canaux enfants:', error);
                children = [];
            }
            for (const child of children) {
                // Typage explicite pour éviter les erreurs
                const typedChild = child as any;
                console.log(typedChild.name, typedChild.type)

                if (
                    typedChild.type === ChannelType.GuildText
                    || typedChild.type === ChannelType.GuildAnnouncement
                    || typedChild.type === ChannelType.GuildForum
                    || typedChild.type === ChannelType.GuildMedia
                    // Pour discord.js-selfbot-v13
                    || typedChild.type === 'GUILD_TEXT'
                    || typedChild.type === 'GUILD_NEWS'
                ) {
                    if (
                        guild.rulesChannelId === typedChild.id
                        || guild.safetyAlertsChannelId === typedChild.id
                        || guild.widgetChannelId === typedChild.id
                        || guild.publicUpdatesChannelId === typedChild.id
                    ) continue;

                    const channelData: TextChannelData = await fetchTextChannelData(typedChild as InstanceType<TextChannelType>, options);
                    categoryData.children.push(channelData);
                } else if (typedChild.type === ChannelType.GuildStageVoice || typedChild.type === 'GUILD_STAGE_VOICE') {
                    const channelData: VoiceChannelData = await fetchStageChannelData(typedChild as InstanceType<StageChannelType>);
                    channelData.userLimit = 0;
                    categoryData.children.push(channelData);
                } else {
                    const channelData: VoiceChannelData = await fetchVoiceChannelData(typedChild as InstanceType<VoiceChannelType>);
                    categoryData.children.push(channelData);
                }
            }
            channels.categories.push(categoryData);
        }

        const others = guild.channels.cache
            .filter((ch: any) => {
                return !ch.parent && 
                    (ch.type !== ChannelType.GuildCategory && ch.type !== 'GUILD_CATEGORY') &&
                    (ch.type !== ChannelType.AnnouncementThread && ch.type !== 'ANNOUNCEMENT_THREAD') && 
                    (ch.type !== ChannelType.PrivateThread && ch.type !== 'PRIVATE_THREAD') && 
                    (ch.type !== ChannelType.PublicThread && ch.type !== 'PUBLIC_THREAD')
            })
            .sort((a: any, b: any) => {
                if (!('position' in a) || !('position' in b)) return 0;
                return a.position - b.position;
            })
            .map((channel: any) => channel);

        for (const channel of others) {
            // Typage explicite pour éviter les erreurs
            const typedChannel = channel as any;
            console.log(typedChannel.name, typedChannel.type)
            if (
                typedChannel.type === ChannelType.GuildText
                || typedChannel.type === ChannelType.GuildAnnouncement
                || typedChannel.type === ChannelType.GuildForum
                || typedChannel.type === ChannelType.GuildMedia
                // Pour discord.js-selfbot-v13
                || typedChannel.type === 'GUILD_TEXT'
                || typedChannel.type === 'GUILD_NEWS'
            ) {
                if (
                    guild.rulesChannelId === typedChannel.id
                    || guild.safetyAlertsChannelId === typedChannel.id
                    || guild.widgetChannelId === typedChannel.id
                    || guild.publicUpdatesChannelId === typedChannel.id
                ) continue;

                const channelData: TextChannelData = await fetchTextChannelData(typedChannel as InstanceType<TextChannelType>, options);
                channels.others.push(channelData);
            } else if (typedChannel.type === ChannelType.GuildStageVoice || typedChannel.type === 'GUILD_STAGE_VOICE') {
                const channelData: VoiceChannelData = await fetchStageChannelData(typedChannel as InstanceType<StageChannelType>);
                channelData.userLimit = 0;
                channels.others.push(channelData);
            } else {
                const channelData: VoiceChannelData = await fetchVoiceChannelData(typedChannel as InstanceType<VoiceChannelType>);
                channels.others.push(channelData);
            }
        }
        resolve(channels);
    });
}
