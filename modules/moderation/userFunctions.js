({
	beforeReady: function(){
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
	}
})