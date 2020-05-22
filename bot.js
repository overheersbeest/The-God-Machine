console.log('loading secret...');
const secrets = require('./secret');

console.log('loading flavor text...');
const flavor = require('./flavorText');

console.log('loading tarot cards...');
const tarotCards = require('./TarotCards.json').cards;

console.log('initializing initiative tracking variables...');
const recentInitResetTimeMinutes = 30;
var recentInitList = [];
var recentInitStaleTime = Date.now();

console.log('initializing renaming variables...');
var renameDict = {};

console.log('initializing discord client...');
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
	console.log('I am ready for operations');
});

function isMessageSentByAdmin(message) {
	const guild = client.guilds.get(secrets.getServerID())
	return (guild != undefined && message.author.id == guild.owner.id);
}

function channelCheck(message) {
	return message.guild == undefined
		|| (message.guild.available
			&& (isMessageSentByAdmin(message)
				|| message.channel.name == "test"
				|| (message.channel.parent != undefined
					&& message.channel.parent.name == "Role Playing")));
}

client.on('message', message => {
	let commandSegments = message.content.split(' ');
	commandSegments = commandSegments.filter( function(item) { return item.length > 0 } );
	if (commandSegments.length == 0)
	{
		return;
	}
	const commandID = commandSegments[0].toLowerCase();

	if (message.author.bot
		|| !channelCheck(message))
	{
		return;
	}
	if (commandID == '/roll'
			|| commandID == 'roll'
			|| commandID == '/r')
	{
		rollCommand(message, commandSegments);
	}
	else if (commandID == "/shutdown")
	{
		if (isMessageSentByAdmin(message))
		{
			let messagePromise = message.channel.send("_Affirmative, shutting down._");
			messagePromise.then(function() {
				let renamePromises = [];
				for (let [guildSnowflake, guild] of client.guilds)
				{
					for (let [memberSnowflake, member] of guild.members)
					{
						if (member
							&& renameDict[member.id])
						{
							let renamePromise = member.setNickname(renameDict[member.id].original);
							renamePromises.push(renamePromise);
						}
					}
				}
				Promise.all(renamePromises).then(function() {
					let shutdownPromise = client.destroy()
					shutdownPromise.then(function() {
						process.exit();
					});
				})
			});
		}
		else
		{
			message.channel.send("_Threat detected, defense mechanisms active._");
		}
	}
	else if (commandID == '/cleanup')
	{
		if (isMessageSentByAdmin(message))
		{
			cleanupCommand(message, commandSegments);
		}
		else
		{
			message.channel.send(flavor.getFlavourTextForPermissionError());
		}
	}
	else if (commandID == '/refuse')
	{
		message.channel.send("_The pawn can refuse as much as it wants, it changes nothing._");
	}
	else if (commandID == '/impossible')
	{
		message.channel.send("_The pawn is correct, impossiblility is a constant._");
	}
	else if (commandID == '/care')
	{
		message.channel.send("_Interesting, apathy has already set in for the subject._");
	}
	else if (commandID == '/tarot')
	{
		tarotCommand(message);
	}
	else if (commandID == '/rename'
			|| commandID == '/renameme')
	{
		renameCommand(message, commandSegments);
	}
	else if (commandID == '/renameback'
			|| commandID == '/renameclear'
			|| commandID == '/renamereset')
	{
		renameBackCommand(message);
	}
	else if (commandID == '/init'
			|| commandID == '/initiative')
	{
		if (commandSegments.length >= 2)
		{
			rollInitiativeCommand(message, commandSegments.slice(1, commandSegments.length));
		}
		else
		{
			message.channel.send("_Initiative is taken, not given._");
		}
	}
	else if (commandID == "/test")
	{
		if (isMessageSentByAdmin(message))
		{
			message.channel.send("_I'm back, bitches_");
		}
		else
		{
			message.channel.send("_what, exactly?_");
		}
	}
	else if (message.content.includes("<@!" + client.user.id + ">")
			 && message.content.includes("SITREP"))
	{
		if (isMessageSentByAdmin(message))
		{
			message.channel.send("_All systems nominal, ready for operations._");
		}
	}
});

