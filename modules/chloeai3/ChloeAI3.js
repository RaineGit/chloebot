const fs = require("fs");

class ChloeAI {
	constructor() {
		this.msgList = {};
		this.trainingData;
		this.memory = {};
		this.references1 = {};
		this.references2 = {};
		this.r2NextIndex = 0;
	}

	load(memoryFolder) {
		if(memoryFolder.slice(memoryFolder.length - 1) == "/")
			memoryFolder = memoryFolder.slice(0, memoryFolder.length - 1);
		this.memory = JSON.parse(fs.readFileSync(memoryFolder + "/memory.json"));
		this.references1 = JSON.parse(fs.readFileSync(memoryFolder + "/references1.json"));
		this.references2 = JSON.parse(fs.readFileSync(memoryFolder + "/references2.json"));
	}

	learn(realQuestion, realAnswer) {
		var question = this.compressText(realQuestion).split(" ");
		var answer = this.compressText(realAnswer);
		var index = undefined;
		if(this.references1[answer] == undefined){
			this.r2NextIndex++;
			index = this.r2NextIndex;
			this.references1[answer] = index;
			this.references2[index.toString()] = realAnswer;
		}
		else
			index = this.references1[answer];
		for(var i=0; i<question.length; i++){
			var address = question.slice(i);
			var address2 = [];
			for(var j=0; j<address.length; j++){
				var score;
				if(i == 0 && j == address.length - 1)
					score = 1;
				else if(i == 0)
					score = 0.5;
				else
					score = 0;
				address2.push(address[j], "c");
				var address3 = address2.slice(0, address2.length - 1);
				if(this.byAddress(this.memory, address2) == undefined)
					this.setByAddress(this.memory, address3, {"c": {}, "a": {}});
				if(score != 0){
					if(this.byAddress(this.memory, address3.concat(["a", index.toString()])) == undefined)
						this.setByAddress(this.memory, address3.concat(["a", index.toString()]), [0, 0]);
					this.setByAddress(this.memory, address3.concat(["a", index.toString(), score == 0.5 ? 1 : 0]), Number(this.byAddress(this.memory, address3.concat(["a", index.toString(), score == 0.5 ? 1 : 0]))) + 1);
				}
			}
		}
		return 1;
	};

	simulate(realQuestion) {
		var question = this.compressText(realQuestion).split(" ");
		var answer = "";
		var foundAnswer = false;
		for(var i=0; i<question.length; i++){
			var address = question.slice(i);
			var address2 = [];
			for(var j=0; j<address.length; j++){
				address2.push(address[j], "c");
				var nextAddress = address[j + 1] ? address2.concat(address[j + 1]) : null;
				if(nextAddress != undefined && this.byAddress(this.memory, nextAddress) == undefined)
					nextAddress = null;
				if(nextAddress == undefined){
					var address3 = address2.slice(0, address2.length - 1);
					var answers_ = this.byAddress(this.memory, address3.concat("a"));
					var answers = JSON.parse(JSON.stringify(answers_));
					if(address3.length > 2){
						var answers2 = JSON.parse(JSON.stringify(this.byAddress(this.memory, address3.slice(0, address3.length - 2).concat("a"))));
						for(var k in answers2){
							if(answers[k] != undefined)
								answers[k][1] += answers2[k][1] / 2;
							else
								answers[k] = [0, answers2[k][1] / 2];
						}
					}
					var isThereAnyAnswer = false;
					for(var k in answers){
						if(k != "27" && k != "628"){
							answers[k] = answers[k][0] + (answers[k][1] * 0.5);
							isThereAnyAnswer = true;
						}
						else
							answers[k] = 0;
						if(k == "30" || k == "414" || k == "74" || k == "153" || k == "87" || k == "2062" || k == "412")
							answers[k] = answers[k] / 2;
					}
					if(!isThereAnyAnswer){
						answer = "";
						foundAnswer = true;
					}
					else{
						var max = Math.max(...(Object.values(answers)));
						var passed = {};
						var sum = 0;
						for(var k in answers){
							if(answers[k] >= max * (max >= 5 ? 0.3 : 0.8)){
								passed[k] = [sum, sum + answers[k]];
								sum += answers[k];
							}
						}
						var randNum = Math.random() * sum;
						for(var k in passed){
							if(randNum > passed[k][0] && randNum < passed[k][1]){
								answer = this.references2[k.toString()];
								foundAnswer = true;
							}
						}
					}
				}
				if(foundAnswer)
					break;
			}
			if(foundAnswer)
				break;
		}
		return answer;
	};

	compressText(input) {
		var result = [];
		var input = input.replace(/\n/g, " ").replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().replace(/\s+/g, " ").split(" ");
		for(var i = 0; i<input.length; i++){
			var temp = String(input[i]);
			var addNot = false;
			if(temp.length >= 4 && temp.slice(temp.length - 1) == "s")
				temp = temp.slice(0, temp.length - 1);
			else if(temp.length >= 2 && temp.slice(temp.length - 2) == "ed")
				temp = temp.slice(0, temp.length - 2);
			else if(temp.length >= 2 && temp.slice(temp.length - 2) == "er")
				temp = temp.slice(0, temp.length - 2);
			else if(temp.length >= 2 && temp.slice(temp.length - 2) == "nt"){
				temp = temp.slice(0, temp.length - 2);
				addNot = true;
			}
			else if(temp.length >= 3 && temp.slice(temp.length - 3) == "est")
				temp = temp.slice(0, temp.length - 3);
			else if(temp.length >= 3 && temp.slice(temp.length - 3) == "ing")
				temp = temp.slice(0, temp.length - 3);
			result.push(temp);
			if(addNot)
				result.push("not");
		}
		result = result.join(" ");
		return result;
	};

	byAddress(o, s) {
		var a = s;
		if(s.length > 0){
			for (var i = 0, n = a.length; i < n; ++i) {
				var k = a[i];
				if (k in o) {
					o = o[k];
				} else {
					return;
				}
			}
		}
		return o;
	}

	setByAddress(o, s, newVal) {
		var a = s;
		eval("o" + (s.length > 0 ? "[\"" + a.join("\"][\"") + "\"]" : "") + " = newVal");
	}
}

module.exports = ChloeAI;