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
	'%FAQ_CHANNEL%': '<#1030532182831288440>',
	'%STORY_CHANNEL%': '<#893339645130186812>',
	'%SUGGESTIONS_CHANNEL%': '<#1019670170614108171>',
	'%CONTEST_INFO_CHANNEL%': '<#858560434386370572>',

	// Roles - %EXAMPLE_ROLE%: '<#ROLE_ID>'
	'%SERVER_BOOSTER_ROLE%': '<@&778131289311674410>',
	'%YOUTUBE_NOTIFS_ROLE%': '<@&829855600757571605>',
	'%TWITTER_NOTIFS_ROLE%': '<@&829855884942508044>',
	'%VEXYMC_NOTIFS_ROLE%': '<@&962961069633048597>',
	'%EVENT_NOTIFS_ROLE%': '<@&829855953150935093>',
	'%STREAM_NOTIFS_ROLE%': '<@&1009894648677945485>',
	'%SERVER_ANNOUNCEMENT_NOTIFS_ROLE%': '<@&887847467612270702>',
	'%SNICKERS_ROLE%': '<@&959283961186615316>',
	'%ARCHIVES_ROLE%': '<@&1006688550470824086>',
	'%PRODUCER_ROLE%': '<@&880640491337695273>',
	'%MUSICIAN_ROLE%': '<@&882774373877043281>',
	'%SINGER_VOCALIST_ROLE%': '<@&880640556320034886>',
	'%DESIGNER_ROLE%': '<@&880640541040205824>',
	'%CONTENT_CREATOR_ROLE%': '<@&880640586888126504>',
	'%GAMER_ROLE%': '<@&880640574946951189>',
	'%COOL_ROLE%': '<@&832484256424263681>',
	'%COLD_ROLE%': '<@&832484355925999626>',
	'%CHILL_ROLE%': '<@&778056316408954901>',
	'%SNOWY_ROLE%': '<@&832484413970841671>',
	'%WINTRY_ROLE%': '<@&832484458455760946>',
	'%FROSTY_ROLE%': '<@&779074816728367116>',
	'%FRIGID_ROLE%': '<@&832484515846946848>',
	'%FREEZING_ROLE%': '<@&779076733092757526>',
	'%GLACIAL_ROLE%': '<@&832484573295673344>',
	'%BOREAL_ROLE%': '<@&832484604573253642>',
	'%ARCTIC_ROLE%': '<@&779079737837617153>',
	'%ABSOLUTE_ZERO_ROLE%': '<@&779078877220700191>',
	'%ADMIN_ROLE%': '<@&778171831529635841>',
	'%MODERATOR_ROLE%': '<@&778000469469429790>',
	'%JMOD_ROLE%': '<@&881611078709157929>',
	'%INTROVERT_ROLE%': '<@&897608861001867316>',
	'%EXTROVERT_ROLE%': '<@&897608906375835669>',
	'%AMBIVERT_ROLE%': '<@&897678264414375997>',
	'%CONTEST_CHAMPION_ROLE%': '<@&861036120992514068>',
	'%PAST_CONTEST_CHAMPION_ROLE%': '<@&1027843013835235358>',
	'%CONTEST_NOTIFS_ROLE%': '<@1045435745759920179>',

	// Hyperlinks - %EXAMPLE_LINK%: 'LINK'
	'%WELCOME_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322441540653107/Welcome.png',
	'%ROLE_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322443021226085/Roles.png',
	'%LEVEL_ROLES_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025333423818158120/LvlRoles.png',
	'%MODERATION_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322442694086666/Moderation.png',
	'%THANK_YOU_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025322442274635796/ThankYou.png',
	'%BOOSTING_IMAGE%': 'https://cdn.discordapp.com/attachments/1007029641241956403/1025644065448017981/Boosting.png',
	'%FAQ_IMAGE%': 'https://cdn.discordapp.com/attachments/973000592005951518/1028055950294270012/FAQ.png',
	'%RULES_IMAGE%': 'https://cdn.discordapp.com/attachments/973000592005951518/1029122056652070992/Rules.png',

	// Custom Emojis - %EXAMPLE_EMOJI%: '<:NAME:ID>'
	'%HUG1_EMOJI%': '<:FBHug:834556611543564378>',
	'%VEXYDANCE_EMOJI%': '<a:vexyraise:858113843321634856>',
	'%VEXYHAI_EMOJI%': '<:vexyhai:884482263700619354>',
	'%HUG2_EMOJI%': '<:FBhug2:910346042040520795>',
	'%BOWVEXY_EMOJI%': '<:vexyBow:1069106925452673117>',
	'%VEXYPUNCH_EMOJI%': '<:vexyPunch:1069106926815817738>',
	'%WINTRY_EMOJI%': '<:Wintry:1027882168959115344>',
	'%FROSTY_EMOJI%': '<:Frosty:1027882170531971073>',
	'%FRIGID_EMOJI%': '<:Frigid:1027882173002416149>',
	'%FREEZING_EMOJI%': '<:Freezing:1027882174944387132>',
	'%GLACIAL_EMOJI%': '<:Glacial:1032942888008564796>',
	'%BOREAL_EMOJI%': '<:Boreal:1032942889266851900>',
	'%ARCTIC_EMOJI%': '<:Arctic:1032942890055381023>',
	'%ABSOLUTE_ZERO_EMOJI%': '<:AbsoluteZero:1032942891217195011>',
	'%VEXYHUG_EMOJI%': '<:VexHug:838543117128826940>',
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
	console.log(r2);
	const parts = r2.split('\n\n');

	let firstMessage: APIMessage | null = null;
	for (let part of parts) {
		if (firstMessage) {
			part = part.replace(
				jumpRegex,
				`https://discord.com/channels/777991471907078174/${firstMessage.channel_id}/${firstMessage.id}`,
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
