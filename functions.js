function getCommandByName(name){
	var name = name.toLowerCase();
	for(var i=0; i<commands.length; i++){
		if(commands[i].name.includes(name)){
			return commands[i];
		}
	}
	return null;
}

function makeCommandEmbed(commandName, prefix){
	var command = getCommandByName(commandName);
	if(command === null){
		return null;
	}
	var embed = new Discord.MessageEmbed();
	embed.setTitle(prefix + command.name[0] + (command.args !== undefined ? " " + command.args : ""));
	if(command.desc !== undefined){
		embed.setDescription(command.desc);
	}
	if(command.name.length > 1){
		var alts = [];
		for(var i=1; i<command.name.length; i++){
			alts.push(prefix + command.name[i] + (command.args !== undefined ? " " + command.args : ""));
		}
		embed.addField("Alternative" + (command.name.length > 2 ? "s" : ""), alts.join("\n"));
	}
	if(command.cat !== undefined){
		var category = command.cat;
		embed.addField("Category", category[0].toUpperCase() + category.slice(1));
	}
	return embed;
}

function getMention(name){
	var userId = null;
	if(name.length > 3 && name.slice(0, 2) == "<@" && name[name.length - 1] == ">"){
		userId = name.replace(/<@!/g, "<@").split("<@")[1].split(">")[0];
	}
	else if(!isNaN(name)){
		userId = name;
	}
	else{
		return null;
	}
	return userId;
}

function getChannelMention(name){
	var channelId = null;
	if(name.length > 3 && name.slice(0, 2) == "<#" && name[name.length - 1] == ">"){
		channelId = name.split("<#")[1].split(">")[0];
	}
	else if(!isNaN(name)){
		channelId = name;
	}
	else{
		return null;
	}
	return channelId;
}

function getUser(name, force = false){
	return new Promise(async resolve => {
		var userId = getMention(name);
		if(userId === null){
			resolve(null);
			return;
		}
		try{
			resolve(await client.users.fetch(userId, {force: force}));
		}
		catch(err){
			resolve(null);
		}
	});
}

function getMember(user, guild){
	return new Promise(async resolve => {
		if(guild){
			var user_ = null;
			if(typeof(user) == "string"){
				user_ = getMention(user);
			}
			else{
				user_ = user;
			}
			if(user_ == null){
				resolve(null);
				return;
			}
			try{
				resolve(await guild.members.fetch(user_));
			}
			catch(err){
				resolve(null);
			}
		}
	});
}

function getChannel(name){
	return new Promise(async resolve => {
		var channelId = getChannelMention(name);
		if(channelId === null){
			resolve(null);
			return;
		}
		try{
			resolve(await client.channels.fetch(channelId));
		}
		catch(err){
			resolve(null);
		}
	});
}

function getAvatar(user, size = 1024, format = "webp"){
	return user.displayAvatarURL({size: size, format: format, dynamic: true});
}

function getBanner(user, size = 2048, format = "png"){
	try{
		return user.bannerURL({size: size, format: format, dynamic: true});
	}
	catch(err){
		return null;
	}
}

function dbSet(path, value, record = true){
	var obj = db;
	for(var i=0; i<path.length - 1; i++){
		if(obj[path[i]] === undefined){
			obj[path[i]] = {};
		}
		obj = obj[path[i]];
	}
	if(value === null){
		delete obj[path[i]];
	}
	else{
		obj[path[i]] = value;
	}
	if(record){
		saveStream.write(JSON.stringify([path, value]) + "\n");
	}
}

function dbGet(path){
	var obj = db;
	for(var i=0; i<path.length; i++){
		if(obj[path[i]] === undefined){
			return null;
		}
		obj = obj[path[i]];
	}
	return obj;
}

