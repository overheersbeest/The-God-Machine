
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
async def test_shutdown(botFixture):
	guild = discord.Guild(data={'id':0},state={})
	channel = discord.TextChannel(state={}, guild=guild, data={})
	member = discord.Member()
	await dpytest.message("/shutdown", channel = channel, member = member)
	assert dpytest.verify().message().contains().content("Ping:")
"""