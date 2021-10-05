
import pytest
import discord
import discord.ext.test as dpytest
import GodMachine.bot as bot
"""
@pytest.fixture
def botFixture(event_loop):
	botClient = bot.MyClient(loop=event_loop)
	dpytest.configure(botClient)
	return botClient

@pytest.mark.asyncio
async def test_startup(botFixture):
	await dpytest.message("/test")
	assert dpytest.verify().message().contains().content("Ping:")
"""