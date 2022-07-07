// This function will be run after the bot logs into Discord
function onReady(){
	setPresence({activities: [{name: config.prefix + "help", type: "LISTENING"}], status: "idle"});
}

// This function will be run when a message is sent
async function onMessage(msg){
	if(!msg.author.bot){
		var mentions = msg.content.match(/<@!?\d+>/g);
		if(mentions){
			mentions = [...new Set(mentions)];
			try{
				for(var i=0; i<mentions.length; i++){
					var userId = getMention(mentions[i]);
					var note = dbGet(["users", userId, "note"]);
					if(note !== null && typeof(note) == "string"){
						var user = await client.users.fetch(userId);
						if(!user)
							continue;
						if(note.includes("{")){
							note = note.replace(/{.+?}/g, v => {
								switch(v.slice(1, -1).toLowerCase()){
									case "user_name":
									case "username":
										return msg.author.username;
									case "user_tag":
										return msg.author.tag;
									case "user_id":
										return msg.author.id;
									case "channel_name":
										return msg.channel.name;
									case "channel_id":
										return msg.channel.id;
									case "server_name":
									case "guild_name":
										return msg.guild ? msg.guild.name : "DM";
									case "server_id":
									case "guild_id":
										return msg.guild ? msg.guild.id : "0";
									default:
										return v;
								}
							});
						}
						await (new Answer(user.username + "'s note is\n> " + note)).send(msg.channel);
					}
				}
			}
			catch(err){
				console.log(err);
			}
		}
	}
}
