function getWarnpoints(member){
	try{
		var wps = dbGet(["guilds", member.guild.id, "members", member.user.id, "wp"]);
		if(wps === null){
			return 0;
		}
		return Number(wps);
	}
	catch(err){
		return null;
	}
}

function setWarnpoints(member, amount){
	try{
		if(isNaN(amount)){
			return null;
		}
		dbSet(["guilds", member.guild.id, "members", member.user.id, "wp"], Number(amount) <= 0 ? null : Number(amount));
	}
	catch(err){
		return null;
	}
}

function makeWarnEmbed(member, amount, warnedBy, reason){
	if(isNaN(amount)){
		throw "The amount must be a number";
	}
	var embed = new Discord.MessageEmbed();
	var removing = amount < 0;
	var wps = getWarnpoints(member);
	embed.setColor(removing ? config.goodEmbedColor : config.badishEmbedColor);
	embed.setTitle((removing ? "Remove " : "") + "Warn");
	embed.addField(warnedBy.username + " has " + (removing ? "removed" : "added") + " " + Number(Math.abs(amount).toFixed(3)) + " warnpoint" + (Math.abs(amount) == 1 ? "" : "s") + " " + (removing ? "from" : "to") + " " + member.user.username, member.user.username + " now has " + Number(wps.toFixed(3)) + " warnpoint" + (wps == 1 ? "" : "s") + " " + (wps < 100 ? "(" + Number((100 - wps).toFixed(3)) + " away from getting banned)" : ""));
	if(typeof(reason) == "string"){
		embed.addField("Reason", reason);
	}
	embed.setFooter({text: "User warned: " + member.user.id + "\nWarned by: " + warnedBy.id});
	return embed;
}

function addWarnpoints(member, amount, warnedBy, reason){
	if(isNaN(amount)){
		throw "The amount must be a number";
	}
	return new Promise(async resolve => {
		var wps = getWarnpoints(member);
		var newWps = wps + Number(amount);
		var ban = false;
		var banEmbeds = null;
		if(newWps >= 100){
			ban = true;
		}
		else if(newWps < 0){
			newWps = 0;
		}
		setWarnpoints(member, newWps);
		var logChannel = dbGet(["guilds", member.guild.id, "config", "LogChannel"]);
		var prefix = dbGet(["guilds", member.guild.id, "config", "Prefix"]) || config.prefix;
		var embed = makeWarnEmbed(member, amount, warnedBy, reason);
		var embeds = [];
		if(logChannel !== null){
			try{
				await (new Answer({embeds: [embed]}).send(await client.channels.fetch(logChannel)));
			}
			catch(err){
				embeds.push(makeErrorEmbed("Unable to send messages in LogChannel (<#" + logChannel + ">)\nYou can change the LogChannel in `" + prefix + "config`"));
			}
		}
		if(ban){
			banEmbeds = await banMember(member, client.user, "The member reached 100 warnpoints after " + warnedBy.username + " (" + warnedBy.id + ") gave them " + Number(amount.toFixed(3)) + " warnpoint" + (Math.abs(amount) == 1 ? "" : "s") + (reason != null ? " due to:\n" + reason : ""));
			setWarnpoints(member, 0);
		}
		embeds.push(embed);
		if(banEmbeds !== null){
			embeds.push(...banEmbeds);
		}
		resolve(embeds);
	});
}

function makeKickEmbed(member, kickedBy, reason){
	var embed = new Discord.MessageEmbed();
	embed.setColor(config.badEmbedColor);
	embed.setTitle("Kick");
	embed.setDescription(member.user.username + " has been kicked by " + kickedBy.username);
	if(typeof(reason) == "string"){
		embed.addField("Reason", reason);
	}
	embed.setFooter({text: "User kicked: " + member.user.id + "\nKicked by: " + kickedBy.id});
	return embed;
}

function kickMember(member, kickedBy, reason){
	return new Promise(async resolve => {
		if(!member.guild.me.permissions.has("KICK_MEMBERS")){
			resolve([makeErrorEmbed("I am unable to kick " + member.user.username + "\nI need the \"Kick Members\" permission in order to be able to kick members")]);
			return;
		}
		var embeds = [];
		try{
			await member.kick();
		}
		catch(err){
			resolve([makeErrorEmbed("I am unable to kick " + member.user.username)]);
			return;
		}
		var logChannel = dbGet(["guilds", member.guild.id, "config", "LogChannel"]);
		var prefix = dbGet(["guilds", member.guild.id, "config", "Prefix"]) || config.prefix;
		var embed = makeKickEmbed(member, kickedBy, reason);
		if(logChannel !== null){
			try{
				await (new Answer({embeds: [embed]}).send(await client.channels.fetch(logChannel)));
			}
			catch(err){
				embeds.push(makeErrorEmbed("Unable to send messages in LogChannel (<#" + logChannel + ">)\nYou can change the LogChannel in `" + prefix + "config`"));
			}
		}
		embeds.push(embed);
		resolve(embeds);
	})
}

function makeBanEmbed(member, bannedBy, reason){
	var embed = new Discord.MessageEmbed();
	embed.setColor(config.badEmbedColor);
	embed.setTitle("Ban");
	embed.setDescription(member.user.username + " has been banned by " + bannedBy.username);
	if(typeof(reason) == "string"){
		embed.addField("Reason", reason);
	}
	embed.setFooter({text: "User banned: " + member.user.id + "\nBanned by: " + bannedBy.id});
	return embed;
}

function banMember(member, bannedBy, reason){
	return new Promise(async resolve => {
		if(!member.guild.me.permissions.has("BAN_MEMBERS")){
			resolve([makeErrorEmbed("I am unable to ban " + member.user.username + "\nI need the \"Ban Members\" permission in order to be able to ban members")]);
			return;
		}
		var embeds = [];
		try{
			await member.ban();
		}
		catch(err){
			resolve([makeErrorEmbed("I am unable to ban " + member.user.username)]);
			return;
		}
		var logChannel = dbGet(["guilds", member.guild.id, "config", "LogChannel"]);
		var prefix = dbGet(["guilds", member.guild.id, "config", "Prefix"]) || config.prefix;
		var embed = makeBanEmbed(member, bannedBy, reason);
		if(logChannel !== null){
			try{
				await (new Answer({embeds: [embed]}).send(await client.channels.fetch(logChannel)));
			}
			catch(err){
				embeds.push(makeErrorEmbed("Unable to send messages in LogChannel (<#" + logChannel + ">)\nYou can change the LogChannel in `" + prefix + "config`"));
			}
		}
		embeds.push(embed);
		resolve(embeds);
	})
}