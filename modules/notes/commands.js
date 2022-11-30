[
	{
		name: ["note"],
		args: "[text or \"off\" or impersonate [\"on\" or \"off\"]]",
		cat: "misc",
		desc: "Set or disable your note",
		func: function(d){
			if(d.msgText.length == 0){
				return SyntaxError;
			}
			var note = d.msgText;
			if(d.args.length == 2 && d.args[1].toLowerCase() == "off")
				note = null;
			else if(d.args.length >= 2 && d.args[1].toLowerCase() == "impersonate"){
				if(d.args.length == 2)
					return SyntaxError;
				else if(d.args.length == 3){
					var enable = null;
					switch(d.args[2].toLowerCase()){
						case "on":
							enable = true;
							break;
						case "off":
							break;
						default:
							return SyntaxError;
					}
					dbSet(["users", d.msg.author.id, "noteImpersonation"], enable);
					return new Answer("Impersonation has been " + (enable ? "enabled" : "disabled"));
				}
			}
			dbSet(["users", d.msg.author.id, "note"], note);
			if(note === null){
				return new Answer("Your note has been disabled");
			}
			else{
				return new Answer("Your note has been set to\n> " + note + "\nWhenever someone pings you, your note will be shown\nYou can disable it with `" + d.prefix + "note off`");
			}
		}
	}
]