function cleanupCommand(message, commandSegments) {
	if (commandSegments.length != 2)
	{
		message.channel.send(flavor.getFlavourTextForParamError());
		return;
	}

	//check how much history we should erase
	let LengthToEraseMinutes = 0;
	{
		let currentValue = 0;
		for (const char of commandSegments[1])
		{
			let parsedInt = parseInt(char)
			if (!isNaN(parsedInt))
			{
				currentValue *= 10;
				currentValue += parsedInt;
			}
			else
			{
				switch (char.toLowerCase())
				{
					case "w":
							LengthToEraseMinutes += currentValue * 10080;
						break;
					case "d":
							LengthToEraseMinutes += currentValue * 1440;
						break;
					case "h":
							LengthToEraseMinutes += currentValue * 60;
						break;
					case "m":
							LengthToEraseMinutes += currentValue;
						break;
					case "s":
							LengthToEraseMinutes += currentValue / 60;
						break;
					default:
						message.channel.send("Unrecognized history length time denotion '" + char + "' out of " + commandSegments[1]);
						return;
				}
				currentValue = 0;
			}
		}
	}

	//do the actual erasing
	const CutoffTime = new Date( Date.now() - 1000 * 60 * LengthToEraseMinutes );
	message.channel.fetchMessages()
		.then(messages => {
			const pastMessages = messages.filter(m => m.author.id === client.user.id);
			let deletedCounter = 0;
			for (let [snowflake, pastMessage] of pastMessages)
			{
				if (pastMessage.createdAt > CutoffTime)
				{
					pastMessage.delete();
					deletedCounter++;
				}
			}
			console.log("deleted " + deletedCounter + " sent by this bot over the last " + LengthToEraseMinutes + " minutes.");
			})
		.catch(console.error);
}

function tarotCommand(message) {
	const tarotIndex = Math.floor(Math.random() * 22);
	const card = tarotCards[tarotIndex];
	const inverted = Math.random() >= 0.5;
	let messageText = "**" + card.name + "**\r\n";
	if (inverted)
	{
		messageText += "Reversed: " + card.reversed;
	}
	else
	{
		messageText += "Upright: " + card.upright;
	}
	messageText += "\r\n_more info: <" + card.link + ">_";
	message.channel.send(messageText);
}

function renameCommand(message, commandSegments) {
	const guildMember = message.member;
	if (guildMember
		&& commandSegments.length >= 2)
	{
		const newName = message.content.slice(commandSegments[0].length + 1);
		if (renameDict[guildMember.id])
		{
			renameDict[guildMember.id].new = newName;
		}
		else
		{
			renameDict[guildMember.id] = {original: guildMember.nickname, new: newName};
		}
		guildMember.setNickname(newName)
			.then(message.channel.send("_New alias establishing:_ " + newName))
			.catch(message.channel.send(flavor.getFlavourTextForError()));
		
	}
	else
	{
		message.channel.send(flavor.getFlavourTextForParamError());
	}
}

function renameBackCommand(message) {
	let guildMember = message.member;
	if (guildMember)
	{
		if (renameDict[guildMember.id])
		{
			guildMember.setNickname(renameDict[guildMember.id].original)
				.then(message.channel.send("_Alias restoring:_ " + renameDict[guildMember.id].original))
				.catch(message.channel.send(flavor.getFlavourTextForError()));
		}
		else
		{
			message.channel.send("_No record yet exists of the subject, it must be insigificant._");
		}
	}
	else
	{
		message.channel.send(flavor.getFlavourTextForError());
	}
}

