({
	beforeReady: function(){
		const ChloeAI = require("./modules/chloeai3/ChloeAI3.js");
		console.log("Loading ChloeAI3");
		if(!fs.existsSync("modules/chloeai3/model")) {
			console.log("... Error: No model");
			return;
		}
		var chloeai = new ChloeAI();
		chloeai.load("modules/chloeai3/model");
		mods.chloeai3.vars.chloeai = chloeai;
		mods.chloeai3.vars.conversations = {};
	},
	onMessage: async function(msg) {
		try {
			if(!msg.guild)
				return;
			var content = msg.content.toLowerCase();
			var name = (dbGet(["guilds", msg.guild.id, "config", "AiName"]) || config.aiName).toLowerCase();
			var ping = "<@" + client.user.id + ">";
			if(!msg.author.bot && (content.includes(name) || content.includes(ping) || mods.chloeai3.vars.conversations[msg.channel] !== undefined)){
				if(dbGet(["guilds", msg.guild.id, "config", "Ai"])) {
					var question = content.split(" ").filter(v => !(v.includes(name) || v.includes(ping))).join(" ");
					if(["hey", "hi", "hello"].includes(question))
						mods.chloeai3.vars.conversations[msg.channel] = 0;
					var answer = aiAnswer(question);
					if(answer.replace(/\s/g, "").length == 0)
						return;
					if(mods.chloeai3.vars.conversations[msg.channel] !== undefined) {
						if(question.includes("bye") || question.includes("cya") || (question.includes("shut") && question.includes("up")))
							mods.chloeai3.vars.conversations[msg.channel] = undefined;
						else {
							mods.chloeai3.vars.conversations[msg.channel]++;
							if(mods.chloeai3.vars.conversations[msg.channel] >= 8)
								mods.chloeai3.vars.conversations[msg.channel] = undefined;
						}
					}
					await asyncWait(1);
					await (new Answer(answer)).send(msg.channel);
				}
			}
		}
		catch(err) {
			console.log(err);
		}
	}
})