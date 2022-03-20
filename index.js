console.log("Loading packages");
const dotenv = require('dotenv');
dotenv.config({ path: '.envi' });
const Discord = require('discord.js');
const { Client, Intents } = Discord;
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const fs = require("fs");
const Fuse = require("fuse.js");
const Jimp = require('jimp');
const knowledge = require('knowledge-graph-js');
var gis = require('g-i-s');
const googlethis = require('googlethis');
const fetch = require("node-fetch");
const translate = require("@vitalets/google-translate-api");

var commands = [];
var prevFiles = {};
var prevImages = {};
var db = {};
var prompts = {};
const SyntaxError = "Syntax error";
const Error = "error";

if(!fs.existsSync("db")){
	fs.mkdirSync("db");
}

console.log("Loading scripts");
var config = eval(fs.readFileSync("config.js").toString());
if(process.env.PREFIX !== undefined){
	config.prefix = process.env.PREFIX;
}
eval(fs.readFileSync("classes.js").toString());
eval(fs.readFileSync("functions.js").toString());
eval(fs.readFileSync("userFunctions.js").toString());
commands = eval(fs.readFileSync("commands.js").toString());
var commandNameList = [];
for(var i=0; i<commands.length; i++){
	commandNameList.push(...(commands[i].name));
}
var fuzzyCommandSearch = new Fuse(commandNameList, {includeScore: true});

if(fs.existsSync("db/database.json")){
	console.log("Loading database");
	db = JSON.parse(fs.readFileSync("db/database.json").toString());
}
if(fs.existsSync("db/lastchanges.txt")){
	console.log("Applying last changes to the database");
	var lastChanges = fs.readFileSync("db/lastchanges.txt").toString().split("\n");
	if(lastChanges.length > 1){
		for(var i=0; i<lastChanges.length - 1; i++){
			var change = JSON.parse(lastChanges[i]);
			dbSet(change[0], change[1], false);
		}
		fs.writeFileSync("db/database_tmp.json", JSON.stringify(db));
		fs.renameSync("db/database_tmp.json", "db/database.json");
	}
	else{
		console.log("Nevermind, there are no changes to apply...");
	}
	fs.unlinkSync("db/lastchanges.txt");
}
var saveStream = fs.createWriteStream("db/lastchanges.txt", {
	'flags': 'a',
	'encoding': null,
	'mode': 0666
});

console.log("Logging into Discord");

client.on("ready", () => {
	console.log("Logged in as " + client.user.tag);
	if(dbGet(["lastWpRemovalTime"]) === null){
		dbSet(["lastWpRemovalTime"], Math.floor((new Date().getTime()) / 3600000) * 3600000);
	}
	var warnAutoRemove = function(){
		var lastWpRemovalTime = dbGet(["lastWpRemovalTime"]);
		var currHour = Math.floor((new Date().getTime()) / 3600000) * 3600000;
		var hours = Math.round((currHour - lastWpRemovalTime) / 3600000);
		if(hours <= 0)
			return;
		dbSet(["lastWpRemovalTime"], currHour);
		var guilds = dbGet(["guilds"]);
		if(guilds === null)
			return;
		console.log("Updating warnpoint amounts, do not stop this program's execution until this is done");
		var amount = 0;
		for(var i in guilds){
			var guild = guilds[i];
			var members = guild.members;
			if(members === undefined || guild.config === undefined || guild.config.WarnAutoRemove === undefined)
				continue;
			var remove = Number(guild.config.WarnAutoRemove) * hours;
			for(var j in members){
				var member = guild.members[j];
				var wp = member.wp;
				if(wp === undefined)
					continue;
				setWarnpoints({user: {id: j}, guild: {id: i}}, Number(wp) - remove);
				amount++;
			}
		}
		console.log("Done, updated " + amount + " member" + (amount == 1 ? "" : "s"));
	};
	warnAutoRemove();
	setInterval(warnAutoRemove, 60 * 1000);
	console.log("Checking servers' configs");
	var guilds = [...client.guilds.cache.keys()];
	for(var i=0; i<guilds.length; i++){
		guildCheck(guilds[i]);
	}
	for(var i in config.serverConfigs){
		if(dbGet(["knownConfigs", i]) === null){
			dbSet(["knownConfigs", i], 1);
		}
	}
	console.log("Done");
	console.log("Ready");
	onReady();
});