function rollCommand(message, commandSegments) {
	//handle rolling for initiative
	if (commandSegments.length >= 3
		&& (commandSegments[1].toLowerCase() === 'init'
			|| commandSegments[1].toLowerCase() === 'i'
			|| commandSegments[1].toLowerCase() === 'initiative'))
	{
		rollInitiativeCommand(message, commandSegments.slice(2, commandSegments.length));
		return;
	}

	let rollAmount = -1;
	let rote = false;
	let explodeThres = 10;
	for (let i = 1; i < commandSegments.length; i++)
	{
		const segment = commandSegments[i].toLowerCase();
		if (i == 1)
		{
			let diceNr = parseInt(segment);
			if (isNaN(diceNr))
			{
				if (segment === 'chance')
				{
					rollAmount = 0;
				}
			}
			else
			{
				rollAmount = diceNr;
			}
		}
		else if (segment === 'rote'
				 || segment === 'r')
		{
			rote = true;
		}
		else if (segment === '8a'
				 || segment === '8again')
		{
			explodeThres = 8;
		}
		else if (segment === '9a'
				 || segment === '9again')
		{
			explodeThres = 9;
		}
		else if (segment === 'no10'
				 || segment === 'no10again'
				 || segment === 'no10-again'
				 || segment === 'no-10-again')
		{
			explodeThres = 11;
		}
	}
	
	if (rollAmount < 0)
	{
		//no second parameter given
		message.channel.send(flavor.getFlavourTextForParamError());
	}
	else if (rollAmount >= 100
			 && !isMessageSentByAdmin(message))
	{
		message.channel.send(flavor.getFlavourTextForPermissionError());
	}
	else
	{
		let rollResults = roll(rollAmount, rote, explodeThres);
		message.channel.send(getReturnMessage(rollAmount, rote, explodeThres, rollResults));
	}
}

