function dbSet(path, value, record = true){
	var obj = mods.database.vars.db;
	for(var i=0; i<path.length - 1; i++){
		if(obj[path[i]] === undefined){
			obj[path[i]] = {};
		}
		obj = obj[path[i]];
	}
	if(value === null){
		delete obj[path[i]];
	}
	else{
		obj[path[i]] = value;
	}
	if(record){
		mods.database.vars.saveStream.write(JSON.stringify([path, value]) + "\n");
	}
}

function dbGet(path){
	var obj = mods.database.vars.db;
	for(var i=0; i<path.length; i++){
		if(obj[path[i]] === undefined){
			return null;
		}
		obj = obj[path[i]];
	}
	return obj;
}

function guildCheck(id){
	var serverConfig = dbGet(["guilds", id, "config"]);
	var knownConfigs = dbGet(["knownConfigs"]) || [];
	for(var i in config.serverConfigs){
		var setting = config.serverConfigs[i];
		if(setting.default !== undefined && (serverConfig === null || knownConfigs[i] !== 1)){
			dbSet(["guilds", id, "config", i], setting.default);
		}
	}
}

function getServerSetting(guild, setting){
	return guild ? dbGet(["guilds", guild.id, "config", setting]) : null;
}