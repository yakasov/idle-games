// ==UserScript==
// @name         Array Game Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Array%20Game%20Autoplay.users.js
// @version      0.6.9
// @description  Autoplays Array Game by Demonin
// @author       yakasov
// @match        https://demonin.com/games/arrayGame/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=demonin.com
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* eslint-disable no-undef */
let started = false;
const resetScaling = [5, 8, 9, 10];
let challenges = {
    0: {
        // CH-A1: A-1 prod ^0.5, cannot buy A gens
        1: { BAmount: new Decimal(1e9), CAmount: new Decimal(1) },
        2: { BAmount: new Decimal(1e8), CAmount: new Decimal(2) },
        3: { BAmount: new Decimal(1.5e12), CAmount: new Decimal(3) },
        4: { BAmount: new Decimal(1e15), CAmount: new Decimal(30) },
        5: { BAmount: new Decimal(2e22), CAmount: new Decimal(50) },
        6: { BAmount: new Decimal(2e36), CAmount: new Decimal(50) },
    },
    1: {
        // CH-A2: A-2 amount divides A-2 prod
        1: { BAmount: new Decimal(1e12), CAmount: new Decimal(10) },
        2: { BAmount: new Decimal(1e15), CAmount: new Decimal(30) },
        3: { BAmount: new Decimal(2e22), CAmount: new Decimal(50) },
        4: { BAmount: new Decimal(2e26), CAmount: new Decimal(50) },
        5: { BAmount: new Decimal(2e32), CAmount: new Decimal(50) },
        6: { BAmount: new Decimal(2e36), CAmount: new Decimal(50) },
    },
    2: {
        // CH-A3: no A-3
        1: { BAmount: new Decimal(1e40), CAmount: new Decimal(50) },
        2: { BAmount: new Decimal(3e47) },
        3: { BAmount: new Decimal(2e62) },
        4: { BAmount: new Decimal(8e78) },
        5: { BAmount: new Decimal(1e97), CAmount: new Decimal(2e4) },
        6: { BAmount: new Decimal(2e113), CAmount: new Decimal(1e6) },
    },
    3: {
        // CH-A4: A gen prod ^0.2
        1: { BAmount: new Decimal(1e68) },
        2: { BAmount: new Decimal(7e83), CAmount: new Decimal(2e4) },
        3: { BAmount: new Decimal(1e115), CAmount: new Decimal(5e6) },
        4: { BAmount: new Decimal(1e120), CAmount: new Decimal(1e7) },
        5: { BAmount: new Decimal(1e140), CAmount: new Decimal(2.5e8) },
        6: { BAmount: new Decimal(5e157), CAmount: new Decimal(1e10) },
    },
    4: {
        // CH-B1: B gens + A boosters cannot be produced, B gens can be bought
        1: { CAmount: new Decimal(1e7), DAmount: new Decimal(1) }, // could be lower?
        2: { CAmount: new Decimal(1e10), DAmount: new Decimal(2) },
        3: { CAmount: new Decimal(1e10), DAmount: new Decimal(5) },
        4: { CAmount: new Decimal(1e18), DAmount: new Decimal(75) }, // not 100% accurate
        5: { CAmount: new Decimal(1e23), DAmount: new Decimal(200) },
        6: { CAmount: new Decimal(6e30), DAmount: new Decimal(1000) },
    },
    5: {
        // CH-B2: no B-1 prod, C-1 makes A-5, A-1 ^0.5
        1: { CAmount: new Decimal(1e12), DAmount: new Decimal(30) },
        2: { CAmount: new Decimal(1e18), DAmount: new Decimal(100) },
        3: { CAmount: new Decimal(1e27), DAmount: new Decimal(400) },
        4: { CAmount: new Decimal(3e32) },
        5: { CAmount: new Decimal(2e38) },
        6: { CAmount: new Decimal(1e44) },
    },
    6: {
        // CH-B3: A + B gen prod / 1e35
        1: { CAmount: new Decimal(1e12) }, // could be lower?
        2: { CAmount: new Decimal(2e30), DAmount: new Decimal(150) },
        3: { CAmount: new Decimal(1e35) },
        4: { CAmount: new Decimal(1e37) }, // wait for D milestone 12
        5: { CAmount: new Decimal(1e44) }, // could be lower?
        6: { CAmount: new Decimal(2e47) },
    },
    7: {
        // CH-B4: A + B gen prod ^ 0.1
        1: { CAmount: new Decimal(1e51) },
        2: { CAmount: new Decimal(1e55) }, // could be lower? affected by D milestone 16
        3: { CAmount: new Decimal(1e57) }, // could be lower? affected by D milestone 16
        4: { CAmount: new Decimal(1e64) }, // completes around 1e65 and 2.5e6
        5: { CAmount: new Decimal(2e68) }, // completes around 6e69 and 9e6
        6: { CAmount: new Decimal(3e72) }, // completes around 2.3e74 and 8e7
    },
};

function autobuyA() {
    if (game.CMilestonesReached < 6) {
        for (let i = 1; i < 3; i++) {
            buyUpgrade(1, i);
        }

        if (game.BUpgradesBought[4].mag) {
            buyUpgrade(1, 3);
        }
    }

    if (game.CMilestonesReached < 8) {
        buyMaxGenerators(1, 6);
    }
}