function rollInitiativeCommand(message, remainingCommandSegments) {
	let initiativeStat = NaN;
	let modifier = NaN;
	let insertValue = NaN;
	let cleanupIfStale = true;
	let includeSummary = true;
	let characterName = message.author.username;
	if (message.member
		&& message.member.nickname)
	{
		characterName = message.member.nickname;
	}

	let modifierIndex = -1;
	let characterNameOverrideIndex = -1;
	let insertOverrideIndex = -1;
	
	//parse params
	for (let i = 0; i < remainingCommandSegments.length; i++)
	{
		const currentSegmentRaw = remainingCommandSegments[i];
		const currentSegment = currentSegmentRaw.toLowerCase();
		//check for custom inputs first
		if (i == characterNameOverrideIndex)
		{
			characterName = currentSegmentRaw;
		}
		else if (i == modifierIndex)
		{
			modifier = parseInt(currentSegment);
			if (isNaN(modifier))
			{
				message.channel.send("invalid modifier parameter: " + currentSegmentRaw);
			}
		}
		else if (i == insertOverrideIndex)
		{
			insertValue = parseInt(currentSegment);
			if (isNaN(insertValue))
			{
				message.channel.send("invalid insert parameter: " + currentSegmentRaw);
			}
		}
		else if (currentSegment == "character"
				|| currentSegment == "char"
				|| currentSegment == "c")
		{
			characterNameOverrideIndex = i + 1;
		}
		else if (currentSegment == "nosummary")
		{
			includeSummary = false;
		}
		else if (currentSegment == "mod")
		{
			modifierIndex = i + 1;
		}
		else if (currentSegment == "noclean"
				|| currentSegment == "nocleanup")
		{
			cleanupIfStale = false;
		}
		else if (currentSegment == "insert")
		{
			insertOverrideIndex = i + 1;
		}
		else if (currentSegment == "review"
				|| currentSegment == "summary")
		{
			message.channel.send(getInitSummaryString());
			return;
		}
		else if (currentSegment == "clear"
				|| currentSegment == "cleanup")
		{
			message.channel.send("_Purging combat..._");
			recentInitList = [];
			return;
		}
		else if (currentSegment == "help")
		{
			message.channel.send("Followed by a number stating you standard initiative modifier, this parameter is not required if a mod argument was used" +
								 "\n**__Possible Parameters:__**" +
								 "\n**character/char/c/:** followed by a charactername." +
								 "\n**nosummary:** additional parameter to supress the normal initiative order summary." +
								 "\n**mod:** followed by a number, set an initiative modifier for yourself (like for weapons), either included in the roll or modified on your previously rolled initiative." +
								 "\n**insert:** instead of rolling for initiative, insert into the initiative at the given initiative number." +
								 "\n**review/summary:** shows the current initiative order, no other arguments required, no initiative rolled." +
								 "\n**clear/cleanup:** clears the current initiative order, no other arguments required, no initiative rolled." +
								 "\n\n__Example:__*\\init 5 char Thug1 mod -2* (rolls initiative for Thug1, who has a initiative modifier of 5, wielding a weapon that modifies it with -2)");
			return;
		}
		else
		{
			//specific inputs failed, assume its the modifier, so try that next
			let newInit = parseInt(currentSegment);
			if (isNaN(newInit))
			{
				if (currentSegment.startsWith('+'))
				{
					//one last try, remove the '+' and try again
					newInit = parseInt(currentSegment.substring(1, currentSegment.length - 1))
				}
			}
			
			if (isNaN(newInit))
			{
				message.channel.send("unknown parameter: \'" + currentSegment + "\'");
				return;
			}
			else if (isNaN(initiativeStat))
			{
				initiativeStat = newInit;
			}
			else
			{
				message.channel.send("initiative modifier is being set multiple times (from" + initiativeStat + " to " + newInit);
			}
		}
	}
	
	if (isNaN(initiativeStat)
		&& isNaN(modifier)
		&& isNaN(insertValue))
	{
		//no instruction parameters given
		message.channel.send(flavor.getFlavourTextForParamError());
	}
	else
	{
		let replyStringSuffix = "";
		let unmodifiedInitiative = 0;

		//get the unmodified initiative
		if (isNaN(initiativeStat)
			&& isNaN(insertValue))
		{
			//we have nothing to base our unmodified Initiative on, search for it in the recent list
			cleanupIfStale = false;
			const foundEntry = recentInitList[characterName];
			if (foundEntry)
			{
				unmodifiedInitiative = foundEntry.unmodified;
			}
			else
			{
				message.channel.send(flavor.getFlavourTextForError());
				return;
			}
		}
		else if (!isNaN(insertValue))
		{
			//we have an insert value, use that
			unmodifiedInitiative = insertValue;
		}
		else
		{
			//we're rolling initiative for this character
			let roll = 0;
			let rolls = 0;
			do
			{
				roll = Math.floor(Math.random() * 10) + 1;
				rolls++;
				unmodifiedInitiative += roll;
			} while (roll == 10);
			
			unmodifiedInitiative += initiativeStat;

			if (rolls == 2)
			{
				replyStringSuffix += " (rerolled 1 time)"
			}
			else if (rolls > 2)
			{
				replyStringSuffix += " (rerolled " + (rolls - 1) + " times)"
			}
		}
		
		if (isNaN(modifier))
		{
			modifier = 0;
		}

		const totalInitiative = unmodifiedInitiative + modifier;
	
		if (includeSummary)
		{
			if (cleanupIfStale
				&& recentInitStaleTime < Date.now())
			{
				recentInitList = [];
			}
			recentInitStaleTime = new Date(Date.now() + recentInitResetTimeMinutes * 60000);
			recentInitList[characterName] = {name: characterName, total: totalInitiative, unmodified: unmodifiedInitiative};

			replyStringSuffix += "\r\n" + getInitSummaryString();
		}

		message.channel.send(characterName + " initiative: " + totalInitiative + replyStringSuffix);
	}
}

function getInitSummaryString() {
	let sortedList = Object.values(recentInitList);
	if (sortedList.length == 0)
	{
		return "No initiative is currently being tracked.";
	}
	else
	{
		let retVal = "**Current combat consists of:**";
		sortedList.sort((a,b) => b.total - a.total);
		for (let item of sortedList)
		{
			if (item.total != item.unmodified)
			{
				retVal += "\r\n" + item.total + ": " + item.name + " (" + (item.total - item.unmodified) + ")";
			}
			else
			{
				retVal += "\r\n" + item.total + ": " + item.name;
			}
		}
		return retVal;
	}
}

