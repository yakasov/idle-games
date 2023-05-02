// ==UserScript==
// @name         Endless Stairwell Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Endless%Stairwell%20Autoplay.users.js
// @version      1.0.4
// @description  Autoplays Endless Stairwell by Demonin
// @author       yakasov
// @match        https://demonin.com/games/endlessStairwell/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=demonin.com
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* eslint-disable no-undef */
/* eslint-disable no-loss-of-precision */

let started = false;
let currentSection = 0;
let nanMonsters = 0;
let target = 0;
let targetOverride = 0;
const runes = [4, 4, 4];
const blueKeyFloor = 49;
const eelFloor = 303;
const sharkTalkFloor = 305;
const jellyFloor = 349;
const goldenEelFloor = 499;
const cocoaUpgrades = { 1: 6, 3: 5, 4: 40, 5: 115, 6: 600, 7: 2200 };
const combinator2Upgrades = {
    2: "J110",
    3: "J300",
    4: "J1000",
    5: "J1500",
    6: "J2000",
    8: "J40000",
    9: "J100000",
    10: "J1e29",
};
const bloodUpgrades = {
    0: "J1e44",
    1: "J1e55",
    2: "J1e69",
    3: "J1e87",
    4: "J1e100",
    5: "J1e122",
    6: "J1e420",
    7: "Je1e100",
};
const shark2Upgrades = {
    0: "JJ50",
    1: "JJ1e80",
    2: "JJ10^^60",
    3: "JJ10^^^60",
};
const goldenHoneyUpgrades = {
    0: ExpantaNum.expansion(10, 10),
    1: ExpantaNum.expansion(10, 15),
    2: ExpantaNum.expansion(10, 25),
    3: ExpantaNum.expansion(10, 50),
    4: ExpantaNum.expansion(10, 100),
    5: ExpantaNum.expansion(10, 500),
    6: ExpantaNum.expansion(10, 5000),
    7: ExpantaNum.expansion(10, 15000000),
    8: ExpantaNum.expansion(10, 1e8),
};

let previousKey = 0;
let pressedKey = 0;
let debugRunOnce = false;

function setTitleText() {
    let el = document.getElementsByClassName("title-bar-text")[0];
    let prestigeAt = game.cocoaHoney.mul(1.8).floor();
    let prestigeAtDisplay = `${format(prestigeAt, 0)} (LVL ${format(
        ExpantaNum(500).mul(ExpantaNum(2).pow(prestigeAt)),
        0
    )})`;
    let nextEel = format(ExpantaNum(gemEelLevels[game.gemEelsBeaten]), 0);
    let blood = format(game.monsterBlood, 0);
    let timeSinceAttack = format(game.timeSinceAttack, 2);
    let runesBought = `${game.redPermanentBought} ${game.bluePermanentBought} ${game.greenPermanentBought}`;
    el.innerText = `Endless Stairwell - Autoplay ${
        started ? "ON" : "OFF"
    } - Prestige @ ${prestigeAtDisplay} - Section ${currentSection} - Last Key ${previousKey} (${pressedKey}) - Next Eel ${nextEel} - Blood ${blood} - NaNs ${nanMonsters} - Target ${target} (${targetOverride}) - Last ATK ${timeSinceAttack} - Deaths ${
        game.deaths
    } - Runes ${runesBought}`;
}

class mainFuncs {
    constructor(tier, targets) {
        this.floorTarget = 0;
        this.tier = tier;
        this.targets = targets; // level must be > (v) to go to difficulty (k + 1)
        this.buffed = false; // use buffed so floorTarget doesn't get incremented more than once
        this.floorTargetOverride = null; // useful for fighting a specific floor eg 49
    }

