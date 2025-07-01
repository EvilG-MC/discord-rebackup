import type { BackupData, BackupInfos, CreateOptions, LoadOptions } from './types/';
import type { Guild } from 'discord.js';
import { SnowflakeUtil, IntentsBitField } from 'discord.js';

import { sep } from 'path';

import { existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { writeFile, readdir } from 'fs/promises';

import * as createMaster from './create';
import * as loadMaster from './load';
import * as utilMaster from './util';
import { enableDevMode, disableDevMode, info } from './logger';

let backups = process.cwd() + "/backups";
if (!existsSync(backups)) {
    mkdirSync(backups);
}

/**
 * Checks if a backup exists and returns its data
 */
const getBackupData = async (backupID: string) => {
    return new Promise<BackupData>(async (resolve, reject) => {
        const files = await readdir(backups); // Read "backups" directory
        // Try to get the json file
        const file = files.filter((f) => f.split('.').pop() === 'json').find((f) => f === `${backupID}.json`);
        if (file) {
            // If the file exists
            const backupData: BackupData = require(`${backups}${sep}${file}`);
            // Returns backup informations
            resolve(backupData);
        } else {
            // If no backup was found, return an error message
            reject('function:getBackupData : No backup found');
        }
    });
};

/**
 * Fetches a backup and returns the information about it
 */
export const fetchBackup = (backupID: string) => {
    return new Promise<BackupInfos>(async (resolve, reject) => {
        getBackupData(backupID)
            .then((backupData) => {
                const size = statSync(`${backups}${sep}${backupID}.json`).size; // Gets the size of the file using fs
                const backupInfos: BackupInfos = {
                    data: backupData,
                    id: backupID,
                    size: Number((size / 1024).toFixed(2))
                };
                // Returns backup informations
                resolve(backupInfos);
            })
            .catch(() => {
                reject('function: fetch: No backup found');
            });
    });
};

/**
 * Creates a new backup and saves it to the storage
 */
export const create = async (
    guild: Guild,
    options: CreateOptions = {
        backupID: null,
        maxMessagesPerChannel: 10,
        jsonSave: true,
        jsonBeautify: true,
        doNotBackup: [],
        backupMembers: false,
        saveImages: true,
        selfBot: false
    }
) => {
    return new Promise<BackupData>(async (resolve, reject) => {
        if (!options.selfBot && !guild.client.options.intents.has(IntentsBitField.Flags.Guilds)) return reject('Guilds intent is required');

        // Activer le mode selfbot si l'option est définie
        if (options.selfBot) {
            try {
                const { enableSelfbotMode } = require('./util');
                enableSelfbotMode();
            } catch (selfbotError) {
                console.error(`Erreur lors de l'activation du mode selfbot: ${selfbotError}`);
                // On continue même si le mode selfbot n'a pas pu être activé
            }
        }

        // Initialisation des données de backup avec des valeurs par défaut
        const backupData: BackupData = {
            name: 'Unknown Server',
            verificationLevel: 0,
            explicitContentFilter: 0,
            defaultMessageNotifications: 0,
            afk: null,
            widget: {
                enabled: false,
                channel: null
            },
            channels: { categories: [], others: [] },
            roles: [],
            bans: [],
            emojis: [],
            members: [],
            createdTimestamp: Date.now(),
            guildID: '',
            id: options.backupID ?? SnowflakeUtil.generate().toString()
        };

        // Récupération des informations de base du serveur
        try {
            backupData.name = guild.name || 'Unknown Server';
            backupData.verificationLevel = guild.verificationLevel;
            backupData.explicitContentFilter = guild.explicitContentFilter;
            backupData.defaultMessageNotifications = guild.defaultMessageNotifications;
            backupData.guildID = guild.id;

            // Récupération des informations AFK
            if (guild.afkChannel) {
                backupData.afk = {
                    name: guild.afkChannel.name,
                    timeout: guild.afkTimeout
                };
            }

            // Récupération des informations du widget
            try {
                backupData.widget = {
                    enabled: guild.widgetEnabled || false,
                    channel: guild.widgetChannel ? guild.widgetChannel.name : null
                };
            } catch (widgetError) {
                console.error(`Erreur lors de la récupération des informations du widget: ${widgetError}`);
                // On continue avec les valeurs par défaut
            }
        } catch (basicInfoError) {
            console.error(`Erreur lorsf de la récupération des informations de base du serveur: ${basicInfoError}`);
            // On continue avec les valeurs par défaut
        }

        // Récupération des images du serveur
        try {
            if (guild.icon) {
                backupData.iconURL = guild.icon;

                if (options && options.saveImages) {
                    console.log(guild.icon, guild.iconURL())
                    try {
                        let icon_url = guild.icon
                        if ('iconURL' in guild) {
                            icon_url = guild.iconURL();
                        }

                        const iconResponse = await fetch(icon_url);
                        const iconBuffer = await iconResponse.arrayBuffer();
                        backupData.iconBase64 = Buffer.from(iconBuffer).toString('base64')
                    } catch (iconError) {
                        console.error(`Erreur lors de la récupération de l'icône du serveur: ${iconError}`);
                        // On continue sans l'icône en base64
                    }
                }
            }

            if (guild.splash) {
                backupData.splashURL = guild.splash;
                if (options && options.saveImages) {
                    try {
                        let splash_url = guild.splash;
                        if ('splashURL' in guild) {
                            splash_url = guild.splashURL({ size: 4096, extension: "webp" })
                        }

                        const splashResponse = await fetch(splash_url);
                        const splashBuffer = await splashResponse.arrayBuffer();
                        backupData.splashBase64 = Buffer.from(splashBuffer).toString("base64")
                    } catch (splashError) {
                        console.error(`Erreur lors de la récupération du splash du serveur: ${splashError}`);
                        // On continue sans le splash en base64
                    }
                }
            }

            if (guild.banner) {
                backupData.bannerURL = guild.banner;
                if (options && options.saveImages) {
                    try {
                        let banner_url = guild.banner;
                        if ('bannerURL' in guild) {
                            banner_url = guild.bannerURL({ size: 4096, extension: "webp", forceStatic: false })
                        }
                        const bannerResponse = await fetch(banner_url);
                        const bannerBuffer = await bannerResponse.arrayBuffer()
                        backupData.bannerBase64 = Buffer.from(bannerBuffer).toString("base64")
                    } catch (bannerError) {
                        console.error(`Erreur lors de la récupération de la bannière du serveur: ${bannerError}`);
                        // On continue sans la bannière en base64
                    }
                }
            }
        } catch (imageError) {
            console.error(`Erreur lors de la récupération des images du serveur: ${imageError}`);
            // On continue sans les images
        }

        // Backup des membres si demandé
        if (options && options.backupMembers) {
            try {
                backupData.members = await createMaster.getMembers(guild);
            } catch (membersError) {
                console.error(`Erreur lors de la récupération des membres: ${membersError}`);
                // On continue avec un tableau vide
            }
        }

        // Backup des bans si non exclu
        if (!options || !(options.doNotBackup || []).includes('bans')) {
            try {
                backupData.bans = await createMaster.getBans(guild);
            } catch (bansError) {
                console.error(`Erreur lors de la récupération des bans: ${bansError}`);
                // On continue avec un tableau vide
            }
        }

        // Backup des rôles si non exclu
        if (!options || !(options.doNotBackup || []).includes('roles')) {
            try {
                backupData.roles = await createMaster.getRoles(guild);
            } catch (rolesError) {
                console.error(`Erreur lors de la récupération des rôles: ${rolesError}`);
                // On continue avec un tableau vide
            }
        }

        // Backup des emojis si non exclu
        if (!options || !(options.doNotBackup || []).includes('emojis')) {
            try {
                backupData.emojis = await createMaster.getEmojis(guild, options);
            } catch (emojisError) {
                console.error(`Erreur lors de la récupération des emojis: ${emojisError}`);
                // On continue avec un tableau vide
            }
        }

        // Backup des canaux si non exclu
        if (!options || !(options.doNotBackup || []).includes('channels')) {
            try {
                backupData.channels = await createMaster.getChannels(guild, options);
            } catch (channelsError) {
                console.error(`Erreur lors de la récupération des canaux: ${channelsError}`);
                // On continue avec des tableaux vides
            }
        }

        // Sauvegarde du backup en JSON si demandé
        if (!options || options.jsonSave === undefined || options.jsonSave) {
            try {
                // Convert Object to JSON
                const backupJSON = options.jsonBeautify
                    ? JSON.stringify(backupData, null, 4)
                    : JSON.stringify(backupData);
                // Save the backup
                await writeFile(`${backups}${sep}${backupData.id}.json`, backupJSON, 'utf-8');
            } catch (saveError) {
                console.error(`Erreur lors de la sauvegarde du backup: ${saveError}`);
                // On continue et on retourne quand même les données
            }
        }

        // Retourne les données même si certaines parties ont échoué
        resolve(backupData);
    });
};

/**
 * Loads a backup for a guild
 */
export const load = async (
    backup: string | BackupData,
    guild: Guild,
    options: LoadOptions = {
        clearGuildBeforeRestore: true,
        maxMessagesPerChannel: 100, // Augmentation de la valeur par défaut à 100 messages
        devMode: false // Mode développeur désactivé par défaut
    }
) => {
    return new Promise(async (resolve, reject) => {
        // Activer le mode développeur si l'option est définie
        if (options.devMode) {
            enableDevMode();
        } else {
            disableDevMode();
        }

        // Activer le mode selfbot si l'option est définie
        if (options.selfBot) {
            const { enableSelfbotMode } = require('./util');
            enableSelfbotMode();
            info('Mode selfbot activé');
        }

        if (!guild) {
            return reject('Invalid guild');
        }
        try {
            const backupData: BackupData = typeof backup === 'string' ? await getBackupData(backup) : backup;
            try {
                if (options.clearGuildBeforeRestore === undefined || options.clearGuildBeforeRestore) {
                    // Clear the guild
                    await utilMaster.clearGuild(guild);
                }
                await Promise.all([
                    // Restore guild configuration
                    loadMaster.loadConfig(guild, backupData),
                    // Restore guild roles
                    loadMaster.loadRoles(guild, backupData),
                    // Restore guild channels
                    loadMaster.loadChannels(guild, backupData, options),
                    // Restore afk channel and timeout
                    loadMaster.loadAFK(guild, backupData),
                    // Restore guild emojis
                    loadMaster.loadEmojis(guild, backupData),
                    // Restore guild bans
                    loadMaster.loadBans(guild, backupData),
                    // Restore embed channel
                    loadMaster.loadEmbedChannel(guild, backupData)
                ]);
            } catch (e) {
                return reject(e);
            }
            // Then return the backup data
            return resolve(backupData);
        } catch (e) {
            return reject('function:load:No backup found');
        }
    });
};

/**
 * Removes a backup
 */
export const remove = async (backupID: string) => {
    return new Promise<void>((resolve, reject) => {
        try {
            require(`${backups}${sep}${backupID}.json`);
            unlinkSync(`${backups}${sep}${backupID}.json`);
            resolve();
        } catch (error) {
            reject('Backup not found');
        }
    });
};

/**
 * Returns the list of all backup
 */
export const list = async () => {
    const files = await readdir(backups); // Read "backups" directory
    return files.map((f) => f.split('.')[0]);
};

/**
 * Change the storage path
 */
export const setStorageFolder = (path: string) => {
    if (path.endsWith(sep)) {
        path = path.substr(0, path.length - 1);
    }
    backups = path;
    if (!existsSync(backups)) {
        mkdirSync(backups);
    }
};

export default {
    create,
    fetch: fetchBackup,
    list,
    load,
    remove,
    setStorageFolder
};
