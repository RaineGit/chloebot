var Answer = class {
	constructor(content, options = {}){
		if(typeof(options) == "object"){
			if(options.type === undefined){
				this.type = typeof(content) == "object" ? "any" : "text";
			}
			else{
				this.type = options.type;
			}
		}
		else if(typeof(options) == "string"){
			this.type = options;
		}
		this.componentOptions = options.components;
		this.content = content;
		if(this.content === undefined){
			this.type = "none";
		}
	}
	send(channel){
		this.channel = channel;
		return new Promise(async (resolve, reject) => {
			try{
				if(this.type == "error"){
					resolve(await this.channel.send({embeds: [makeErrorEmbed(this.content)]}));
				}
				else{
					var content = this.content;
					this.buttonCallbacks = {};
					if(typeof(content) != "object"){
						content = cleanMessage(content.toString());
					}
					else{
						if(content.content != undefined){
							content.content = cleanMessage(content.content.toString());
						}
						if(content.components != undefined && content.components.length > 0){
							this.allComponents = [].concat(...content.components.map(v => getAllComponents(v)));
							for(var i=0; i<this.allComponents.length; i++){
								if(this.allComponents[i].callback !== undefined){
									this.buttonCallbacks[this.allComponents[i].customId] = this.allComponents[i].callback;
									delete this.allComponents[i].callback;
								}
							}
						}
					}
					var msg = await this.channel.send(content);
					if(typeof(content) == "object" && content.components !== undefined && content.components.length > 0 && this.componentOptions){
						var componentsOwner = this.componentOptions.owner || "anyone";
						var callbacks = this.buttonCallbacks;
						var filter = (interaction) =>
							interaction.message.id == msg.id;
						var collector = msg.channel.createMessageComponentCollector({ filter, time: this.componentOptions.time || 30_000 });
						var answer = this;
						this.disableComponents = async function(){
							try{
								for(var i=0; i<answer.allComponents.length; i++){
									if(answer.allComponents[i].disabled !== undefined){
										answer.allComponents[i].setDisabled(true);
									}
								}
								await msg.edit({components: content.components});
							}
							catch(err){
								console.log(err);
							}
						};
						collector.on('collect', i => {
							if(!(componentsOwner == "anyone" || i.user.id === componentsOwner.id)){
								i.reply({content: "This isn't yours", ephemeral: true});
								return;
							}
							if(callbacks[i.customId]){
								callbacks[i.customId]({
									interaction: i,
									msg: msg,
									answer: answer,
									update: function(content){
										return new Promise(async (resolve, reject) => {
											try{
												resolve(await answer.update(content, i));
											}
											catch(err){
												reject(err);
											}
										});
									},
									reply: function(content){
										return new Promise(async (resolve, reject) => {
											try{
												resolve(await answer.interactionReply(content, i));
											}
											catch(err){
												reject(err);
											}
										});
									}
								});
							}
						});
						collector.on('end', this.disableComponents);
					}
					resolve(msg);
				}
			}
			catch(err){
				reject(err);
			}
		});
	}
	update(content, interaction){
		return new Promise(async (resolve, reject) => {
			try{
				if(typeof(content) != "object"){
					content = cleanMessage(content.toString());
				}
				else if(content.content != undefined){
					content.content = cleanMessage(content.content.toString());
				}
				resolve(await interaction.update(content));
			}
			catch(err){
				reject(err);
			}
		});
	}
	interactionReply(content, interaction){
		return new Promise(async (resolve, reject) => {
			try{
				if(typeof(content) != "object"){
					content = cleanMessage(content.toString());
				}
				else if(content.content != undefined){
					content.content = cleanMessage(content.content.toString());
				}
				resolve(await interaction.reply(content));
			}
			catch(err){
				reject(err);
			}
		});
	}
}