    main() {
        if (document.getElementById("deathDiv").style.display == "block") {
            this.cocoaPrestigeNoConfirm();
            deathClose();
        }

        if (!game.floorDifficulty && game.fightingMonster) {
            // sometimes, I don't know how, it can get stuck in a fight against a NaN health monster
            // obviously it's impossible to beat so just 'cheat' a bit and exit the fight and go to the stairwell
            // once I figure it out I'll work around it properly
            //
            // they only occur in section 7, at floor ~290 (the top difficulty for tier 6)
            // the floor difficulty is set to 0 for some reason, I dunno
            nanMonsters++;
            game.fightingMonster = false;
            toStairwell();
        } else if (game.roomsExplored >= 3000) {
            // similarly the automation breaks at room ~4000. again I have no clue why
            // probably just the way the health is increasing or something
            toStairwell();
        }

        if (this.shouldCocoaPrestige) {
            this.cocoaPrestigeNoConfirm();
        }

        this.setFloorTarget();
        targetOverride = this.floorTargetOverride;

        if (this.shouldMoveToStairwell) {
            // move to stairwell if floorTarget has changed
            this.moveToStairwell();
        } else if (this.checkTempRunes && game.level.lte(10000)) {
            this.getTempRunes();
        } else if (this.checkPermRunes && game.level.lte(10000)) {
            this.getPermRunes(this.checkPermRunes);
        } else if (
            this.floorTarget ||
            this.floorTargetOverride ||
            !Object.keys(this.targets).length
        ) {
            this.getXP();
        }
    }

    get shouldCocoaPrestige() {
        return (
            (cocoaHoneyToGet.gte(game.cocoaHoney.mul(1.8).floor()) &&
                game.cocoaBars < 9 &&
                game.cocoaHoney.lte("10^^10")) ||
            (cocoaHoneyToGet.gte(cocoaBarRequirements[game.cocoaBars]) &&
                game.cocoaHoney.lt(cocoaBarRequirements[game.cocoaBars])) ||
            (game.cocoaBars >= 19 && game.cocoaHoney.lte("10^^^25")) ||
            (game.cocoaHoney.eq(0) && game.level.gte(500))
        );
    }

    get shouldMoveToStairwell() {
        return (
            !this.floorTargetOverride &&
            game.currentFloor !==
                game.floorsWithRooms[this.tier][this.floorTarget] &&
            game.roomsFromStairwell
        );
    }

    get checkTempRunes() {
        const runesCheck = runes.every((v, i) => {
            return game.runeFragments[i] >= v;
        });
        return runesCheck && game.honey.gte(3) && !this.buffed;
    }

    get checkPermRunes() {
        if (this.buffed && game.honey.gte(1)) {
            const runeAmounts = [
                [game.redPermanentBought, 10],
                [game.greenPermanentBought, 5],
                [game.bluePermanentBought, 5],
            ];
            for (let i = 0; i < 3; i++) {
                if (
                    game.runeFragments[i] >= 4 &&
                    runeAmounts[i][0] < runeAmounts[i][1]
                ) {
                    return i + 1;
                }
            }
        }
        return false;
    }

    setFloorTarget() {
        if (this.floorTargetOverride) {
            return;
        }

        for (const [k, v] of Object.entries(this.targets)) {
            if (
                (game.level.lt(v) && currentSection < 4) ||
                game.attackDamage.lt(v)
            ) {
                this.floorTarget = k;
                break;
            }
        }

        if (game.buffTimes[0] && this.floorTarget !== 3 && !this.buffed) {
            // if we have the temp buffs, increase the floor target
            // this should probably only be for floors up to 50
            this.floorTarget++;
            this.buffed = true;
        } else if (!game.buffTimes[0] && this.buffed) {
            this.buffed = false;
        }
    }

    getTempRunes() {
        if (game.roomsFromStairwell) {
            return this.moveToStairwell();
        }

        if (this.moveToFloor(game.smithFloor)) {
            for (let i = 1; i < 4; i++) {
                smithRune(i);
            }
        }
    }

    getPermRunes(i) {
        if (game.roomsFromStairwell) {
            return this.moveToStairwell();
        }

        if (this.moveToFloor(game.smithFloor + 1)) {
            smithPermaRune(i);
        }
    }

