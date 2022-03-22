[
	{
		name: ["ping"],
		cat: "misc",
		desc: "Check if I am online and working",
		func: function(){
			return new Answer("pong");
		}
	},
	{
		name: ["pong"],
		desc: "Check if I am online and working",
		nohelp: true,
		func: function(){
			return new Answer("ping");
		}
	},
	{
		name: ["run"],
		args: "[code]",
		desc: "Run javascript code",
		nohelp: true,
		func: function(d){
			return new Promise(async resolve => {
				if(d.msg.author.id !== config.owner){
					return new Answer("Only my owner can run this command", Error);
				}
				if(d.msgText.length == 0){
					return SyntaxError;
				}
				eval("var evalAsync = async function(){" + d.msgText + "}");
				var result = await evalAsync();
				if(result !== undefined){
					resolve(new Answer(typeof(result) == "object" ? "```json\n" + JSON.stringify(result, null, 2) + "```" : result.toString()));
				}
				else{
					resolve(new Answer("Ok"));
				}
			});
		}
	},
	{
		name: ["dbget"],
		args: "[path]",
		nohelp: true,
		func: function(d){
			if(d.msg.author.id !== config.owner){
				return new Answer("Only my owner can run this command", Error);
			}
			var path = d.msgText.length == 0 ? [] : d.msgText.split("/");
			var data = path.length == 0 ? db : dbGet(path);
			return new Answer(typeof(data) == "object" ? "```json\n" + JSON.stringify(data, null, 2) + "```" : data.toString());
		}
	},
	{
		name: ["help"],
		args: "<command>",
		cat: "informational",
		desc: "Find out what commands I have or get information about a command",
		func: function(d){
			if(d.args[1] === undefined){
				var showCategory = function(category, interaction, reply){
					var embed = new Discord.MessageEmbed();
					embed.setColor(config.defaultEmbedColor);
					embed.setTitle(category[0].toUpperCase() + category.slice(1) + " commands");
					embed.setDescription("[] = Required field\n<> = Optional field");
					for(var i=0; i<commands.length; i++){
						var command = commands[i];
						if(command.cat != category || command.nohelp){
							continue;
						}
						embed.addField(d.prefix + command.name[0] + (command.args !== undefined ? " " + command.args : ""), (command.desc !== undefined ? command.desc : "No description"));
					}
					reply({embeds: [embed], ephemeral: interaction.user.id != d.msg.author.id});
				};
				var row = new Discord.MessageActionRow();
				for(var i=0; i<config.commandCategories.length; i++){
					var category = config.commandCategories[i];
					var btn = new Discord.MessageButton();
					btn.setCustomId(category);
					btn.setLabel(category[0].toUpperCase() + category.slice(1));
					btn.setStyle('SECONDARY');
					btn.callback = function(d2){
						showCategory(d2.interaction.customId, d2.interaction, d2.reply);
					};
					row.addComponents(btn);
				}
				return new Answer({content: "Choose a category", components: [row]},
					{components: {owner: "anyone", time: 120_000}});
			}
			else{
				var embed = makeCommandEmbed(d.args[1], d.prefix);
				if(embed === null){
					return new Answer("The command `" + d.args[1] + "` doesn't exist", Error);
				}
				else{
					embed.setColor(config.defaultEmbedColor);
					return new Answer({embeds: [embed]});
				}
			}
		}
	},
	{
		name: ["ask"],
		args: "[question]",
		cat: "informational",
		desc: "Ask a question",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			return new Promise(async resolve => {
				d.msg.channel.sendTyping();
				var answeredBy = "";
				var answer = null;
				try{
					answer = await knowledge.wolfram.search(d.msgText);
					answeredBy = "Wolfram";
				}
				catch(err){}
				var googleSearch = {};
				if(answer === null){
					try{
						const searchOptions = {
							page: 0,
							safe: true,
							additional_params: {
								hl: 'en_us'
							}
						};
						googleSearch = await googlethis.search(d.msgText, searchOptions);
						if(googleSearch.knowledge_panel.description != "N/A"){
							answer = googleSearch.knowledge_panel.description;
							answeredBy = "Google";
						}
					}
					catch(err){}
				}
				if(answer === null){
					try{
						answer = await duckduckgoSearch(d.msgText);
						if(answer)
							answer = answer.AbstractText.length > 0 ? answer.AbstractText : null;
						answeredBy = "DuckDuckGo";
					}
					catch(err){}
				}
				if(answer === null){
					try{
						if(googleSearch.results.length >= 1){
							answer = googleSearch.results[0].description + "\n" + googleSearch.results[0].url;
							answeredBy = "Google";
						}
					}
					catch(err){}
				}
				var embed = new Discord.MessageEmbed();
				embed.setColor(config.defaultEmbedColor);
				embed.setTitle(d.msgText[0].toUpperCase() + d.msgText.slice(1));
				if(answer !== null){
					embed.setDescription(answer.toString());
					embed.setFooter({text: "Answered by " + answeredBy});
				}
				else{
					embed.setDescription("Couldn't find an answer");
				}
				resolve(new Answer({embeds: [embed]}));
			});
		}
	},
	{
		name: ["google", "search"],
		args: "[query]",
		cat: "informational",
		desc: "Search in Google",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			return new Promise(async resolve => {
				d.msg.channel.sendTyping();
				const searchOptions = {
					page: 0,
					safe: true,
					additional_params: {
						hl: 'en_us'
					}
				};
				var results = [];
				try{
					results = (await googlethis.search(d.msgText, searchOptions)).results;
				}
				catch(err){
					resolve(new Answer("An error happened while searching on Google", Error));
					return;
				}
				if(results.length == 0){
					resolve(new Answer("No results", Error));
					return;
				}
				var index = 0;
				var embed = new Discord.MessageEmbed();
				embed.setColor(config.defaultEmbedColor);
				embed.setTitle("Google results for \"" + d.msgText + "\"");
				var updateEmbed = function(){
					embed.fields = [];
					embed.setDescription("Showing results " + (index + 1) + " to " + ((index + 3) > results.length ? results.length : (index + 3)) + ", out of " + results.length)
					for(var i=index; i<index+3; i++){
						var result = results[i];
						if(result === undefined)
							continue;
						embed.addField(result.title, result.url + "\n" + result.description);
					}
				};
				updateEmbed();
				var row = new Discord.MessageActionRow();
				var btn = new Discord.MessageButton();
				btn.setCustomId('left');
				btn.setEmoji("950535992639631401");
				btn.setStyle('SECONDARY');
				btn.callback = function(d2){
					index -= 3;
					if(index < 0)
						index = Math.ceil(results.length / 3) * 3 - 3;
					updateEmbed();
					d2.update({embeds: [embed]});
				};
				row.addComponents(btn);
				var btn = new Discord.MessageButton();
				btn.setCustomId('right');
				btn.setEmoji('950535993172295750');
				btn.setStyle('SECONDARY');
				btn.callback = function(d2){
					index += 3;
					if(index >= results.length)
						index = 0;
					updateEmbed();
					d2.update({embeds: [embed]});
				};
				row.addComponents(btn);
				resolve(new Answer({embeds: [embed], components: [row]},
					{components: {owner: "anyone", time: 120_000}}));
			});
		}
	},
	{
		name: ["img", "image"],
		args: "[query]",
		cat: "informational",
		desc: "Search in Google Images",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			return new Promise(async resolve => {
				d.msg.channel.sendTyping();
				var results = [];
				try{
					results = await googleImageSearch(d.msgText);
				}
				catch(err){
					resolve(new Answer("An error happened while looking for the images on Google Images", Error));
					return;
				}
				if(results.length == 0){
					resolve(new Answer("No results", Error));
					return;
				}
				var index = 0;
				var embed = new Discord.MessageEmbed();
				embed.setColor(config.defaultEmbedColor);
				embed.setTitle("\"" + d.msgText + "\" in Google Images");
				var updateEmbed = function(){
					embed.setDescription("Image " + (index + 1) + " out of " + results.length);
					embed.setImage(results[index].url);
				}
				updateEmbed();
				var row = new Discord.MessageActionRow();
				var btn = new Discord.MessageButton();
				btn.setCustomId('left');
				btn.setEmoji("950535992639631401");
				btn.setStyle('SECONDARY');
				btn.callback = function(d2){
					index--;
					if(index < 0)
						index = results.length - 1;
					updateEmbed();
					d2.update({embeds: [embed]});
				};
				row.addComponents(btn);
				var btn = new Discord.MessageButton();
				btn.setCustomId('right');
				btn.setEmoji('950535993172295750');
				btn.setStyle('SECONDARY');
				btn.callback = function(d2){
					index++;
					if(index >= results.length)
						index = 0;
					updateEmbed();
					d2.update({embeds: [embed]});
				};
				row.addComponents(btn);
				resolve(new Answer({embeds: [embed], components: [row]},
					{components: {owner: "anyone", time: 120_000}}));
			});
		}
	},
	{
		name: ["tr", "translate"],
		args: "[text]",
		cat: "informational",
		desc: "Translate text",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			d.msg.channel.sendTyping();
			return new Promise(async resolve => {
				var targetLang = d.targetLang || 'en';
				var t = null;
				try{
					t = await translate(d.msgText, {from: d.sourceLang, to: targetLang});
				}
				catch(err){
					if(err.code == 400)
						resolve(new Answer(targetLang.toUpperCase() + " may not be a valid language", Error));
					else
						resolve(new Answer("An unknown error has happened", Error));
					return;
				}
				var row = new Discord.MessageActionRow();
				var btn = new Discord.MessageButton();
				btn.setCustomId('set_source');
				btn.setLabel("Set source language");
				btn.setStyle('SECONDARY');
				btn.callback = async function(d2){
					await d2.reply("What language should the source language be?");
					prompt(d.msg.channel, d.msg.author, async function(ans){
						(await getCommandByName("translate").func({...d, sourceLang: ans.toLowerCase()})).send(d.msg.channel);
					});
				};
				row.addComponents(btn);
				var btn = new Discord.MessageButton();
				btn.setCustomId('set_target');
				btn.setLabel("Set target language");
				btn.setStyle('SECONDARY');
				btn.callback = async function(d2){
					await d2.reply("What language should the target language be?");
					prompt(d.msg.channel, d.msg.author, async function(ans){
						(await getCommandByName("translate").func({...d, targetLang: ans.toLowerCase()})).send(d.msg.channel);
					});
				};
				row.addComponents(btn);
				var embed = new Discord.MessageEmbed();
				embed.setColor(config.defaultEmbedColor);
				embed.setTitle("Translated from " + t.from.language.iso.toUpperCase() + " to " + targetLang.toUpperCase());
				embed.addField(t.from.language.iso.toUpperCase(), t.from.text.autoCorrected ? t.from.text.value : d.msgText);
				embed.addField(targetLang.toUpperCase(), t.text);
				resolve(new Answer({embeds: [embed], components: [row]},
					{components: {owner: d.msg.author, time: 60_000}}));
			});
		}
	},
	{
		name: ["info", "user", "channel", "server", "guild"],
		args: "<mention or channel or guild id>",
		cat: "informational",
		desc: "Fetch information about a user, channel or guild",
		func: function(d){
			return new Promise(async resolve => {
				var what = d.args[0].toLowerCase();
				if(what == "server")
					what = "guild";
				var user = null;
				if(what == "user" || what == "info")
					user = d.msgText.length == 0 ? d.msg.author : await getUser(d.msgText);
				if(what == "user" && user == null){
					resolve(new Answer("User not found", Error));
					return;
				}
				if(what == "info" && user != null)
					what = "";
				var channel = null;
				if(what == "channel" || what == "info")
					channel = d.msgText.length == 0 ? d.msg.channel : await getChannel(d.msgText);
				if(what == "channel" && channel == null){
					resolve(new Answer("Channel not found", Error));
					return;
				}
				if(what == "info" && channel != null)
					what = "";
				var guild = null;
				if(what == "guild" || what == "info"){
					try{
						guild = d.msgText.length == 0 ? d.msg.guild : await client.guilds.fetch(d.msgText);
					}
					catch(err){
						guild = null;
					}
					if(guild !== null && !guild.available){
						resolve(new Answer("That guild is under an outage right now", Error));
						return;
					}
				}
				if(what == "guild" && guild == null){
					resolve(new Answer("I am not in that guild", Error));
					return;
				}
				if(what == "info" && guild != null)
					what = "";
				var embed = new Discord.MessageEmbed();
				if(user !== null){
					var member = await getMember(user, d.msg.guild);
					embed.setColor((await getThemeColor(getAvatar(user, 64, "png"), config.defaultThemeColors)) || config.defaultEmbedColor);
					embed.setTitle(user.tag);
					embed.setThumbnail(getAvatar(user, 128, "png"));
					embed.addField("User creation date", timeInterval(new Date().getTime() - user.createdTimestamp, 2) + " ago\n<t:" + Math.floor(user.createdTimestamp / 1000) + ">");
					if(member !== null){
						embed.addField("Server join date", timeInterval(new Date().getTime() - member.joinedTimestamp, 2) + " ago\n<t:" + Math.floor(member.joinedTimestamp / 1000) + ">");
					}
					embed.addField("User ID", user.id);
				}
				else if(channel !== null){
					embed.setColor(config.defaultEmbedColor);
					embed.setTitle("#" + channel.name);
					embed.addField("Channel creation date", timeInterval(new Date().getTime() - channel.createdTimestamp, 2) + " ago\n<t:" + Math.floor(channel.createdTimestamp / 1000) + ">");
					embed.addField("Channel type", channel.type);
					embed.addField("Server/Guild", channel.guild.name);
					embed.addField("Server/Guild ID", channel.guild.id);
					embed.addField("Channel ID", channel.id);
				}
				else if(guild !== null){
					if(guild.icon){
						embed.setColor(await getThemeColor(getGuildIcon(guild, 64, "png"), config.defaultThemeColors));
						embed.setThumbnail(getGuildIcon(guild, 128, "png"));
					}
					else
						embed.setColor(config.defaultEmbedColor);
					embed.setTitle(guild.name);
					if(guild.description)
						embed.addField("Description", guild.description);
					embed.addField("Guild creation date", timeInterval(new Date().getTime() - guild.createdTimestamp, 2) + " ago\n<t:" + Math.floor(guild.createdTimestamp / 1000) + ">");
					embed.addField("Member count", guild.memberCount.toString());
					embed.addField("Channel count", guild.channels.cache.size.toString());
					embed.addField("Verified?", guild.verified ? "Yes" : "No");
					embed.addField("Owner", (await guild.fetchOwner()).user.tag);
					embed.addField("Owner's user ID", guild.ownerId);
					embed.addField("Guild ID", guild.id);
				}
				else{
					resolve(new Answer("I couldn't find whatever it is that you were trying to find", Error));
					return;
				}
				resolve(new Answer({embeds: [embed]}));
			});
		}
	},
	{
		name: ["del", "getdel", "snipe"],
		cat: "informational",
		desc: "See the latest deleted messages",
		func: function(d){
			var embeds = [];
			var msgs = deletedMsgs[d.msg.channel.id] || [];
			if(msgs.length == 0)
				return new Answer("No messages have been deleted in the last " + timeInterval(new Date().getTime() - client.readyTimestamp));
			for(var i=0; i<msgs.length; i++){
				var msg = msgs[i];
				var embed = new Discord.MessageEmbed();
				embed.setColor(config.defaultEmbedColor);
				embed.setAuthor({name: msg.author.tag, iconURL: msg.author.avatar});
				embed.setDescription("Posted " + timeInterval((new Date().getTime()) - msg.postTime, 3) + " ago\nDeleted " + timeInterval((new Date().getTime()) - msg.time, 3) + " ago");
				if(msg.content.length > 0)
					embed.addField("Content", msg.content);
				if(msg.attachments.length > 0)
					embed.addField("Attachments", msg.attachments.join("\n"));
				if(msg.embed)
					embed.addField("Has embed?", "Yes");
				embed.setFooter({text: "User ID: " + msg.author.id});
				embeds.push(embed);
			}
			return new Answer({content: "Last " + msgs.length + " deleted messages in this channel", embeds: embeds});
		}
	},
	{
		name: ["pfp", "avatar"],
		args: "<mention>",
		cat: "informational",
		desc: "Fetch a user's profile picture",
		func: function(d){
			return new Promise(async resolve => {
				var user = d.msgText.length == 0 ? await client.users.fetch(d.msg.author.id) : await getUser(d.msgText);
				if(user == null){
					resolve(new Answer("User not found", Error));
					return;
				}
				var avatar = getAvatar(user, 4096, "png");
				var embed = new Discord.MessageEmbed();
				embed.setColor((await getThemeColor(getAvatar(user, 64, "png"), config.defaultThemeColors)) || config.defaultEmbedColor);
				embed.setTitle(user.username + "'s profile picture");
				embed.setDescription("[Open in browser](" + avatar + ")");
				embed.setImage(avatar);
				resolve(new Answer({embeds: [embed]}));
			});
		}
	},
	{
		name: ["banner"],
		args: "<mention>",
		cat: "informational",
		desc: "Fetch a user's banner",
		func: function(d){
			return new Promise(async resolve => {
				var user = d.msgText.length == 0 ? await client.users.fetch(d.msg.author.id, {force: true}) : await getUser(d.msgText, true);
				if(user == null){
					resolve(new Answer("User not found", Error));
					return;
				}
				var banner = getBanner(user, 4096, "png");
				if(banner === null){
					resolve(new Answer(user.username + " does not have a banner", Error));
					return;
				}
				var embed = new Discord.MessageEmbed();
				embed.setColor((await getThemeColor(getBanner(user, 64, "png"), config.defaultThemeColors)) || config.defaultEmbedColor);
				embed.setTitle(user.username + "'s banner");
				embed.setDescription("[Open in browser](" + banner + ")");
				embed.setImage(banner);
				resolve(new Answer({embeds: [embed]}));
			});
		}
	},
	{
		name: ["servers", "guilds"],
		cat: "informational",
		desc: "Check how many servers I am in",
		func: function(){
			return new Answer("I am in " + client.guilds.cache.size + " servers");
		}
	},
	{
		name: ["invite"],
		cat: "misc",
		desc: "Invite me to other servers",
		func: function(){
			return new Answer("Thanks!\n> " + config.invite);
		}
	},
	{
		name: ["say", "send"],
		args: "[text]",
		cat: "misc",
		desc: "Make me say stuff",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			return new Answer(d.msgText);
		}
	},
	{
		name: ["note"],
		args: "[text or \"off\"]",
		cat: "misc",
		desc: "Set or disable your note",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			var note = null;
			if(d.msgText.toLowerCase() != "off"){
				note = d.msgText;
			}
			dbSet(["users", d.msg.author.id, "note"], note);
			if(note === null){
				return new Answer("Your note has been disabled");
			}
			else{
				return new Answer("Your note has been set to\n> " + note + "\nWhenever someone pings you, your note will be shown\nYou can disable it with `" + d.prefix + "note off`");
			}
		}
	},
	{
		name: ["config"],
		args: "<setting> <value or \"off\">",
		cat: "moderation",
		desc: "See and modify my configs in this server",
		func: function(d){
			var reqConf = null;
			if(d.args.length >= 2){
				var keys = Object.keys(config.serverConfigs);
				var index = keys.map(v => v.toLowerCase()).indexOf(d.args[1].toLowerCase());
				if(index == -1){
					return new Answer("The setting \"" + d.args[1] + "\" isn't available\nRun `" + d.prefix + "config` to see the available settings", Error);
				}
				reqConf = keys[index];
			}
			if(d.args.length <= 2){
				var servConf = dbGet(["guilds", d.msg.guild.id, "config"]) || {};
				var embed = new Discord.MessageEmbed();
				embed.setColor(config.defaultEmbedColor);
				embed.setTitle("Server Config" + (reqConf !== null ? " > " + reqConf : ""));
				var row = new Discord.MessageActionRow();
				var btn = new Discord.MessageButton();
				btn.setCustomId('help');
				btn.setLabel("How to modify the configs");
				btn.setStyle('SECONDARY');
				btn.callback = function(d2){
					var embed = new Discord.MessageEmbed();
					embed.setColor(config.defaultEmbedColor);
					embed.setTitle("How to modify the configs - Examples");
					embed.addField("Changing prefix to +", "`" + d.prefix + "config prefix +`");
					embed.addField("Changing WarnAutoRemove to 0.2", "`" + d.prefix + "config warnautoremove 0.2`");
					embed.addField("Disabling custom prefix", "`" + d.prefix + "config prefix off`\n(The default prefix is `" + config.prefix + "`)");
					d2.reply({embeds: [embed], ephemeral: true});
				};
				row.addComponents(btn);
				for(var i in config.serverConfigs){
					if(reqConf !== null && i != reqConf){
						continue;
					}
					var type = config.serverConfigs[i].type;
					var desc = config.serverConfigs[i].desc;
					var value = "";
					if(type == "text"){
						value = servConf[i] !== undefined ? "`" + servConf[i] + "`" : "off";
					}
					else if(type == "number"){
						value = servConf[i] !== undefined ? servConf[i].toString() : "off";
					}
					else if(type == "channel"){
						value = servConf[i] !== undefined ? "<#" + servConf[i] + ">" : "off";
					}
					embed.addField(i, "Value: " + value + "\nDescription: " + (desc || "None"));
				}
				return new Answer({embeds: [embed], components: [row]},
					{components: {owner: "anyone", time: 60_000}});
			}
			else{
				if(!d.msg.member.permissions.has("MANAGE_GUILD")){
					return new Answer("Only members with the \"Manage Server\" permission can do this", Error);
				}
				return new Promise(async resolve => {
					var value = d.args.slice(2).join(" ");
					var newValue = null;
					var type = config.serverConfigs[reqConf].type;
					if(value.toLowerCase() != "off"){
						if(type == "text"){
							dbSet(["guilds", d.msg.guild.id, "config", reqConf], value);
							newValue = "`" + value + "`";
						}
						else if(type == "number"){
							if(isNaN(value)){
								resolve(new Answer("The value must be a number", Error));
								return;
							}
							if(config.serverConfigs[reqConf].onlyPositive && Number(value) < 0){
								resolve(new Answer("The value must be a positive number", Error));
								return;
							}
							dbSet(["guilds", d.msg.guild.id, "config", reqConf], Number(value));
							newValue = Number(value).toString();
						}
						else if(type == "channel"){
							var channel = await getChannel(value);
							if(channel === null){
								resolve(new Answer("Invalid channel", Error));
								return;
							}
							if(channel.guild.id != d.msg.guild.id){
								resolve(new Answer("The channel must be in this server", Error));
								return;
							}
							dbSet(["guilds", d.msg.guild.id, "config", reqConf], channel.id);
							newValue = "<#" + channel.id + ">";
						}
					}
					else{
						dbSet(["guilds", d.msg.guild.id, "config", reqConf], null);
						newValue = "off";
					}
					resolve(new Answer(reqConf + "'s value is now " + newValue));
				});
			}
		}
	},
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
	},
	{
		name: ["requests"],
		cat: "family",
		desc: "Show incoming requests pending to answer",
		func: function(d){
			var request = dbGet(["users", d.msg.author.id, "request"]);
			if(request === null){
				return new Answer("You have no requests pending to answer");
			}
			return new Promise(async resolve => {
				var embed = new Discord.MessageEmbed();
				embed.setColor(config.defaultEmbedColor);
				embed.setTitle("Incoming requests");
				if(request.type == "marry" || request.type == "adopt"){
					embed.addField("Type", request.type[0].toUpperCase() + request.type.slice(1));
					embed.addField("From", (await getUser(request.from)).tag);
					embed.addField("Reception time", timeInterval(new Date().getTime() - request.date) + " ago");
					embed.addField("Available answers", "`" + d.prefix + "accept`\n`" + d.prefix + "reject`");
				}
				resolve(new Answer({embeds: [embed]}));
			});
		}
	},
	{
		name: ["family", "finfo"],
		args: "<mention>",
		cat: "family",
		desc: "See someone's family",
		func: function(d){
			return new Promise(async resolve => {
				var user = d.msgText.length == 0 ? await client.users.fetch(d.msg.author.id) : await getUser(d.msgText);
				var partner = dbGet(["users", user.id, "family", "partner"]);
				var parent = dbGet(["users", user.id, "family", "parent"]);
				var parent2 = parent !== null ? dbGet(["users", parent, "family", "partner"]) : null;
				var children = Object.keys(dbGet(["users", user.id, "family", "children"]) || {}).concat(Object.keys(dbGet(["users", partner, "family", "children"]) || {}));
				if(partner !== null || parent !== null || children.length > 0){
					await d.msg.channel.sendTyping();
				}
				var partnerUser = partner !== null ? await client.users.fetch(partner) : null;
				var parentUser = parent !== null ? await client.users.fetch(parent) : null;
				var parent2User = parent2 !== null ? await client.users.fetch(parent2) : null;
				var childrenUsers = await Promise.all(children.map(v => client.users.fetch(v)));
				var embed = new Discord.MessageEmbed();
				embed.setColor((await getThemeColor(getAvatar(user, 64, "png"), config.defaultThemeColors)) || config.defaultEmbedColor);
				embed.setThumbnail(getAvatar(user, 128, "png"));
				embed.setTitle(user.username + "'s family");
				embed.addField("Parent" + (parent2 !== null || parent === null ? "s" : ""), parent ? parentUser.tag + (parent2 !== null ? "\n" + parent2User.tag : "") : "None");
				embed.addField("Partner", partner ? partnerUser.tag : "No one");
				embed.addField("Children", children.length > 0 ? childrenUsers.map(v => v.tag).join("\n") : "None");
				resolve(new Answer({embeds: [embed]}));
			});
		}
	},
	{
		name: ["partner", "marryinfo"],
		args: "<mention>",
		cat: "family",
		nohelp: true,
		desc: "See someone's partner (legacy command)",
		func: function(d){
			return new Promise(async resolve => {
				var user = d.msgText.length == 0 ? await client.users.fetch(d.msg.author.id) : await getUser(d.msgText);
				var partner = dbGet(["users", user.id, "family", "partner"]);
				if(partner === null){
					resolve(new Answer(user.username + " doesn't have a partner"));
					return;
				}
				var partnerUser = await client.users.fetch(partner);
				var embed = new Discord.MessageEmbed();
				embed.setColor((await getThemeColor(getAvatar(partnerUser, 64, "png"), config.defaultThemeColors)) || config.defaultEmbedColor);
				embed.setThumbnail(getAvatar(partnerUser, 128, "png"));
				embed.setTitle(user.username + "'s partner");
				embed.setDescription(user.username + " is married to " + partnerUser.tag);
				resolve(new Answer({embeds: [embed]}));
			});
		}
	},
	{
		name: ["marry"],
		args: "[mention]",
		cat: "family",
		desc: "Marry someone",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			return new Promise(async resolve => {
				var user = await getUser(d.msgText);
				if(user === null){
					resolve(new Answer("I couldn't find the mentioned user", Error));
					return;
				}
				var partner1 = dbGet(["users", d.msg.author.id, "family", "partner"]);
				var partner2 = dbGet(["users", user.id, "family", "partner"]);
				if(partner1 !== null){
					var p1User = await client.users.fetch(partner1);
					resolve(new Answer("You are already married" + (p1User ? " to `" + p1User.tag + "`" : "") , Error));
					return;
				}
				if(partner2 !== null){
					var p2User = await client.users.fetch(partner2);
					resolve(new Answer(user.username + " is already married" + (p2User ? " to `" + p2User.tag + "`" : "") , Error));
					return;
				}
				if(dbGet(["users", user.id, "request"]) !== null){
					resolve(new Answer(user.username + " has pending requests, they can check them by running the `" + d.prefix + "requests` command", Error));
					return;
				}
				dbSet(["users", user.id, "request"], {
					type: "marry",
					from: d.msg.author.id,
					date: new Date().getTime()
				});
				resolve(new Answer("<@" + user.id + ">\n" + d.msg.author.username + " wants to marry you, will you accept?\n>>> Available answers:\n`" + d.prefix + "accept`\n`" + d.prefix + "reject`"));
			});
		}
	},
	{
		name: ["divorce"],
		cat: "family",
		desc: "Divorce your partner",
		func: function(d){
			return new Promise(async resolve => {
				var partner = dbGet(["users", d.msg.author.id, "family", "partner"]);
				if(partner === null){
					resolve(new Answer("You don't have a partner", Error));
					return;
				}
				dbSet(["users", d.msg.author.id, "family", "partner"], null);
				dbSet(["users", partner, "family", "partner"], null);
				resolve(new Answer("You have divorced <@" + partner + ">"));
			});
		}
	},
	{
		name: ["adopt"],
		args: "[mention]",
		cat: "family",
		desc: "Adopt someone",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			return new Promise(async resolve => {
				var user = await getUser(d.msgText);
				if(user === null){
					resolve(new Answer("I couldn't find the mentioned user", Error));
					return;
				}
				var children = Object.keys(dbGet(["users", d.msg.author.id, "family", "children"]) || {});
				if(children.length >= 10){
					resolve(new Answer("You can't have more than 10 children", Error));
					return;
				}
				var parent = dbGet(["users", user.id, "family", "parent"]);
				if(parent !== null){
					var parentUser = await client.users.fetch(parent);
					resolve(new Answer(user.username + " is already adopted" + (parentUser ? " by `" + parentUser.tag + "`" : "") , Error));
					return;
				}
				if(dbGet(["users", user.id, "request"]) !== null){
					resolve(new Answer(user.username + " has pending requests, they can check them by running the `" + d.prefix + "requests` command", Error));
					return;
				}
				dbSet(["users", user.id, "request"], {
					type: "adopt",
					from: d.msg.author.id,
					date: new Date().getTime()
				});
				resolve(new Answer("<@" + user.id + ">\n" + d.msg.author.username + " wants to adopt you, will you accept?\n>>> Available answers:\n`" + d.prefix + "accept`\n`" + d.prefix + "reject`"));
			});
		}
	},
	{
		name: ["unadopt", "disown"],
		args: "<mention>",
		cat: "family",
		desc: "Leave one of your children",
		func: function(d){
			return new Promise(async resolve => {
				var partner = dbGet(["users", d.msg.author.id, "family", "partner"]);
				var unadopt = function(user){
					if(user === null){
						return new Answer("I couldn't find the user", Error);
					}
					var parent = dbGet(["users", user.id, "family", "parent"]);
					if(!(parent == d.msg.author.id || (partner !== null && parent == partner))){
						return new Answer(user.username + " isn't your child", Error);
					}
					var parent2 = dbGet(["users", d.msg.author.id, "family", "partner"]);
					dbSet(["users", user.id, "family", "parent"], null);
					dbSet(["users", parent, "family", "children", user.id], null);
					return new Answer("You" + (parent2 !== null ? " and <@" + parent2 + ">" : "") + " have left your child (<@" + user.id + ">)");
				};
				if(d.msgText.length > 0){
					resolve(unadopt(await getUser(d.msgText)));
				}
				else{
					var children = Object.keys(dbGet(["users", d.msg.author.id, "family", "children"]) || {}).concat(Object.keys(dbGet(["users", partner, "family", "children"]) || {}));
					if(children.length == 0){
						resolve(new Answer("You have no children", Error));
						return;
					}
					await d.msg.channel.sendTyping();
					var childrenUsers = await Promise.all(children.map(v => client.users.fetch(v)));
					var row = new Discord.MessageActionRow();
					for(var i=0; i<childrenUsers.length; i++){
						var btn = new Discord.MessageButton();
						btn.setCustomId(childrenUsers[i].id);
						btn.setLabel(childrenUsers[i].tag);
						btn.setStyle("SECONDARY");
						btn.callback = async function(d2){
							await d2.answer.disableComponents();
							var answer = unadopt(await client.users.fetch(d2.interaction.customId));
							if(answer.type == Error){
								answer.content = {embeds: [makeErrorEmbed(answer.content)]};
							}
							d2.reply(answer.content);
						};
						row.addComponents(btn);
					}
					resolve(new Answer({content: "Which one of your children do you want to unadopt?", components: [row]},
						{components: {owner: d.msg.author, time: 120_000}}));
				}
			});
		}
	},
	{
		name: ["leave"],
		cat: "family",
		desc: "Leave your parents",
		func: function(d){
			return new Promise(async resolve => {
				var parent = dbGet(["users", d.msg.author.id, "family", "parent"]);
				if(parent === null){
					resolve(new Answer("You have no parents", Error));
					return;
				}
				var parent2 = dbGet(["users", parent, "family", "partner"]);
				dbSet(["users", d.msg.author.id, "family", "parent"], null);
				dbSet(["users", parent, "family", "children", d.msg.author.id], null);
				resolve(new Answer("You have left your parent" + (parent2 !== null ? "s" : "") + " (<@" + parent + ">" + (parent2 !== null ? " and <@" + parent2 + ">" : "") + ")"));
			});
		}
	},
	{
		name: ["accept"],
		nohelp: true,
		desc: "Accept the latest request",
		func: function(d){
			var action = d.args[0].toLowerCase();
			var request = dbGet(["users", d.msg.author.id, "request"]);
			if(request === null){
				return new Answer("You have no requests pending to answer");
			}
			return new Promise(async resolve => {
				if(request.type == "marry"){
					if(action == "accept"){
						var partner1 = dbGet(["users", d.msg.author.id, "family", "partner"]);
						var partner2 = dbGet(["users", request.from, "family", "partner"]);
						if(partner1 !== null){
							var p1User = await client.users.fetch(partner1);
							resolve(new Answer("You are already married" + (p1User ? " to `" + p1User.tag + "`" : "") , Error));
							return;
						}
						if(partner2 !== null){
							var p2User = await client.users.fetch(partner2);
							resolve(new Answer(user.username + " is already married" + (p2User ? " to `" + p2User.tag + "`" : "") , Error));
							return;
						}
						dbSet(["users", d.msg.author.id, "family", "partner"], request.from);
						dbSet(["users", request.from, "family", "partner"], d.msg.author.id);
						dbSet(["users", d.msg.author.id, "request"], null);
						resolve(new Answer("You are now married to <@" + request.from + ">"));
						return;
					}
					if(action == "reject"){
						dbSet(["users", d.msg.author.id, "request"], null);
						resolve(new Answer("You have rejected <@" + request.from + ">'s marriage proposal"));
						return;
					}
				}
				else if(request.type == "adopt"){
					if(action == "accept"){
						var children = Object.keys(dbGet(["users", request.from, "family", "children"]) || {});
						if(children.length >= 10){
							resolve(new Answer("<@" + request.from + "> can't have more than 10 children", Error));
							return;
						}
						var parent = dbGet(["users", d.msg.author.id, "family", "parent"]);
						if(parent !== null){
							var parentUser = await client.users.fetch(parent);
							resolve(new Answer("You are already adopted" + (parentUser ? " by `" + parentUser.tag + "`" : "") , Error));
							return;
						}
						dbSet(["users", request.from, "family", "children", d.msg.author.id], 1);
						dbSet(["users", d.msg.author.id, "family", "parent"], request.from);
						dbSet(["users", d.msg.author.id, "request"], null);
						resolve(new Answer("You have been adopted by <@" + request.from + ">"));
						return;
					}
					if(action == "reject"){
						dbSet(["users", d.msg.author.id, "request"], null);
						resolve(new Answer("You have rejected <@" + request.from + ">'s adoption request"));
						return;
					}
				}
			});
		}
	},
	{
		name: ["reject"],
		nohelp: true,
		desc: "Reject the latest request",
		func: function(d){
			return new Promise(async resolve => {
				resolve(await getCommandByName("accept").func(d));
			});
		}
	},
	{
		name: ["math", "calc"],
		nohelp: true,
		desc: "Do maths",
		func: function(d){
			return new Answer("Use `" + d.prefix + "ask` instead");
		}
	}
]
