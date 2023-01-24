import pytest
import GodMachine.commands as cmds
import GodMachine.bot as bot

@pytest.mark.asyncio
@pytest.mark.parametrize("command", ["/test", "/refuse", "/pass", "/impossible", "/care", "<@!> SITREP"])
async def test_simpleReplies(command):
	prompt_admin = bot.CommandPrompt(command, "Test UserName", True, None, None)
	result_admin = await bot.processCommand(prompt_admin)
	assert result_admin != None
	
	prompt_user = bot.CommandPrompt(command, "Test UserName", False, None, None)
	result_user = await bot.processCommand(prompt_user)
	assert result_user != None

@pytest.mark.asyncio
@pytest.mark.parametrize("command", ["/r 1", "/roll 0", "roll 10000", "roll 151", "/r 20 r", "/r 20 9a", "/r 20 8a", "/r 20 no10", "/r 20 adv", "/r 20 blessed", "/r 5 blighted", 
									 "/r 20 3e", "/r 20 1e", "/r 20 r 9a 1e", "roll chance r", "roll coin", "roll %", "roll d12", "roll init 4", "roll chance", "roll", "roll tarot",
									 "roll letter"])
async def test_roll(command):
	prompt = bot.CommandPrompt(command, "Test UserName", True, None, None)
	for i in range(100):
		result = await bot.processCommand(prompt)
		assert result != None

@pytest.mark.asyncio
@pytest.mark.parametrize("command", ["/init summary", "/init 4", "/init -20", "/initiative 4", "/init 4 char exampleCharacter", "/init 4 mod -2 char exampleCharacter", "/init mod exampleCharacter",
									 "/init insert 16", "/init mod -2", "/init insert char bob", "/init help", "/init 4 noclean", "/init 4 nosummary", "/init summary", "/init clear", "/init",
									 "/init 5 6", "/init nosummary", "/init mod -2 char nonExistentCharacter"])
async def test_init(command):
	prompt = bot.CommandPrompt(command, "Test UserName", True, None, None)
	for i in range(100):
		result = await bot.processCommand(prompt)
		assert result != None

@pytest.mark.asyncio
async def test_tarot():
	prompt = bot.CommandPrompt("/tarot", "Test UserName", True, None, None)
	for i in range(100):
		result = await bot.processCommand(prompt)
		assert result != None

@pytest.mark.asyncio
async def test_coinflip():
	prompt = bot.CommandPrompt("/coinflip", "Test UserName", True, None, None)
	for i in range(100):
		result = await bot.processCommand(prompt)
		assert result != None

@pytest.mark.asyncio
@pytest.mark.parametrize(("command", "admin"), [("/corrupt", True), ("/corruption 1", True), ("/corrupt 0.5", True), ("/corrupt .5", True), ("/corruption foo", True), ("/corrupt 2", True), ("/corrupt .5", False), ("/corruption 0", True)])
async def test_corruption(command, admin):
	prompt_corrupt = bot.CommandPrompt(command, "Test UserName", admin, None, None)
	result_corrupt = await bot.processCommand(prompt_corrupt)
	assert result_corrupt != None
	prompt_roll = bot.CommandPrompt("/roll 8", "Test UserName", admin, None, None)
	result_roll = await bot.processCommand(prompt_roll)
	assert result_roll != None

@pytest.mark.asyncio
@pytest.mark.parametrize("command", ["/extend 4", "/extended 10", "/extend", "/extend 4+1", "/extend 4 r", "/extend 4 no10", "/extend 4 8a", "/extend 4 patient", "/extend 4 fumble", "/extend 4 p5", "/extend 4 f-2"])
async def test_extend(command):
	prompt = bot.CommandPrompt(command, "Test UserName", True, None, None)
	result = await bot.processCommand(prompt)
	assert result != None

@pytest.mark.asyncio
@pytest.mark.parametrize(("command", "admin"), [("/cleanup", False), ("/cleanup", True), ("/cleanup all", True), ("/cleanup 1w", True), ("/cleanup 12d", True), ("/cleanup 24h", True), ("/cleanup 6m", True), ("/cleanup 1s", True),
												("/cleanup 1w12d3h2m1s", True)])
async def test_cleanup(command, admin):
	prompt = bot.CommandPrompt(command, "Test UserName", admin, None, None)
	result = await bot.processCommand(prompt)
	assert result != None

@pytest.mark.asyncio
@pytest.mark.parametrize("command", ["/roll d12", "/roll 6d12", "/roll 0d12", "/roll 2d0", "/roll d12+8", "/roll d12-d4", "/roll d12+4d6-5", "/roll d12+4d6-5", "/roll d12+-4d6-5"])
async def test_rolldice(command):
	prompt = bot.CommandPrompt(command, "Test UserName", False, None, None)
	result = await bot.processCommand(prompt)
	assert result != None

