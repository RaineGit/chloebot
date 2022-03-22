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