client.on("guildCreate", guild => {
	guildCheck(guild.id);
});

client.on("messageCreate", async msg => {
	if(prompts[msg.channel.id + "_" + msg.author.id] !== undefined){
		prompts[msg.channel.id + "_" + msg.author.id].callback(msg.content);
		delete prompts[msg.channel.id + "_" + msg.author.id];
	}
	else{
		await processMessage(msg);
	}
	onMessage(msg);
});

function processMessage(msg){
	return new Promise(async resolve => {
		var prefix = getServerSetting(msg.guild, "Prefix") || config.prefix;
		var fileContent = msg.content + (msg.attachments.size > 0 ? " " + [...msg.attachments.values()].map(v => v.attachment).join(" ") : "") + (msg.embeds.length > 0 ? " " + msg.embeds.map(v => (v.image !== null && v.image.url !== null ? v.image.url : "")).join(" ") : "");
		var files = fileContent.match(/\S+:\/\/\S+\/\S+\.[a-z]+([?#]\S+)?/gi);
		var images = fileContent.match(/\S+:\/\/\S+\.(png|jpe?g|webp|gif)([?#]\S+)?/gi);
		if(files !== null){
			if(prevFiles[msg.channel.id] === undefined){
				prevFiles[msg.channel.id] = [];
			}
			prevFiles[msg.channel.id].push(...(files).map(v => ({msg: msg, url: v})));
			if(prevFiles[msg.channel.id].length > 10){
				prevFiles[msg.channel.id] = prevFiles[msg.channel.id].slice(prevFiles[msg.channel.id].length - 10);
			}
		}
		if(images !== null){
			if(prevImages[msg.channel.id] === undefined){
				prevImages[msg.channel.id] = [];
			}
			prevImages[msg.channel.id].push(...(images).map(v => ({msg: msg, url: v})));
			if(prevImages[msg.channel.id].length > 10){
				prevImages[msg.channel.id] = prevImages[msg.channel.id].slice(prevImages[msg.channel.id].length - 10);
			}
		}
		if(!(!msg.author.bot && msg.content.slice(0, prefix.length).toLowerCase() == prefix)){
			resolve(null);
			return;
		}
		var args = msg.content.slice(prefix.length).split(" ");
		if(args[0] === ""){
			args.splice(0, 1);
		}
		await asyncWait(0.05);
		var command = getCommandByName(args[0]);
		if(command === null){
			var found = fuzzyCommandSearch.search(args[0].toLowerCase());
			var embed = new Discord.MessageEmbed();
			embed.setColor(config.defaultEmbedColor);
			embed.setTitle("Command not found");
			if(found.length > 0){
				if(found.length > 5){
					found = found.slice(0, 5);
				}
				embed.addField("Did you mean...", found.map(v => prefix + v.item).join("\n"));
			}
			var answer = new Answer({embeds: [embed]});
			await answer.send(msg.channel);
			resolve(null);
			return;
		}
		try{
			var msgText = args.slice(1).join(" ");
			var data = {msg: msg, args: args, msgText: msgText, prefix: prefix};
			var answer = await command.func(data);
			if(answer === SyntaxError){
				var embed = makeCommandEmbed(args[0], prefix);
				embed.setColor(config.defaultEmbedColor);
				answer = new Answer({embeds: [embed]});
			}
			if(answer.type == "none"){
				resolve(null);
				return;
			}
			await answer.send(msg.channel);
		}
		catch(err){
			console.log(err);
		}
		resolve(null);
	});
}

function asyncWait(seconds){
	return new Promise((resolve) => {
		setTimeout(resolve, seconds * 1000);
	});
}

client.login(process.env.DISCORD_TOKEN);