function hexToRGB(hex){
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function colorDistance(v1, v2){
	var r = (v1[0]-v2[0] < 0 ? (v1[0]-v2[0])*-1 : v1[0]-v2[0]);
	var g = (v1[1]-v2[1] < 0 ? (v1[1]-v2[1])*-1 : v1[1]-v2[1]);
	var b = (v1[2]-v2[2] < 0 ? (v1[2]-v2[2])*-1 : v1[2]-v2[2]);
	return (r+g+b)/765;
}

function objMin(obj){
	var val = Infinity;
	var index = null;
	for(var i in obj){
		if(obj[i] < val){
			val = obj[i];
			index = i;
		}
	}
	return index;
}

function objMax(obj){
	var val = 0;
	var index = null;
	for(var i in obj){
		if(obj[i] > val){
			val = obj[i];
			index = i;
		}
	}
	return index;
}

function getThemeColor(img, colors){
	return new Promise(async resolve => {
		try{
			var image = await Jimp.read(img);
			var colorArray = Object.keys(colors);
			var rgbColors = Object.keys(colors).map(v => hexToRGB(v));
			var finalColors = {};
			for(var y=1; y<10; y++){
				for(var x=1; x<10; x++){
					var rgb1 = Jimp.intToRGBA(image.getPixelColor(x / 10 * (image.bitmap.width - 1), y / 10 * (image.bitmap.height - 1)));
					var scores = {};
					for(var i in rgbColors){
						var rgb2 = rgbColors[i];
						scores[i] = colorDistance([rgb1.r, rgb1.g, rgb1.b], [rgb2.r, rgb2.g, rgb2.b]);
					}
					var finalIndex = colorArray[objMin(scores)];
					if(!finalColors[finalIndex]){
						finalColors[finalIndex] = 0;
					}
					finalColors[finalIndex] += colors[finalIndex];
				}
			}
			resolve(objMax(finalColors));
		}
		catch(err){
			resolve(null);
		}
	});
}

function duckduckgoSearch(query){
	return new Promise(async resolve => {
		try{
			var data = await fetch("https://api.duckduckgo.com/?q=" + encodeURIComponent(query) + "&format=json");
			resolve(data.json());
		}
		catch(err){
			resolve(null);
		}
	});
}

function getServerSetting(guild, setting){
	return guild ? dbGet(["guilds", guild.id, "config", setting]) : null;
}

function cleanMessage(text){
	return text.replace(/@everyone/g, "@every1").replace(/@here/g, "@her3")
}

function getAllComponents(component){
	var components = [component];
	if(component.components){
		for(var i=0; i<component.components.length; i++){
			var thisComponent = component.components[i];
			components.push(...getAllComponents(thisComponent));
		}
	}
	return components;
}

function googleImageSearch(query){
	return new Promise(async (resolve, reject) => {
		gis(query, async (error, results) => {
			if(error){
				reject(error);
				return;
			}
			else{
				resolve(results);
				return;
			}
		});
	});
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function makeErrorEmbed(text){
	var embed = new Discord.MessageEmbed();
	embed.setColor(config.errorEmbedColor);
	embed.setTitle("Error");
	embed.setDescription(text);
	return embed;
}

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

// https://stackoverflow.com/a/3177838
function timeInterval(ms) {
	var seconds = Math.floor(Math.abs(ms) / 1000);
	var times = [
		[31536000, "year"],
		[2592000, "month"],
		[86400, "day"],
		[3600, "hour"],
		[60, "minute"],
		[1, "second"]
	];
	var text = [];
	for(var i=0; i<times.length; i++){
		var interval = seconds / times[i][0];
		var time = Math.floor(interval);
		if(interval >= 1) {
			text.push(time + " " + times[i][1] + (time == 1 ? "" : "s"));
		}
		seconds -= time * times[i][0];
	}
	return text.length == 0 ? "0 seconds" : text.join(" ");
}

function guildCheck(id){
	var serverConfig = dbGet(["guilds", id, "config"]);
	var knownConfigs = dbGet(["knownConfigs"]) || [];
	for(var i in config.serverConfigs){
		var setting = config.serverConfigs[i];
		if(setting.default !== undefined && (serverConfig === null || knownConfigs[i] !== 1)){
			dbSet(["guilds", id, "config", i], setting.default);
		}
	}
}
