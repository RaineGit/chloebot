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

function getGuildIcon(guild, size = 1024, format = "webp"){
	return guild.iconURL({size: size, format: format, dynamic: true});
}

function getBanner(user, size = 2048, format = "png"){
	try{
		return user.bannerURL({size: size, format: format, dynamic: true});
	}
	catch(err){
		return null;
	}
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

// https://stackoverflow.com/a/3177838
function timeInterval(ms, max = -1) {
	var seconds = Math.floor(Math.abs(ms) / 1000);
	var times = [
		[31536000, "year"],
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
		if(text.length == max)
			break;
	}
	return text.length == 0 ? "0 seconds" : text.join(" ");
}

function prompt(channel, user, cb){
	prompts[channel.id + "_" + user.id] = {callback: cb};
}

function setPresence(p){
	var presence = mods.main.vars.presence;
	presence = p;
	return new Promise(async resolve => {
		resolve(await client.user.setPresence(presence || {activities: [], status: "online"}));
	});
}

function getWebhook(channel){
	return new Promise(async (resolve, reject) => {
		try {
			var webhooks = (await channel.fetchWebhooks()).toJSON();
			var webhook = undefined;
			for(var i in webhooks){
				if(["MC41Bot Webhook", "Chloe Webhook"].includes(webhooks[i].name)){
					webhook = webhooks[i];
					break;
				}
			}
			if(webhook !== undefined)
				resolve(webhook);
			else{
				resolve(await channel.createWebhook("Chloe Webhook", {
					avatar: client.user.avatarURL(),
				}));
			}
		}
		catch(err){
			reject(err);
		}
	});
}