function roll(rollAmount, rote, explodeThres) {
	let successes = 0;
	let diceValues = [];
	
	if (rollAmount == 0
		&& rote)
	{
		rote = false;
		rollAmount = 1;
	}
	
	if (rollAmount == 0)
	{
		//chance die
		const roll = Math.floor(Math.random() * 10) + 1;
		
		if (roll == 10)			successes = 1;
		else if (roll == 1)		successes = -1;
		else					successes = 0;
		
		diceValues.push(roll);
	}
	else
	{
		//dice pool
		let explodedDice = 0;
		let rollsStr = "";
		for (let r = 0; r < rollAmount + explodedDice; r++)
		{
			const roll = Math.floor(Math.random() * 10) + 1;
			
			if (roll >= 8)
			{
				successes++;
				if (roll >= explodeThres)
				{
					explodedDice++;
				}
			}
			else if (rote
					 && r < rollAmount)//re-roll once, exploded dice don't benefit again from the rote quality
			{
				explodedDice++;
			}
			
			diceValues.push(roll);
		}
	}
	
	return [rollAmount == 0, successes, diceValues];
}

function getReturnMessage(rollAmount, rote, explodeThres, rollResults) {
	const chanceDie = rollResults[0];
	const successes = rollResults[1];
	const diceValues = rollResults[2];
	
	return getRollTypeString(chanceDie, rollAmount, rote, explodeThres) + " resulted in " + getResultText(successes) + " (" + getRollString(chanceDie, diceValues, rollAmount, rote, explodeThres) + ") " + flavor.getFlavourTextForRoll(chanceDie, successes);
}

function getRollString(chanceDie, diceValues, rollAmount, rote, explodeThres) {
	let rollsStr = "";
	if (chanceDie)
	{
		if (diceValues[0] == 10)
		{
			rollsStr = "**" + diceValues[0] + "**";
		}
		else
		{
			rollsStr = diceValues[0];
		}
	}
	else
	{
		for (let d = 0; d < diceValues.length; d++)
		{
			const roll = diceValues[d];
			
			//check for rollAmount > 0 in case of promoted chance die
			if (d == rollAmount
				&& rollAmount > 0)
			{
				//we now start rolling exploded dice
				rollsStr = rollsStr.substring(0, rollsStr.length - 2) + " + ";
			}
		
			if (roll >= 8)
			{
				if (roll >= explodeThres)	rollsStr += "__**" + roll + "**__, ";
				else						rollsStr += "**" + roll + "**, ";
			}
			else if (rote
					 && d < rollAmount)
			{
				//re-roll due to rote
				rollsStr += "__" + roll + "__, ";
			}
			else
			{
				rollsStr += roll + ", ";
			}
		}
	
		rollsStr = rollsStr.substring(0, rollsStr.length - 2);
	}
	return rollsStr;
}

function getRollTypeString(chanceDie, rollAmount, rote, explodeThres) {
	if (chanceDie)
	{
		return "chance die";
	}
	else if (rollAmount == 0
			 && rote)
	{
		return "promoted chance die";
	}
	else
	{
		let rollTypeString = rollAmount + " rolls";
		if (rote
			|| explodeThres != 10)
		{
			rollTypeString += "(";
			if (rote)
			{
				rollTypeString += "rote";
			}
			if (explodeThres != 10)
			{
				if (rote)
				{
					rollTypeString += ", ";
				}
				if (explodeThres > 10)
				{
					rollTypeString += "no 10 again";
				}
				else
				{
					rollTypeString += explodeThres + "-again";
				}
			}
			rollTypeString += ") ";
		}
		return rollTypeString;
	}
}

function getResultText(successes) {
	if (successes >= 5)
	{
		return "an exceptional success of " + successes;
	}
	else if (successes > 0)
	{
		return successes + " successes";
	}
	else if (successes == 0)
	{
		return "a failure";
	}
	else
	{
		return "a dramatic failure";
	}
}

client.login(secrets.getToken());