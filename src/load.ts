import type { BackupData, LoadOptions } from './types';
import type { NewsChannel, TextChannel, ForumChannel, VoiceBasedChannel } from 'discord.js';
import { ChannelType, Emoji, Guild, GuildFeature, Role, VoiceChannel } from 'discord.js';
import { loadCategory, loadChannel } from './util';
import { debug, debugLoad, error, info } from './logger';

/**
 * Restores the guild configuration
 */
export const loadConfig = (guild: Guild, backupData: BackupData): Promise<Guild[]> => {
    const configPromises: Promise<Guild>[] = [];
    if (backupData.name) {
        configPromises.push(guild.setName(backupData.name));
    }
    if (backupData.iconBase64) {
        configPromises.push(guild.setIcon(Buffer.from(backupData.iconBase64, 'base64')));
    } else if (backupData.iconURL) {
        configPromises.push(guild.setIcon(backupData.iconURL));
    }
    if (backupData.splashBase64) {
        configPromises.push(guild.setSplash(Buffer.from(backupData.splashBase64, 'base64')));
    } else if (backupData.splashURL) {
        configPromises.push(guild.setSplash(backupData.splashURL));
    }
    if (backupData.bannerBase64) {
        configPromises.push(guild.setBanner(Buffer.from(backupData.bannerBase64, 'base64')));
    } else if (backupData.bannerURL) {
        configPromises.push(guild.setBanner(backupData.bannerURL));
    }
    if (backupData.verificationLevel) {
        configPromises.push(guild.setVerificationLevel(backupData.verificationLevel));
    }
    if (backupData.defaultMessageNotifications) {
        configPromises.push(guild.setDefaultMessageNotifications(backupData.defaultMessageNotifications));
    }
    const changeableExplicitLevel = guild.features.includes(GuildFeature.Community);
    if (backupData.explicitContentFilter && changeableExplicitLevel) {
        configPromises.push(guild.setExplicitContentFilter(backupData.explicitContentFilter));
    }
    return Promise.all(configPromises);
};

/**
 * Restore the guild roles
 */
export const loadRoles = (guild: Guild, backupData: BackupData): Promise<Role[]> => {
    const rolePromises: Promise<Role>[] = [];
    backupData.roles.forEach((roleData) => {
        if (roleData.isEveryone) {
            rolePromises.push(
                guild.roles.cache.get(guild.id).edit({
                    name: roleData.name,
                    color: roleData.color,
                    permissions: BigInt(roleData.permissions),
                    mentionable: roleData.mentionable
                })
            );
        } else {
            rolePromises.push(
                guild.roles.create({
                    name: roleData.name,
                    color: roleData.color,
                    hoist: roleData.hoist,
                    permissions: BigInt(roleData.permissions),
                    mentionable: roleData.mentionable
                })
            );
        }
    });
    return Promise.all(rolePromises);
};

/**
 * Restore the guild channels
 */
export const loadChannels = (guild: Guild, backupData: BackupData, options: LoadOptions): Promise<unknown[]> => {
    debugLoad(`Début du chargement des canaux pour le serveur ${guild.name}`);
    debugLoad(`Nombre de catégories: ${backupData.channels.categories.length}, Nombre de canaux hors catégorie: ${backupData.channels.others.length}`);
    debugLoad(`Options: ${JSON.stringify(options)}`);
    
    const loadChannelPromises: Promise<void | unknown>[] = [];
    
    // Charger les catégories et leurs canaux enfants
    backupData.channels.categories.forEach((categoryData) => {
        debugLoad(`Chargement de la catégorie: ${categoryData.name}`);
        loadChannelPromises.push(
            new Promise((resolve) => {
                loadCategory(categoryData, guild).then((createdCategory) => {
                    debugLoad(`Catégorie créée: ${categoryData.name}, Nombre de canaux enfants: ${categoryData.children.length}`);
                    
                    // Créer un tableau de promesses pour les canaux enfants
                    const childPromises: Promise<void | unknown>[] = [];
                    
                    categoryData.children.forEach((channelData) => {
                        debugLoad(`Chargement du canal enfant: ${channelData.name} dans la catégorie ${categoryData.name}`);
                        childPromises.push(loadChannel(channelData, guild, createdCategory, options));
                    });
                    
                    // Attendre que tous les canaux enfants soient chargés avant de résoudre la promesse
                    Promise.all(childPromises)
                        .then(() => {
                            debugLoad(`Tous les canaux enfants de la catégorie ${categoryData.name} ont été chargés`);
                            resolve(true);
                        })
                        .catch((err) => {
                            error(`Erreur lors du chargement des canaux enfants de la catégorie ${categoryData.name}:`, err);
                            resolve(false);
                        });
                });
            })
        );
    });
    
    // Charger les canaux hors catégorie
    backupData.channels.others.forEach((channelData) => {
        debugLoad(`Chargement du canal hors catégorie: ${channelData.name}`);
        loadChannelPromises.push(loadChannel(channelData, guild, null, options));
    });
    
    debugLoad(`Nombre total de promesses de chargement de canaux: ${loadChannelPromises.length}`);
    return Promise.all(loadChannelPromises);
};

/**
 * Restore the afk configuration
 */
export const loadAFK = (guild: Guild, backupData: BackupData): Promise<Guild[]> => {
    const afkPromises: Promise<Guild>[] = [];
    if (backupData.afk) {
        afkPromises.push(guild.setAFKChannel(guild.channels.cache.find((ch) => ch.name === backupData.afk.name && ch.type === ChannelType.GuildVoice) as VoiceChannel));
        afkPromises.push(guild.setAFKTimeout(backupData.afk.timeout));
    }
    return Promise.all(afkPromises);
};

/**
 * Restore guild emojis
 */
export const loadEmojis = (guild: Guild, backupData: BackupData): Promise<Emoji[]> => {
    const emojiPromises: Promise<Emoji>[] = [];
    backupData.emojis.forEach((emoji) => {
        if (emoji.url) {
            emojiPromises.push(guild.emojis.create({
                name: emoji.name,
                attachment: emoji.url
            }));
        } else if (emoji.base64) {
            emojiPromises.push(guild.emojis.create({
                name: emoji.name,
                attachment: Buffer.from(emoji.base64, 'base64')
            }));
        }
    });
    return Promise.all(emojiPromises);
};

/**
 * Restore guild bans
 */
export const loadBans = (guild: Guild, backupData: BackupData): Promise<string[]> => {
    const banPromises: Promise<string>[] = [];
    backupData.bans.forEach((ban) => {
        banPromises.push(
            guild.members.ban(ban.id, {
                reason: ban.reason
            }) as Promise<string>
        );
    });
    return Promise.all(banPromises);
};

/**
 * Restore embedChannel configuration
 */
export const loadEmbedChannel = (guild: Guild, backupData: BackupData): Promise<Guild[]> => {
    const embedChannelPromises: Promise<Guild>[] = [];
    if (backupData.widget.channel) {
        embedChannelPromises.push(
            guild.setWidgetSettings({
                enabled: backupData.widget.enabled,
                channel: guild.channels.cache.find((ch) => ch.name === backupData.widget.channel) as NewsChannel | TextChannel | ForumChannel | VoiceBasedChannel
            })
        );
    }
    return Promise.all(embedChannelPromises);
};
