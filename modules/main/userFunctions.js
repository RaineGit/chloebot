({
	// This function will be run after the bot logs into Discord and before the "onReady" function is run
	onReadyPrelude: function(){
		mods.main.vars.presence = undefined;
		mods.main.vars.deletedMsgs = {};
		mods.main.vars.webhooks = {};
		setInterval(async function(){
			try{
				await client.user.setPresence(mods.main.vars.presence || {activities: [], status: "online"});
			}
			catch(err){
				console.log("The presence is invalid");
			}
		}, 10 * 60 * 1000);
	},

	// This function will be run after the bot logs into Discord and after the "onReadyPrelude" function is run
	onReady: function(){
		setPresence({activities: [{name: config.prefix + "help", type: "LISTENING"}], status: "idle"});
	},

	onMessageDelete: function(msg){
		var deletedMsgs = mods.main.vars.deletedMsgs;
		if(deletedMsgs[msg.channel.id] === undefined){
			deletedMsgs[msg.channel.id] = [];
		}
		deletedMsgs[msg.channel.id].push({
			time: new Date().getTime(),
			postTime: msg.createdTimestamp,
			author: {tag: msg.author.tag, id: msg.author.id, avatar: getAvatar(msg.author, 64)},
			content: msg.content,
			attachments: [...msg.attachments.values()].map(v => v.attachment),
			embed: msg.embeds.length > 0
		});
		if(deletedMsgs[msg.channel.id].length > 3){
			deletedMsgs[msg.channel.id].splice(0, 1);
		}
	}
})