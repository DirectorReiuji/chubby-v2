const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Bans = require('../models/bans');
const utility = require('../utility');

/**
 *
 * @param {Discord.Interaction} interaction
 */
async function banHandler(interaction) {
	interaction.deferReply({
		ephemeral: true
	});

	const guild = await interaction.guild.fetch();
	const executingMember = await interaction.member.fetch();
	const users = interaction.options.getString('users');
	const reason = interaction.options.getString('reason');

	const userIds = [...new Set(Array.from(users.matchAll(Discord.MessageMentions.USERS_PATTERN), match => match[1]))];

	const bansListEmbed = new Discord.MessageEmbed();
	bansListEmbed.setTitle('User Bans :thumbsdown:');
	bansListEmbed.setColor(0xFFA500);

	for (const userId of userIds) {
		const member = await interaction.guild.members.fetch(userId);
		const { count, rows } = await Bans.findAndCountAll({
			where: {
				user_id: member.id
			}
		});

		const sendMemberEmbeds = [];

		const banEmbed = new Discord.MessageEmbed();

		banEmbed.setTitle('Punishment Details');
		banEmbed.setDescription('You have been banned from the Pretendo Network server. You may not rejoin at this time, and an appeal may not be possible\nYou may review the details of your ban below');
		banEmbed.setColor(0xF24E43);
		banEmbed.setTimestamp(Date.now());
		banEmbed.setAuthor({
			name: `Banned by: ${executingMember.user.tag}`,
			iconURL: executingMember.user.avatarURL()
		});
		banEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()
		});
		banEmbed.setFields({
			name: 'Ban Reason',
			value: reason
		});

		sendMemberEmbeds.push(banEmbed);

		if (count > 0) {
			const pastBansEmbed = new Discord.MessageEmbed();
			pastBansEmbed.setTitle('Past Bans');
			pastBansEmbed.setDescription('For clarifty purposes here is a list of your past bans');
			pastBansEmbed.setColor(0xEF7F31);
			pastBansEmbed.setTimestamp(Date.now());
			pastBansEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()
			});

			for (let i = 0; i < rows.length; i++) {
				const ban = rows[i];
				const bannedBy = await interaction.client.users.fetch(ban.admin_user_id);

				pastBansEmbed.addFields(
					{
						name: `${utility.ordinal(i + 1)} Ban`,
						value: ban.reason
					},
					{
						name: 'Punished By',
						value: bannedBy.tag,
						inline: true
					},
					{
						name: 'Date',
						value: ban.timestamp.toLocaleDateString(),
						inline: true
					}
				);
			}

			sendMemberEmbeds.push(pastBansEmbed);
		}

		await member.send({
			embeds: sendMemberEmbeds
		});

		await member.ban({
			reason
		});

		await Bans.create({
			user_id: member.id,
			admin_user_id: executingMember.id,
			reason: reason
		});

		bansListEmbed.addField(`${member.user.username}'s bans`, (count + 1).toString(), true);
	}

	await interaction.editReply({ embeds: [bansListEmbed], ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultPermission(false)
	.setName('ban')
	.setDescription('Ban user(s)')
	.addStringOption(option => {
		return option.setName('users')
			.setDescription('User(s) to ban')
			.setRequired(true);
	})
	.addStringOption(option => {
		return option.setName('reason')
			.setDescription('Reason for the ban')
			.setRequired(true);
	});

module.exports = {
	handler: banHandler,
	deploy: command.toJSON()
};