@pytest.mark.asyncio
@pytest.mark.parametrize("command", ["/roll adv 1d20", "/roll disadv 1d20", "/roll adv 3d20+1d6", "/roll disadv 3d20+1d6", "/roll 1d20 adv", "/roll 1d20 disadv"])
async def test_rolldice_advantage(command):
	prompt = bot.CommandPrompt(command, "Test UserName", False, None, None)
	for i in range(100):
		result = await bot.processCommand(prompt)
		assert result != None

@pytest.mark.asyncio
@pytest.mark.parametrize(("str", "echo"), [("normal", "normal"), ("with space", "with space"), (" leading space", "leading space"), ("trailing space ", "trailing space"), ("break\r\nline ", "break\r\nline"), ("", ""), (" ", "")])
async def test_echo(str, echo):
	prompt = bot.CommandPrompt("/echo " + str, "Test UserName", False, None, None)
	result = await bot.processCommand(prompt)
	assert result.message == echo

@pytest.mark.asyncio
@pytest.mark.parametrize(("str", "echo"), [("normal", "normal"), ("with space", "with space"), (" leading space", "leading space"), ("trailing space ", "trailing space"), ("break\r\nline ", "break\r\nline"), ("", ""), (" ", "")])
async def test_echoSoft(str, echo):
	prompt = bot.CommandPrompt("/echosoft " + str, "Test UserName", False, None, None)
	result = await bot.processCommand(prompt)
	assert result.message == echo

@pytest.mark.asyncio
@pytest.mark.parametrize("command", ["/choose a b", "/choice a", "/choose"])
async def test_choose(command):
	prompt = bot.CommandPrompt(command, "Test UserName", False, None, None)
	result = await bot.processCommand(prompt)
	assert result != None

@pytest.mark.asyncio
@pytest.mark.parametrize(("command", "response"), [("/customCommandTest", "root response"), ("/customCommandTest param1a", "1a response"), ("/customCommandTest param1a derp", "1a default"), ("/customCommandTest param1a param2b", "1a 2b response"), ("/customCommandTest param1b", "1b default: param1b"), ("normalText", None)])
async def test_customCommands(command, response):
	prompt = bot.CommandPrompt(command, "Test UserName", False, None, None)
	result = await bot.processCommand(prompt)
	assert (result == None and response == None) or (result.message == response)

@pytest.mark.asyncio
@pytest.mark.parametrize(("command", "responseValid"), [("/thiemo", True), ("/potg", True), ("/", False), ("", False)])
async def test_soundboardCommand(command, responseValid):
	prompt = bot.CommandPrompt("/thiemo", "Test UserName", True, None, None)
	result = await bot.processCommand(prompt)
	assert not responseValid or (result != None and result.succeeded() == True)

@pytest.mark.asyncio
@pytest.mark.parametrize(("command"), ["/thiemo", "/potg"])
async def test_soundboardCommand_sequential(command):
	prompt1 = bot.CommandPrompt(command, "Test UserName", True, None, None)
	result1 = await bot.processCommand(prompt1)
	assert result1 != None
	prompt2 = bot.CommandPrompt(command, "Test UserName", True, None, None)
	result2 = await bot.processCommand(prompt2)
	assert result2 != None

@pytest.mark.asyncio
async def test_stopSoundboardCommand():
	prompt1 = bot.CommandPrompt("/thiemo", "Test UserName", True, None, None)
	command1 = bot.processCommand(prompt1)
	prompt2 = bot.CommandPrompt("/stop", "Test UserName", True, None, None)
	result2 = await bot.processCommand(prompt2)
	result1 = await command1
	assert result1 != None and result1.succeeded() and result2 != None

@pytest.mark.asyncio
async def test_soundlist():
	prompt = bot.CommandPrompt("/soundlist", "Test UserName", True, None, None)
	for i in range(100):
		result = await bot.processCommand(prompt)
		assert result != None

@pytest.mark.asyncio
async def test_steveCommand():
	prompt = bot.CommandPrompt("/steve", "Test UserName", True, None, None)
	result = await bot.processCommand(prompt)
	assert result != None and result.succeeded()

@pytest.mark.asyncio
async def test_plotCommand():
	prompt = bot.CommandPrompt("/plot", "Test UserName", True, None, None)
	result = await bot.processCommand(prompt)
	assert result != None and result.succeeded()



########## KEEP LAST ##########
@pytest.mark.asyncio
@pytest.mark.parametrize(("command", "admin"), [("/shutdown", False), ("/shutdown", True)])
async def test_shutdown(command, admin):
	prompt = bot.CommandPrompt(command, "Test UserName", admin, None, None)
	if admin:
		with pytest.raises(SystemExit) as e:
			await bot.processCommand(prompt)
		assert e.type == SystemExit
		assert e.value.code == 0
	else:
		result = await bot.processCommand(prompt)
		assert result != None
