({
	"owner": "426459856975691776",
	"prefix": "cd?",
	"aiName": "chloe",
	"invite": "https://discord.com/api/oauth2/authorize?client_id=446387824087007234&permissions=415071853632&scope=bot",
	"modules": [
		"database",
		"main",
		"moderation",
		"notes",
		"chloeai3",
		"steam_sale_scraper"
	],
	"commandCategories": [
		"informational",
		"moderation",
		"family",
		"misc"
	],
	"defaultEmbedColor": "#e6cb67", // Yellow
	"errorEmbedColor": "#ff8080", // Red
	"goodEmbedColor": "#78ff74", // Green
	"badishEmbedColor": "#ffad5a", // Orange
	"badEmbedColor": "#ff8080", // Red
	"serverConfigs": {
		"Prefix": {
			"type": "text",
			"desc": "Custom prefix"
		},
		"LogChannel": {
			"type": "channel",
			"desc": "Moderation log channel"
		},
		"WarnAutoRemove": {
			"type": "number",
			"onlyPositive": true,
			"default": 0.01,
			"desc": "Amount of warnpoints that must be removed from every member per hour"
		},
		"Ai": {
			"type": "boolean",
			"desc": "Whether ChloeAI is enabled"
		},
		"AiName": {
			"type": "text",
			"desc": "Name which ChloeAI must respond to. It should be a single word, no spaces"
		},
		"SteamSalesChannel": {
			"type": "channel",
			"desc": "Channel where steam sales must be sent"
		}
	},
	"defaultThemeColors": {
		"#ff6666": 1,
		"#ff8c66": 1,
		"#ffb366": 1,
		"#ffd966": 1,
		"#ffff66": 1,
		"#d9ff66": 1,
		"#b3ff66": 1,
		"#8cff66": 1,
		"#66ff66": 1,
		"#66ff8c": 1,
		"#66ffb3": 1,
		"#66ffd9": 1,
		"#66ffff": 1,
		"#66d9ff": 1,
		"#66b3ff": 1,
		"#668cff": 1,
		"#6666ff": 1,
		"#8c66ff": 1,
		"#b366ff": 1,
		"#d966ff": 1,
		"#ff66ff": 1,
		"#ff66d9": 1,
		"#ff66b3": 1,
		"#ff668c": 1,
		"#ff0000": 1,
		"#000000": 0.1,
		"#f2f2f2": 0.1
	}
})
