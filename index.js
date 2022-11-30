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
var prompts = {};
var mods = {};
var modFunctions = {
	beforeReady: [],
	onReadyPrelude: [],
	onReady: [],
	onMessage: [],
	onMessageDelete: []
};
const SyntaxError = "Syntax error";
const Error = "error";

var config = eval(fs.readFileSync("config.js").toString());
if(process.env.PREFIX !== undefined){
	config.prefix = process.env.PREFIX;
}
console.log("Loading modules");
for(var modName of config.modules){
	console.log("... Loading " + modName);
	var modPath = "./modules/" + modName + "/";
	if(mods[modName] === undefined)
		mods[modName] = {
			vars: {}
		};
	if(fs.existsSync(modPath + "classes.js"))
		eval(fs.readFileSync(modPath + "classes.js").toString());
	if(fs.existsSync(modPath + "functions.js"))
		eval(fs.readFileSync(modPath + "functions.js").toString());
	if(fs.existsSync(modPath + "userFunctions.js")){
		var functions = eval(fs.readFileSync(modPath + "userFunctions.js").toString());
		for(var func in functions){
			if(modFunctions[func] !== undefined)
				modFunctions[func].push(functions[func]);
		}
	}
	if(fs.existsSync(modPath + "commands.js"))
		commands.push(...eval(fs.readFileSync(modPath + "commands.js").toString()));
}

var commandNameList = [];
for(var i=0; i<commands.length; i++){
	commandNameList.push(...(commands[i].name));
}
var fuzzyCommandSearch = new Fuse(commandNameList, {includeScore: true});

for(var func of modFunctions.beforeReady){
	func();
}

console.log("Logging into Discord");

client.on("ready", () => {
	console.log("Logged in as " + client.user.tag);
	for(var func of modFunctions.onReadyPrelude){
		func();
	}
	console.log("Ready");
	for(var func of modFunctions.onReady){
		func();
	}
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
	for(var func of modFunctions.onMessage){
		func(msg);
	}
});

client.on("messageDelete", msg => {
	for(var func of modFunctions.onMessageDelete){
		func(msg);
	}
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
				prevFiles[msg.channel.id].splice(0, 1);
			}
		}
		if(images !== null){
			if(prevImages[msg.channel.id] === undefined){
				prevImages[msg.channel.id] = [];
			}
			prevImages[msg.channel.id].push(...(images).map(v => ({msg: msg, url: v})));
			if(prevImages[msg.channel.id].length > 10){
				prevImages[msg.channel.id].splice(0, 1);
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
