({
	beforeReady: function(){
		mods.database.vars.db = {};
		if(!fs.existsSync("db")){
			fs.mkdirSync("db");
		}
		if(fs.existsSync("db/database.json")){
			console.log("Loading database");
			mods.database.vars.db = JSON.parse(fs.readFileSync("db/database.json").toString());
		}
		if(fs.existsSync("db/lastchanges.txt")){
			console.log("Applying last changes to the database");
			var lastChanges = fs.readFileSync("db/lastchanges.txt").toString().split("\n");
			if(lastChanges.length > 1){
				for(var i=0; i<lastChanges.length - 1; i++){
					var change = JSON.parse(lastChanges[i]);
					dbSet(change[0], change[1], false);
				}
				fs.writeFileSync("db/database_tmp.json", JSON.stringify(mods.database.vars.db));
				fs.renameSync("db/database_tmp.json", "db/database.json");
			}
			else{
				console.log("Nevermind, there are no changes to apply...");
			}
			fs.unlinkSync("db/lastchanges.txt");
		}
		mods.database.vars.saveStream = fs.createWriteStream("db/lastchanges.txt", {
			'flags': 'a',
			'encoding': null,
			'mode': 0666
		});
	},

	onReadyPrelude: function(){
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
	}
})