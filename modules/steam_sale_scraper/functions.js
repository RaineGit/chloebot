async function scrapeSteamSales() {
	console.log("Looking for good sales on steam");
	try{
		var app_ids = [];
		for(var i=0; i<10; i++) {
			var data = await fetch("https://store.steampowered.com/saleaction/ajaxgetsaledynamicappquery?cc=US&l=english&flavor=popularpurchaseddiscounted&start=" + (i * 100) + "&count=100&return_capsules=true&bForceUseSaleTag=true&strContentHubType=specials&strTabFilter=&bRequestFacetCounts=true");
			app_ids.push(...(await data.json()).appids);
			await asyncWait(1.6);
		}
		app_ids = [...new Set(app_ids)];
		var sales = {};
		var prices = [];
		for(var i=0; i<app_ids.length; i+=200) {
			var data = await fetch("https://store.steampowered.com/api/appdetails?cc=US&filters=price_overview&appids=" + app_ids.slice(i, i + 200).join(","));
			prices = {...prices, ...(await data.json())};
			await asyncWait(1.6);
		}
		prices = Object.fromEntries(Object.entries(prices).filter(v => {
			try {
				return v[1].data.price_overview.discount_percent >= 90;
			}
			catch(err) {
				return false;
			}
		}));
		var saved_sales = dbGet(["steam_sales"]) || {};
		dbSet(["steam_sales"], Object.fromEntries(Object.entries(prices).map(v => [v[0], v[1].data?.price_overview?.discount_percent]).filter(v => v !== undefined)));
		for(var i in prices) {
			try {
				var price = prices[i];
				if(saved_sales[i] !== undefined) {
					if(price.data.price_overview.discount_percent <= saved_sales[i])
						continue;
				}
				var data = await fetch("https://store.steampowered.com/api/appdetails?cc=US&filters=basic&appids=" + i);
				var info = (await data.json())[i];
				sales[i] = {name: info.data.name, desc: info.data.short_description, discount: price.data.price_overview.discount_percent, old_price: price.data.price_overview.initial_formatted, new_price: price.data.price_overview.final_formatted, header_image: info.data.header_image};
			}
			catch(err) {
				continue;
			}
			await asyncWait(1.6);
		}
		if(Object.keys(sales).length == 0)
			return;
		var channels = Object.values(dbGet(["guilds"])).map(v => {
			if(v.config !== undefined && v.config.SteamSalesChannel !== undefined)
				return v.config.SteamSalesChannel;
		}).filter(v => v !== undefined);
		for(var i in sales) {
			try {
				var sale = sales[i];
				var embed = new Discord.MessageEmbed();
				if(sale.discount == 100)
					embed.setColor("#41f73b");
				else
					embed.setColor(config.defaultEmbedColor);
				embed.setTitle("(-" + sale.discount + "%) " + sale.name);
				embed.addFields([
					{
						name: "Price",
						value: "**" + sale.new_price + "**\n~~" + sale.old_price + "~~",
						inline: true
					},
					{
						name: "Description",
						value: mods.steam_sale_scraper.vars.html_ent.decode(sale.desc) + "\n" + "https://store.steampowered.com/app/" + i,
						inline: true
					}
				]);
				embed.setImage(sale.header_image);
				for(var channel_id of channels) {
					try {
						var channel = await client.channels.fetch(channel_id);
						await (new Answer({embeds: [embed]})).send(channel);
					}
					catch(err) {
						continue;
					}
				}
			}
			catch(err) {
				continue;
			}
		}
	}
	catch(err){
		console.log("Unable to fetch steam sales: ", err);
	}
	console.log("Done looking for good sales on steam");
}