    basicAttack() {
        if (
            game.fightingMonster &&
            game.currentFloor > 100 &&
            game.monsterHealth.gt(game.attackDamage)
        ) {
            flee();
            return toStairwell();
        }

        if (
            (game.vanillaHoney.gte(1) &&
                game.energy < 25 &&
                !game.altarUpgradesBought[2]) ||
            game.vanillaHoney.gte(100)
        ) {
            // consume vanilla honey for energy
            consumeHoney(2);
        }

        if (
            game.fightingMonster &&
            game.energy >= 20 &&
            (game.energy >= 75 || game.timeSinceAttack >= 2)
        ) {
            attack();
            if (game.health.lte(game.maxHealth.div(2.5)) && game.honey.gte(1)) {
                consumeHoney(1);
            }
        } else if (!game.fightingMonster) {
            if (
                game.health.lte(game.maxHealth.div(1.5)) &&
                game.health.lte(1e5)
            ) {
                // go to stairwell if health low
                toStairwell();
            } else if (
                game.energy >= 60 ||
                game.attackDamage.gt(game.monsterMaxHealth)
            ) {
                newRoom();
            }
        }
    }

    moveToFloor(floor, enter = false) {
        target = floor;

        if (
            floor !== game.currentFloor &&
            game.roomsFromStairwell &&
            !game.fightingMonster &&
            game.currentFloor !== eelFloor
        ) {
            return this.moveToStairwell();
        }

        this.fastTravel(floor);

        if (game.currentFloor > floor) {
            floorDown();
            return false;
        } else if (game.currentFloor < floor) {
            floorUp();
            return false;
        }

        if (enter && !game.roomsFromStairwell) {
            if (game.energy !== 100) {
                return false;
            }
            console.log(`Entering floor ${floor}`);
            return enterFloor();
        }
        return true;
    }

    moveToStairwell() {
        if (game.fightingMonster) {
            this.basicAttack();
        } else {
            toStairwell();
        }
    }

    fastTravel(floor) {
        if (
            floor >= 1 &&
            floor <= 25 &&
            game.currentFloor > 25 &&
            game.altarUpgradesBought[4]
        ) {
            console.log("Fast travelling to ground floor");
            toGroundFloor();
        } else if (
            floor >= 26 &&
            floor <= 75 &&
            (game.currentFloor < 25 || game.currentFloor > 75) &&
            game.altarUpgradesBought[4]
        ) {
            console.log("Fast travelling to floor 49");
            toFloor49();
        } else if (
            floor >= 76 &&
            floor <= 125 &&
            (game.currentFloor < 75 || game.currentFloor > 125) &&
            game.altarUpgradesBought[4]
        ) {
            console.log("Fast travelling to floor 99");
            toFloor99();
        } else if (
            floor >= 126 &&
            floor <= 200 &&
            (game.currentFloor < 125 || game.currentFloor > 200) &&
            game.sharkUpgradesBought[2]
        ) {
            console.log("Fast travelling to floor 149");
            toFloor149();
        } else if (
            floor >= 201 &&
            floor <= 275 &&
            (game.currentFloor < 200 || game.currentFloor > 275) &&
            game.combinatorUpgradesBought[2]
        ) {
            console.log("Fast travelling to floor 248");
            toFloor248();
        } else if (
            floor >= 276 &&
            floor <= 325 &&
            (game.currentFloor < 275 || game.currentFloor > 325) &&
            game.combinatorUpgrades2Bought[4]
        ) {
            console.log("Fast travelling to floor 299");
            toFloor299();
        } else if (
            floor >= 326 &&
            game.currentFloor < 325 &&
            game.goldenUpgradesBought[0]
        ) {
            console.log("Fast travelling to floor 351");
            toFloor351();
        }
    }

    getXP() {
        if (
            this.moveToFloor(
                this.floorTargetOverride ??
                    game.floorsWithRooms[this.tier][this.floorTarget],
                true
            )
        ) {
            this.basicAttack();
        }
    }

    cocoaPrestigeNoConfirm() {
        // script.js: 1570
        if (cocoaHoneyToGet.gt(0)) {
            game.cocoaHoney = game.cocoaHoney.add(cocoaHoneyToGet);
            this.lifetimeCocoaHoney += cocoaHoneyToGet;
            cocoaReset();
        }
    }
}