function autobuyB() {
    if (!game.currentChallenge || game.currentChallenge === 5) {
        if (game.DMilestonesReached < 6) {
            for (let i = 1; i < 9; i++) {
                if (!game.BUpgradesBought[i - 1].mag) {
                    buyUpgrade(2, i);
                }
            }
        }

        if (game.CMilestonesReached >= 14) {
            buyUpgrade(2, 9);
        }

        // Only buy B generators if we passively gain B or we don't gain enough for it to be worth waiting for
        if (
            (game.BUpgradesBought[2].mag || game.array[1].mag < 60) &&
            game.DMilestonesReached < 7
        ) {
            if (game.DMilestonesReached < 6) {
                buyABoosterator();
            }
            buyMaxGenerators(2, 6);
        }
    }
}

function autobuyC() {
    // Save C for A + B multiplier instead of spending whilst unlocking milestones
    if (
        !game.currentChallenge &&
        ((game.CMilestonesReached >= 6 && game.CGeneratorsBought[0].mag <= 3) ||
            (game.CMilestonesReached >= 8 &&
                game.CGeneratorsBought[0].mag <= 6) ||
            game.CMilestonesReached >= 10)
    ) {
        buyMaxGenerators(3, 6);
    }
}

function autobuyD() {
    if (
        !game.currentChallenge &&
        ((game.DMilestonesReached >= 5 && game.DGeneratorsBought[0].mag <= 3) ||
            (game.DMilestonesReached >= 8 &&
                !(game.array[3].mag > 1e4 && game.DMilestonesReached < 14) && // if D > 10000, save for 50000 milestone then 200000 milestone
                !(game.array[3].mag > 2.5e5 && game.DMilestonesReached < 15) && // if D > 250000, save for 2.5 mil milestone
                !(game.array[3].mag > 1e7 && game.DMilestonesReached < 16))) // if D > 10 mil, save for 75 mil milestone
    ) {
        buyMaxGenerators(4, 6);
    }
}

function resetForB() {
    // Only prestige if we can actually gain something and if we don't already passively gain B
    if (
        !game.currentChallenge &&
        !game.BUpgradesBought[2].mag &&
        game.BToGet.mag &&
        game.array[0].gte(1e10)
    ) {
        prestigeConfirm(1);
    }
}

function resetForC() {
    // Only prestige if we can actually gain something and if we don't already passively gain C
    if (
        !game.currentChallenge &&
        game.array[1].gte(1e10) &&
        game.CMilestonesReached < 10 &&
        resetScaling.some(cubicPrestigeReqs, [
            game.CMilestonesReached,
            game.CToGet.mag,
        ])
    ) {
        prestigeConfirm(2);
    }
}

function resetForD() {
    // Only prestige if we can actually gain something and if we don't already passively gain D
    // Only reset if all 24 A challenges are done
    if (
        !game.currentChallenge &&
        game.challengesBeaten.slice(0, 4) == "6,6,6,6" &&
        game.array[2].gte(1e10) &&
        game.DMilestonesReached < 8 &&
        resetScaling.some(cubicPrestigeReqs, [
            game.DMilestonesReached,
            game.DToGet.mag,
            "D",
        ])
    ) {
        prestigeConfirm(3);
    }
}

function cubicPrestigeReqs(x) {
    // Adjusts prestige gain depending on milestone count
    // y = 0.0667x^3 - 1.3x^2 + 8.633x - 18
    // 5m => 1tg, 8m => 2tg, 9m => 3tg, 10m => 5tg... (tg: to get)
    return (
        this[0] < x &&
        this[1] >=
            Math.floor(
                ((1 / 15) * x ** 3 - 1.3 * x ** 2 + (259 / 30) * x - 18) *
                    (this[2] ? 1 : game.array[3].pow(0.8).mul(3).add(1))
            )
    );
}

function startChallenges() {
    if (!game.currentChallenge && started) {
        for (const [ch, tiers] of Object.entries(challenges)) {
            for (const [tier, reqs] of Object.entries(tiers)) {
                if (
                    game.challengesBeaten[ch] < tier &&
                    game.array[1].gte(reqs.BAmount ?? 0) &&
                    game.array[2].gte(reqs.CAmount ?? 0) &&
                    game.array[3].gte(reqs.DAmount ?? 0)
                ) {
                    enterChallenge(parseInt(ch) + 1);
                }
            }
        }
    }
}

function completeChallenges() {
    if (game.currentChallenge && started) {
        const ch = game.currentChallenge - 1;
        const tier = game.challengesBeaten[ch];
        const goal = new Decimal(challengeGoals[ch][tier]);
        if (game.array[0].gte(goal)) {
            finishChallenge();
        }
    }
}

function setTitleText() {
    let el = document.getElementById("titleText");
    el.innerText = `Array Game - Autoplay ${started ? "ON" : "OFF"}`;
}

function checkConfirmations() {
    for (let i = 1; i < 5; i++) {
        if (game.confirmations[i - 1]) {
            toggleConfirmation(i);
        }
    }
}

function main() {
    if (started) {
        autobuyA();
        autobuyB();
        autobuyC();
        autobuyD();
    }
}

function mainPrestige() {
    if (started) {
        resetForB();
        resetForC();
        resetForD();
    }
}

GM_registerMenuCommand("Toggle autoplay", () => {
    started = !started;
    setTitleText();
});

setTitleText();
checkConfirmations();
setInterval(main, 100); // 1/10 seconds to try and buy generators (and upgrades)
setInterval(mainPrestige, 15000); // 15 seconds to try and prestige
setInterval(startChallenges, 1000); // 1 second to try and enter challenges
setInterval(completeChallenges, 1000); // 1 second to try and complete challenges
