import pytest
import GodMachine.extendedActionAnalyzer as extendedActionAnalyzer

def test_simplecase():
	msg = extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(5, 0, 10, False, 0, 0)
	assert msg != None

@pytest.mark.parametrize("pool", [0, 5, 10])
def test_pool(pool):
	msg = extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(pool, 0, 10, False, 0, 0)
	assert msg != None

@pytest.mark.parametrize("poolModifier", [-3, 0, 3])
def test_modifier(poolModifier):
	msg = extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(5, poolModifier, 10, False, 0, 0)
	assert msg != None

@pytest.mark.parametrize("explode", [10, 9, 8])
def test_explode(explode):
	msg = extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(5, 0, explode, False, 0, 0)
	assert msg != None

@pytest.mark.parametrize("rote", [False, True])
def test_rote(rote):
	msg = extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(5, 0, 10, rote, 0, 0)
	assert msg != None

@pytest.mark.parametrize("fumble", [-2, 0, 1])
def test_fumble(fumble):
	msg = extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(5, 0, 10, False, fumble, 0)
	assert msg != None

@pytest.mark.parametrize("patient", [0, 2])
def test_patient(patient):
	msg = extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(5, 0, 10, False, 0, patient)
	assert msg != None

def test_promotedChance():
	msg = extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(0, 0, 10, True, 0, 0)
	assert msg != None

def test_distributionOperation_print():
	dist = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	print(dist)
	assert dist != None

def test_distributionOperation_linePrint():
	dist = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	print(dist.getLinePrint())
	assert dist != None

def test_distributionOperation_add():
	dist1 = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	dist2 = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	dist3 = dist1 + dist2
	assert dist3 != None
	dist4 = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	dist5 = extendedActionAnalyzer.Distribution(0, 0, 0, False)
	dist6 = dist4 + dist5
	assert dist6 != None
	dist7 = extendedActionAnalyzer.Distribution(0, 0, 0, False)
	dist8 = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	dist9 = dist7 + dist8
	assert dist9 != None

def test_distributionOperation_iadd():
	dist1 = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	dist2 = extendedActionAnalyzer.Distribution(0, 0, 0, False)
	dist1 += dist2
	assert dist1 != None

def test_distributionOperation_mul():
	dist = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	dist2 = dist * 5
	assert dist2 != None

def test_distributionOperation_imul():
	dist = extendedActionAnalyzer.getExtendedActionDistribution(5, 0, 0.1, True, 0, 0)
	dist *= 5
	assert dist != None