class Section1 extends mainFuncs {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        if (game.specialItemsAcquired[0] && game.level.gte(22)) {
            this.floorTargetOverride = blueKeyFloor;
        } else {
            this.floorTargetOverride = null;
        }

        super.main();
    }
}

class Section2 extends mainFuncs {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        if (game.roomsExplored >= 300) {
            super.moveToStairwell();
        }
        this.buyAltarUpgrades();
        super.main();
    }

    buyAltarUpgrades() {
        for (const [k, v] of Object.entries(cocoaUpgrades)) {
            if (game.cocoaHoney.gte(v)) {
                buyAltarUpgrade(k);
            }
        }
    }
}

class Section3 extends mainFuncs {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.buySharkUpgrades();
        this.gainCocoaBarsNoConfirm();
        super.main();
    }

    buySharkUpgrades() {
        for (let i = 2; i < 12; i++) {
            buySharkUpgrade(i);
        }
    }

    gainCocoaBarsNoConfirm() {
        // script.js: 2025
        if (game.cocoaHoney.gte(cocoaBarRequirement)) {
            game.cocoaBars++;
            cocoaReset();
            game.cocoaHoney = ExpantaNum(0);
            if (game.cocoaBars >= 10) {
                document.getElementById("darkOrbIcon").style.display = "block";
                document.getElementById("darkOrbText").style.display = "block";
            }
            for (i = 0; i < cbmRequirements.length; i++) {
                if (game.cocoaBars >= cbmRequirements[i]) {
                    document.getElementsByClassName("cocoaBarMilestoneDiv")[
                        i
                    ].style.backgroundColor = "#40d040";
                }
            }
            if (game.cocoaBars >= 20) {
                document.getElementById("ringIcon").src = "img/ring3.png";
                document.getElementById("hyperplasmIcon").style.display =
                    "block";
                document.getElementById("hyperplasmText").style.display =
                    "block";
                document.getElementById("darkBarIcon").style.display = "block";
                document.getElementById("darkBarText").style.display = "block";
                document.getElementById("starBarIcon").style.display = "block";
                document.getElementById("starBarText").style.display = "block";
            }
        }
    }
}

class Section4 extends Section3 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.darkOrbPrestigeNoConfirm();
        super.main();
    }

    darkOrbPrestigeNoConfirm() {
        // script.js: 2096
        if (game.cocoaHoney.gte(darkOrbRequirements[game.darkOrbs])) {
            game.darkOrbs++;
            darkOrbReset();
            $("#darkOrbBonuses").html(darkOrbBonuses[game.darkOrbs]);
            if (game.darkOrbs >= 1) {
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[6].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[7].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[8].style.display = "inline-block";
            }
            if (game.darkOrbs >= 2) {
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[9].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[10].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[11].style.display = "inline-block";
            }
            if (game.darkOrbs >= 4) {
                document.getElementById("getCocoaBarsButton").disabled = true;
                setInterval(autoCocoaBars, 100);
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[12].style.display = "inline-block";
                document.getElementsByClassName(
                    "cocoaBarMilestoneDiv"
                )[13].style.display = "inline-block";
            }
        }
    }
}

class Section5 extends Section4 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.combinate();
        this.buyCombinatorUpgrades();
        super.main();
    }

    get shouldCocoaPrestige() {
        return (
            game.cocoaHoney.eq(0) ||
            (game.roomsExplored >= 500 && game.cocoaHoney.lt("10^^^10^^2")) ||
            (cocoaHoneyToGet.gte(darkOrbRequirements[game.darkOrbs]) &&
                game.cocoaHoney.lt(darkOrbRequirements[game.darkOrbs]))
        );
    }

    combinate() {
        for (let i = 1; i < 4; i++) {
            combinate(i);
        }
    }

    buyCombinatorUpgrades() {
        for (let i = 1; i < 11; i++) {
            buyCombinatorUpgrade(i);
        }
    }
}

