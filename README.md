# Discord Server Backup Manager - Save, Load, and Restore with Ease!

[![downloadsBadge](https://img.shields.io/npm/dt/discord-rebackup?style=for-the-badge)](https://npmjs.com/rediscord-backup)
[![versionBadge](https://img.shields.io/npm/v/discord-rebackup?style=for-the-badge)](https://npmjs.com/discord-rebackup)

**Note**: This module leverages the latest discord.js features and requires discord.js v14.

[![Static Badge](https://img.shields.io/badge/Created%20by%20iHorizon%20Team-blue)](https://ihorizon.me)

Discord RE-Backup is a robust Node.js module designed for effortless management of Discord server backups.

- Create unlimited backups in under 10 seconds!
- Restore messages, even with webhooks!
- Restore everything possible, including channels, roles, permissions, bans, emojis, name, icon, and more!

## Installation

```js
npm install --save discord-rebackup
```

### Create

Create a backup for the specified Discord server with ease!

```js
/**
 * @param {Guild} [Guild] - The Discord server you want to backup
 * @param {object} [options] - Backup options
 */

import backup from "discord-rebackup";

backup.create(Guild, options).then((backupData) => {
    console.log(backupData.id); // NSJH2
});
```

Click [here](#create-advanced) to explore advanced **backup options**.

### Load

Effortlessly load a backup onto a Discord server!

```js
/**
 * @param {string} [backupID] - The ID of the backup you want to load
 * @param {Guild} [Guild] - The Discord server where you want to load the backup
 */

import backup from "discord-rebackup";

backup.load(backupID, Guild).then(() => {
    backup.remove(backupID); // Recommended to delete the backup after loading
});
```

### Fetch

Retrieve information from a backup

```js
/**
 * @param {string} [backupID] - The ID of the backup to fetch
 */

import backup from "discord-rebackup";

backup.fetch(backupID).then((backupInfos) => {
    console.log(backupInfos);
    /*
    {
        id: "BC5qo",
        size: 0.05
        data: {BackupData}
    }
    */
});
```

### Remove

**Warning**: Once removed, a backup is irrecoverable!

```js
/**
 * @param {string} [backupID] - The ID of the backup to remove
 */

import backup from "discord-rebackup";

backup.remove(backupID);
```

### List

**Note**: `backup#list()` returns an array of IDs; fetching the ID provides complete information.

```js
import backup from "discord-rebackup";

backup.list().then((backups) => {
    console.log(backups); // Expected Output [ "BC5qo", "Jdo91", ...]
});
```

### SetStorageFolder

Update the storage folder location

```js
import backup from "discord-rebackup";

backup.setStorageFolder(__dirname+"/backups/");
await backup.create(guild); // Backup created in ./backups/
backup.setStorageFolder(__dirname+"/my-backups/");
await backup.create(guild); // Backup created in ./my-backups/
```

## Advanced Usage

### Create [Advanced]

Utilize additional options for backup creation:

```js
import backup from "discord-rebackup";

backup.create(guild, {
    maxMessagesPerChannel: 10,
    jsonSave: false,
    jsonBeautify: true,
    doNotBackup: [ "roles",  "channels", "emojis", "bans" ],
    saveImages: "base64"
});
```

**maxMessagesPerChannel**: Maximum messages to save in each channel. "0" saves no messages.
**jsonSave**: Save the backup to a JSON file; save the backup data in your own DB for loading later.
**jsonBeautify**: Format the JSON backup for better readability.
**doNotBackup**: Exclude items from backup, such as `roles`, `channels`, `emojis`, `bans`.
**saveImages**: Save images like guild icon and emojis as "url" or "base64" (recommended for server cloning).

### Load [Advanced]

Load a backup from your own data instead of using an ID:

```js
import backup from "discord-rebackup";

backup.load(backupData, guild, {
    clearGuildBeforeRestore: true
});
```

**clearGuildBeforeRestore**: Clear the guild (roles, channels, etc.) before the backup restoration (recommended).
**maxMessagesPerChannel**: Maximum messages to restore in each channel. "0" restores no messages.

## Example Bot

```js
// Load modules
import backup from "discord-rebackup";
import { Client, EmbedBuilder } from "discord.js";

client = new Client();
settings = {
    prefix: "b!",
    token: "YOURTOKEN"
};

// ... (rest of the bot code)

//Your secret token to log the bot in. (never share this to anyone!)
client.login(settings.token);
```

## Restored Elements

Here are all elements that can be restored with `discord-rebackup`:

- Server icon, banner, region, splash
- Server verification level, explicit content filter, default message notifications
- Server embed channel
- Server bans (with reasons)
- Server emojis
- Server AFK (channel and timeout)
- Server channels (with permissions, type, nsfw, messages, etc.)
- Server roles (with permissions, color, etc.)

**Note**: Certain elements like server logs, invitations, and vanity URLs cannot be restored.

## From Discord-Backup and edited by the heart of the iHorizon team!