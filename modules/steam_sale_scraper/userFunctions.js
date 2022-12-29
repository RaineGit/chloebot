({
	beforeReady: function(){
		try {
			mods.steam_sale_scraper.vars.html_ent = require("html-entities");
		}
		catch(err) {
			console.log("You must install the npm package \"html-entities\" for the steam_sale_scraper module to work");
			return;
		}
	},
	onReadyPrelude: function(){
		if(mods.steam_sale_scraper.vars.html_ent === undefined)
			return;
		setInterval(scrapeSteamSales, 12 * 60 * 60 * 1000);
	}
})