class Section6 extends Section5 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.buyCombinatorUpgrades();
        super.main();
    }

    get shouldCocoaPrestige() {
        if (game.roomsExplored >= 1000) {
            return true;
        }

        for (const [k, v] of Object.entries(combinator2Upgrades)) {
            if (cocoaHoneyToGet.gte(v) && !game.combinatorUpgrades2Bought[k]) {
                return true;
            }
        }
        return super.shouldCocoaPrestige;
    }

    buyCombinatorUpgrades() {
        for (let i = 1; i < 12; i++) {
            buyCombinatorUpgrade2(i);
        }
    }
}

class Section7 extends Section5 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        if (game.energy < 100) {
            consumeHoney(2);
        }
        this.buyBloodUpgrades();
        this.buyBloodProducers();
        super.main();
    }

    get shouldCocoaPrestige() {
        if (game.roomsExplored >= 500 && game.currentFloor < 350) {
            return true;
        }

        for (const [k, v] of Object.entries(bloodUpgrades)) {
            if (cocoaHoneyToGet.gte(v) && !game.monsterBloodUpgradesBought[k]) {
                return true;
            }
        }

        return super.shouldCocoaPrestige;
    }

    buyBloodUpgrades() {
        for (let i = 1; i < 11; i++) {
            buyMonsterBloodUpgrade(i);
        }
    }

    buyBloodProducers() {
        for (let i = 1; i < 7; i++) {
            buyBloodProducer(i);
        }
    }

    basicAttack() {
        if (
            game.attackDamage.gt(ExpantaNum(gemEelLevels[game.gemEelsBeaten]))
        ) {
            this.floorTargetOverride = eelFloor;
            if (super.moveToFloor(eelFloor, true)) {
                if (game.attackDamage.gt(game.monsterMaxHealth)) {
                    return attack();
                } else {
                    return flee();
                }
            }
        } else {
            this.floorTargetOverride = null;
            if (Object.keys(this.targets).length) {
                if (
                    this.moveToFloor(
                        game.floorsWithRooms[this.tier][this.floorTarget],
                        true
                    )
                ) {
                    return super.basicAttack();
                }
            } else {
                this.floorTargetOverride = game.floorsWithRooms[5][3];
                if (super.moveToFloor(game.floorsWithRooms[5][3], true)) {
                    return super.basicAttack();
                }
            }
        }
    }
}

class Section8 extends Section7 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        if (this.shouldTalkToShark) {
            this.talkToShark();
        } else if (!game.jellyDefeated) {
            this.fightJelly();
        } else {
            this.buySharkUpgrades();
            super.main();
        }
    }

    get shouldCocoaPrestige() {
        for (const [k, v] of Object.entries(shark2Upgrades)) {
            if (cocoaHoneyToGet.gte(v) && !game.sharkUpgrades2Bought[k]) {
                return true;
            }
        }
        return super.shouldCocoaPrestige;
    }

    get shouldTalkToShark() {
        return (
            !game.sharkCutscenesViewed ||
            (game.jellyFought && game.sharkCutscenesViewed === 1) ||
            (game.jellyDefeated && game.sharkCutscenesViewed === 2)
        );
    }

    buySharkUpgrades() {
        for (let i = 1; i < 8; i++) {
            buySharkUpgrade2(i);
        }
    }

    talkToShark() {
        if (super.moveToFloor(sharkTalkFloor)) {
            sharkDialogueContinue();
        }

        if (document.getElementById("glockGetDiv").style.display == "block") {
            closeGlockDiv();
        }
    }

    fightJelly() {
        if (!game.jellyFought && game.sharkCutscenesViewed === 1) {
            if (super.moveToFloor(jellyFloor, true)) {
                flee();
            }
        } else if (!game.jellyDefeated && game.sharkCutscenesViewed === 2) {
            if (super.moveToFloor(jellyFloor, true)) {
                attack();
            }
        }
    }
}

class Section9 extends Section8 {
    constructor(tier, targets) {
        super(tier, targets);
    }

