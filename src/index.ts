import { APIMessage } from 'discord-api-types/v9';
import { WebhookClient, Formatters } from 'discord.js';
import { readdir, readFile } from 'fs/promises';
import { URL } from 'url';
import { promisify } from 'util';

const jumpRegex = /%JUMP_TO_TOP%/gm;

const linkEscapeRegex = /\[(.+?)\]\((.+?)\)/gm;
const linkEscapeReplacer = (_: any, p1: string, p2: string): string =>
	Formatters.hyperlink(p1, Formatters.hideLinkEmbed(p2));

const replacePatterns = {
	// Channels - %EXAMPLE_CHANNEL%: '<#CHANNEL_ID>'
	'%RULES_CHANNEL%': '<#778001264566075392>',
	'%SUPPORT_CHANNEL%': '<#962661688371474473>',
	'%GET_ROLES_CHANNEL%': '<#883800107538079745>',
	'%ANNOUNCEMENTS_CHANNEL%': '<#778001540441964565>',
	'%SOCIALS_CHANNEL%': '<#832381447456555038>',
	'%VEXYMC_ANNOUNCEMENTS_CHANNEL%': '<#964050090429907005>',
	'%VEXYMC_INFO_CHANNEL%': '<#961059578789912607>',
	'%EVENTS_CHANNEL%': '<#834193067300356139>',
	'%SERVER_ANNOUNCEMENTS_CHANNEL%': '<#886390330906279946>',
	'%MEMES_CHANNEL%': '<#778002210821898241>',
	'%ARTIST_CHAT_CHANNEL%': '<#778002329143345184>',
	'%PRODUCER_CHAT_CHANNEL%': '<#883178353161568287>',
	'%OTHER_MEDIA_CHANNEL%': '<#860918931093716992>',
	'%POLLS_CHANNEL%': '<#893341152902787102>',
	'%GENERAL_CHANNEL%': '<#777991471907078178>',
	'%FAQ_CHANNEL%': '<#1025275978500558888>',

	// Roles - %EXAMPLE_ROLE%: '<#ROLE_ID>'
	'%YOUTUBE_NOTIFS_ROLE%': '<#965082110467661854>',
	'%TWITTER_NOTIFS_ROLE%': '<#965082110467661854>',
	'%VEXYMC_NOTIFS_ROLE%': '<#965082110467661854>',
	'%EVENT_NOTIFS_ROLE%': '<#965082110467661854>',
	'%STREAM_NOTIFS_ROLE%': '<#965082110467661854>',
	'%SERVER_ANNOUNCEMENT_NOTIFS_ROLE%': '<#965082110467661854>',
	'%SNICKERS_ROLE%': '<#965082110467661854>',
	'%ARCHIVES_ROLE%': '<#965082110467661854>',
	'%PRODUCER_ROLE%': '<#965082110467661854>',
	'%MUSICIAN_ROLE%': '<#965082110467661854>',
	'%SINGER_VOCALIST_ROLE%': '<#965082110467661854>',
	'%DESIGNER_ROLE%': '<#965082110467661854>',
	'%CONTENT_CREATOR_ROLE%': '<#965082110467661854>',
	'%GAMER_ROLE%': '<#965082110467661854>',
	'%COOL_ROLE%': '<#965082110467661854>',
	'%COLD_ROLE%': '<#965082110467661854>',
	'%CHILL_ROLE%': '<#965082110467661854>',
	'%SNOWY_ROLE%': '<#965082110467661854>',
	'%WINTRY_ROLE%': '<#965082110467661854>',
	'%FROSTY_ROLE%': '<#965082110467661854>',
	'%FRIGID_ROLE%': '<#965082110467661854>',
	'%FREEZING_ROLE%': '<#965082110467661854>',
	'%GLACIAL_ROLE%': '<#965082110467661854>',
	'%BOREAL_ROLE%': '<#965082110467661854>',
	'%ARCTIC_ROLE%': '<#965082110467661854>',
	'%ABSOLUTE_ZERO_ROLE%': '<#965082110467661854>',
	'%MODERATOR_ROLE%': '<#965082110467661854>',

	// Hyperlinks - %EXAMPLE_LINK%: 'LINK'
	'%WELCOME_IMAGE': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322441540653107/Welcome.png',
	'%ROLE_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322443021226085/Roles.png',
	'%LEVEL_ROLES_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322441540653107/Welcome.png',
	'%MODERATION_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322442694086666/Moderation.png',
	'%THANK_YOU_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322442274635796/ThankYou.png',
} as const;

const resolveIdentifier = (channelName: string): string => channelName.toUpperCase().replace(/-/gm, '_');

const wait = promisify(setTimeout);

const deployChannelString = process.env.DEPLOY_CHANNELS;
const channels = deployChannelString
	?.trim()
	.split(/ *, */gm)
	.map((c) => resolveIdentifier(c));

if (!channels) {
	throw new Error(`[MISSING] No deploy channels provided`);
}

const resourcesDir = new URL('../resources/', import.meta.url);

const files = await readdir(resourcesDir);

const missingHooks = channels.filter((c) => !Boolean(process.env[c]));
const missingFiles = channels.filter((c) => !files.includes(`${c}.md`));

if (missingHooks.length) {
	throw new Error(`[MISSING] No webhook environment variable(s) for ${missingHooks.join(', ')}`);
}

if (missingFiles.length) {
	throw new Error(`[MISSING] No file for ${missingFiles.map((c) => `${c}.md`).join(', ')}`);
}

for (const channel of channels) {
	console.log(`[STARTING] Deploying ${channel}`);

	const hook = new WebhookClient({ url: process.env[channel]! });
	const fileName = `${channel}.md`;

	const raw = await readFile(new URL(fileName, resourcesDir), { encoding: 'utf8' });
	const r1 = raw.replace(linkEscapeRegex, linkEscapeReplacer).replace(/"/g, '\\"');
	const r2 = Object.entries(replacePatterns).reduce((acc, [k, v]) => acc.replace(new RegExp(k, 'gm'), v), r1);
	const parts = r2.split('\n\n');

	let firstMessage: APIMessage | null = null;
	for (let part of parts) {
		if (firstMessage) {
			part = part.replace(
				jumpRegex,
				`https://discord.com/channels/377336311834738689/${firstMessage.channel_id}/${firstMessage.id}`,
			);
		}
		// A raw API response is returned here, not a Message object as the typings indicate
		const response = await hook.send({
			avatarURL: process.env.WEBHOOK_AVATAR,
			content: part,
			username: process.env.WEBHOOK_NAME,
			allowedMentions: {
				users: [],
				roles: [],
			},
		});
		firstMessage ??= response;

		await wait(1000);
	}
	hook.destroy();
}
