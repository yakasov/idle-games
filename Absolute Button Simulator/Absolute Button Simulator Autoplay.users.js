// ==UserScript==
// @name         Absolute Button Simulator Autoplay
// @namespace    https://raw.githubusercontent.com/yakasov/new-tampermonkey-scripts/master/Absolute%20Button%20Simulator%20Autoplay.users.js
// @version      1.0
// @description  Autoplays Absolute Button Simulator by Demonin
// @author       yakasov
// @match        https://demonin.com/games/absoluteButtonSimulator/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=demonin.com
// ==/UserScript==

/* eslint-disable no-undef */

function autobuyMoney() {
    for (let i = 23; i >= 0; i--) {
        if (
            game.money.gte(moneyCosts[i]) &&
            (i === 23 || multMoneyBoost(i + 1).gte(game.multiplier.array))
        ) {
            buyMoney(i);
            return;
        }
    }
}

function multMoneyBoost(i) {
    return OmegaNum(moneyBoosts[i]).mul(
        game.rebirths.add(1).mul(game.multiPermaMult)
    );
}

function autoRebirth() {
    for (let i = 15; i >= 0; i--) {
        if (
            game.multiplier.gte(rebirthCosts[i]) &&
            (i === 15 || multRebirthBoost(i + 1).gte(game.rebirths))
        ) {
            buyRebirths(i);
            return;
        }
    }
}

function multRebirthBoost(i) {
    return OmegaNum(rebirthBoosts[i]).mul(
        game.prestiges.add(1).mul(game.rebirthPermaMult)
    );
}

function autoPrestige() {
    for (let i = 12; i >= 0; i--) {
        if (
            game.rebirths.gte(prestigeCosts[i]) &&
            (i === 12 || multPrestigeBoost(i + 1).gte(game.prestiges))
        ) {
            buyPrestiges(i);
            return;
        }
    }
}

function multPrestigeBoost(i) {
    return OmegaNum(prestigeBoosts[i]).mul(
        game.fire.add(1).mul(game.prestigePermaMult)
    );
}

function autoFire() {
    for (let i = 9; i >= 0; i--) {
        if (
            game.prestiges.gte(fireCosts[i]) &&
            (i === 9 || multFireBoost(i + 1).gte(game.fire.array))
        ) {
            buyFire(i);
            return;
        }
    }
}

function multFireBoost(i) {
    return OmegaNum(fireBoosts[i]).mul(game.water.add(1));
}

function autoWater() {
    for (let i = 2; i >= 0; i--) {
        if (game.fire.gte(waterCosts[i])) {
            buyWater(i);
            return;
        }
    }
}

function autobuyUpgrades() {
    for (let i = 11; i >= 0; i--) {
        if (game.money.gte(upgradeCosts[i]) && game.upgradesBought[i] != true) {
            buyUpgrade(i);
            return;
        }
    }
}

function autoFastFunctions() {
    autobuyUpgrades();
    autobuyMoney();
}

function autoFunctions() {
    autoWater();
    autoFire();
    autoPrestige();
    autoRebirth();
}

setInterval(autoFastFunctions, 5);
setInterval(autoFunctions, 100);