    main() {
        this.buyGoldenHoneyUpgrades();
        if (
            game.level.gte(ExpantaNum.expansion(10, 1e12)) &&
            !game.goldenEelDefeated
        ) {
            this.killGoldenEel();
        } else if (game.goldenEelDefeated) {
            super.moveToFloor(500);
        } else {
            super.main();
        }
    }

    get shouldCocoaPrestige() {
        for (const [k, v] of Object.entries(goldenHoneyUpgrades)) {
            if (cocoaHoneyToGet.gte(v) && !game.goldenUpgradesBought[k]) {
                return true;
            }
        }
        return super.shouldCocoaPrestige;
    }

    buyGoldenHoneyUpgrades() {
        for (let i = 1; i < 10; i++) {
            buyGoldenUpgrade(i);
        }
    }

    killGoldenEel() {
        if (super.moveToFloor(goldenEelFloor)) {
            goldenEelAttack();
            consumeHoney(2);
        }
    }
}

function main() {
    if (started || debugRunOnce) {
        if (debugRunOnce) {
            debugRunOnce = false;
        }

        if (!game.specialItemsAcquired[1] || game.level.lte(25)) {
            currentSection = 1;
            s1.main();
        } else if (
            (!game.altarUpgradesBought[6] && game.cocoaHoney.lte(2e4)) ||
            game.level.lte(1e100)
        ) {
            currentSection = 2;
            s2.main();
        } else if (game.cocoaBars < 10 && !game.sharkUpgradesBought[9]) {
            currentSection = 3;
            s3.main();
        } else if (game.cocoaBars < 20) {
            currentSection = 4;
            s4.main();
        } else if (
            !game.combinatorUpgradesBought[9] ||
            game.hyperplasm.lte(1e200)
        ) {
            currentSection = 5;
            s5.main();
        } else if (!game.combinatorUpgrades2Bought[10]) {
            currentSection = 6;
            s6.main();
        } else if (!game.monsterBloodUpgradesBought[9]) {
            currentSection = 7;
            s7.main();
        } else if (!game.sharkUpgrades2Bought[6]) {
            currentSection = 8;
            s8.main();
        } else {
            currentSection = 9;
            s9.main();
        }
    }
}

let s1 = new Section1(0, { 0: 10, 1: 17, 2: 20, 3: Infinity });
let s2 = new Section2(1, { 0: 40, 1: 55, 2: 80, 3: Infinity });
let s3 = new Section3(2, {
    0: 1e1000,
    1: "e1e15000",
    2: "e1e45000",
    3: Infinity,
});
let s4 = new Section4(3, {
    0: "10^^25",
    1: "10^^50",
    2: "10^^75",
    3: Infinity,
});
let s5 = new Section5(4, {
    0: "10^^^10000000",
    1: "10^^^^3",
    2: "10^^^10^^3",
    3: Infinity,
});
let s6 = new Section6(5, {
    0: "J20",
    1: "J40",
    2: "J55",
    3: Infinity,
});
let s7 = new Section7(6, {}); // section 7 is special and only has one monster floor, so no targets
let s8 = new Section8(6, {
    0: "JJ60",
    1: "JJ1e90",
    2: "JJ10^^60",
    3: Infinity,
});
let s9 = new Section9(7, {
    0: ExpantaNum.expansion(10, 75),
    1: ExpantaNum.expansion(10, 250),
    2: ExpantaNum.expansion(10, 5000),
    3: ExpantaNum.expansion(10, 1e6),
    6: ExpantaNum.expansion(10, 1e8),
    7: ExpantaNum.expansion(10, 1e10),
    8: ExpantaNum.expansion(10, 1e20),
});

document.addEventListener("keypress", (event) => {
    pressedKey = event.keyCode;
    if (
        (pressedKey === 122 || pressedKey === 120) &&
        pressedKey !== previousKey
    ) {
        debugRunOnce = true;
        previousKey = pressedKey;
    } else if (pressedKey == 99) {
        started = !started;
    }
});

setInterval(main, 5);
setInterval(setTitleText, 10);
GM_registerMenuCommand("Toggle autoplay", () => {
    started = !started;
});
