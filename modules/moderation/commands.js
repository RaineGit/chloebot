[
	{
		name: ["wp", "warnpoints"],
		args: "<mention>",
		cat: "moderation",
		desc: "Check how many warnpoints a user has",
		func: function(d){
			return new Promise(async resolve => {
				var member = d.msgText.length == 0 ? d.msg.member : await getMember(d.msgText, d.msg.guild);
				if(member == null){
					resolve(new Answer("User not found in this server", Error));
					return;
				}
				var wps = getWarnpoints(member);
				var embed = new Discord.MessageEmbed();
				embed.setColor(config.defaultEmbedColor);
				embed.setTitle(member.user.username + "'s warnpoints");
				var emojis = ["<:progbar_0_new:952549599241994370>", "<:progbar_1_new:952549599606894593>", "<:progbar_2:809841073646993438>", "<:progbar_3:809841073219829822>", "<:progbar_4:809841073705975827>", "<:progbar_5_new:952549600319897600>", "<:progbar_6_new:952549599397167124>"];
				var progBar = [];
				var amountFull = Math.round((wps / 100) * 10);
				progBar = [...Array(amountFull).fill(emojis[3]), ...Array(10 - amountFull).fill(emojis[4])];
				progBar[0] = amountFull <= 0 ? emojis[0] : emojis[1];
				progBar[9] = amountFull >= 10 ? emojis[6] : emojis[5];
				embed.setDescription(member.user.username + " has " + Number(wps.toFixed(3)) + " warnpoints\n" + progBar.join(""));
				embed.setFooter({text: Number((100 - wps).toFixed(3)) + " away from getting banned"})
				resolve(new Answer({embeds: [embed]}));
			});
		}
	},
	{
		name: ["mod", "modstatus"],
		cat: "moderation",
		desc: "Check the moderation status of the server",
		func: function(d){
			var warnAutoRemove = dbGet(["guilds", d.msg.guild.id, "config", "WarnAutoRemove"]);
			var logChannel = dbGet(["guilds", d.msg.guild.id, "config", "LogChannel"]);
			var lastWpRemovalTime = dbGet(["lastWpRemovalTime"]);
			var timeLeft = (lastWpRemovalTime + 3600000) - new Date().getTime();
			var members = dbGet(["guilds", d.msg.guild.id, "members"]);
			var warnedMembers = 0;
			for(var i in members){
				if(members[i].wp !== undefined)
					warnedMembers++;
			}
			var embed = new Discord.MessageEmbed();
			embed.setColor(config.defaultEmbedColor);
			embed.setTitle(d.msg.guild.name + "'s moderation status");
			embed.setDescription("You can modify these configs in `" + d.prefix + "config`");
			embed.addField("Warned members", "There " + (warnedMembers == 1 ? "is" : "are") + " " + warnedMembers + " member" + (warnedMembers == 1 ? "" : "s") + " with more than 0 warnpoints in this server right now");
			embed.addField("Automatic warnpoint removal", warnAutoRemove !== null ? warnAutoRemove + " warnpoint" + (warnAutoRemove == 1 ? "" : "s") + " will be removed from every member in " + (timeLeft < 0 ? "less than a minute" : timeInterval(timeLeft)) : "Disabled");
			embed.addField("Moderation log channel", logChannel !== null ? "<#" + logChannel + ">" : "Disabled");
			return new Answer({embeds: [embed]});
		}
	},
	{
		name: ["warn"],
		args: "[mention] [amount of warnpoints] <reason>",
		cat: "moderation",
		desc: "Add warnpoints to a member",
		func: function(d){
			if(d.args.length < 3){
				return SyntaxError;
			}
			if(!(d.msg.member.permissions.has("MODERATE_MEMBERS") && d.msg.member.permissions.has("BAN_MEMBERS"))){
				return new Answer("Only members with the \"Moderate Members\" and \"Ban Members\" permissions can do this", Error);
			}
			return new Promise(async resolve => {
				var member = await getMember(d.args[1], d.msg.guild);
				var amount = d.args[2];
				if(member == null){
					resolve(new Answer("User not found in this server", Error));
					return;
				}
				if(isNaN(amount)){
					resolve(SyntaxError);
					return;
				}
				var reason = (d.args.length >= 4 ? d.args.slice(3).join(" ") : null);
				var embeds = await addWarnpoints(member, Number(amount), d.msg.author, reason);
				resolve(new Answer({embeds: embeds}));
			});
		}
	},
	{
		name: ["kick"],
		args: "[mention] <reason>",
		cat: "moderation",
		desc: "Kick a member",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			if(!d.msg.member.permissions.has("KICK_MEMBERS")){
				return new Answer("Only members with the \"Kick Members\" permission can do this", Error);
			}
			return new Promise(async resolve => {
				var member = await getMember(d.args[1], d.msg.guild);
				if(member == null){
					resolve(new Answer("User not found in this server", Error));
					return;
				}
				var reason = (d.args.length >= 3 ? d.args.slice(2).join(" ") : null);
				var embeds = await kickMember(member, d.msg.author, reason);
				resolve(new Answer({embeds: embeds}));
			});
		}
	},
	{
		name: ["ban"],
		args: "[mention] <reason>",
		cat: "moderation",
		desc: "Ban a member",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			if(!d.msg.member.permissions.has("BAN_MEMBERS")){
				return new Answer("Only members with the \"Ban Members\" permission can do this", Error);
			}
			return new Promise(async resolve => {
				var member = await getMember(d.args[1], d.msg.guild);
				if(member == null){
					resolve(new Answer("User not found in this server", Error));
					return;
				}
				var reason = (d.args.length >= 3 ? d.args.slice(2).join(" ") : null);
				var embeds = await banMember(member, d.msg.author, reason);
				resolve(new Answer({embeds: embeds}));
			});
		}
	}
]