import admin from "firebase-admin";
import { getAdminDb } from "@/lib/firebaseAdmin";

const AD_REWARD_COINS = 10;
const DAILY_AD_LIMIT = 5;
const DAY_UNLOCK_COST = 30;
const FREE_DAYS = 7;
const MAX_CYCLE_DAY = 30;

type AdRewardInput = {
  uid: string;
  transactionId: string;
  adUnit: string;
  rewardItem: string;
  rewardAmount: number;
  occurredAt: Date;
};

export type AdRewardResult = {
  credited: boolean;
  balance: number;
  adsWatchedToday: number;
  dailyLimit: number;
};

export type DayUnlockResult = {
  unlocked: boolean;
  balance: number;
  cost: number;
  day: number;
  unlockedDays: number[];
};

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function creditRewardedAd(
  input: AdRewardInput
): Promise<AdRewardResult> {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(input.uid);
  const eventRef = db.collection("admobRewardEvents").doc(input.transactionId);
  const ledgerRef = userRef
    .collection("coinTransactions")
    .doc(`ad_${input.transactionId}`);
  const dailyRef = userRef
    .collection("walletDaily")
    .doc(utcDayKey(input.occurredAt));

  return db.runTransaction(async (tx) => {
    const [eventSnap, userSnap, dailySnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(userRef),
      tx.get(dailyRef),
    ]);

    if (!userSnap.exists) {
      throw new Error("Usuario nao encontrado.");
    }

    const currentBalance = Number(userSnap.get("coins") ?? 0);
    const currentCount = Number(dailySnap.get("rewardedAds") ?? 0);

    if (eventSnap.exists) {
      return {
        credited: false,
        balance: currentBalance,
        adsWatchedToday: currentCount,
        dailyLimit: DAILY_AD_LIMIT,
      };
    }

    if (currentCount >= DAILY_AD_LIMIT) {
      tx.create(eventRef, {
        uid: input.uid,
        status: "daily_limit",
        adUnit: input.adUnit,
        occurredAt: admin.firestore.Timestamp.fromDate(input.occurredAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        credited: false,
        balance: currentBalance,
        adsWatchedToday: currentCount,
        dailyLimit: DAILY_AD_LIMIT,
      };
    }

    const nextBalance = currentBalance + AD_REWARD_COINS;
    const nextCount = currentCount + 1;

    tx.update(userRef, {
      coins: nextBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(
      dailyRef,
      {
        rewardedAds: nextCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.create(ledgerRef, {
      type: "rewarded_ad",
      amount: AD_REWARD_COINS,
      balanceAfter: nextBalance,
      description: "Recompensa por anuncio",
      externalId: input.transactionId,
      adUnit: input.adUnit,
      rewardItem: input.rewardItem,
      providerRewardAmount: input.rewardAmount,
      occurredAt: admin.firestore.Timestamp.fromDate(input.occurredAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.create(eventRef, {
      uid: input.uid,
      status: "credited",
      amount: AD_REWARD_COINS,
      adUnit: input.adUnit,
      occurredAt: admin.firestore.Timestamp.fromDate(input.occurredAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      credited: true,
      balance: nextBalance,
      adsWatchedToday: nextCount,
      dailyLimit: DAILY_AD_LIMIT,
    };
  });
}

export async function spendCoinsForDayUnlock(
  uid: string,
  day: number
): Promise<DayUnlockResult> {
  if (!Number.isInteger(day) || day <= FREE_DAYS || day > MAX_CYCLE_DAY) {
    throw new Error("Dia invalido para desbloqueio por moedas.");
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const ledgerRef = userRef.collection("coinTransactions").doc(`unlock_day_${day}`);

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new Error("Usuario nao encontrado.");
    }

    const data = userSnap.data() ?? {};
    const coins = Number(data.coins ?? 0);
    const unlockedDays = Array.isArray(data.coinUnlockedDays)
      ? data.coinUnlockedDays
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value))
      : [];

    if (unlockedDays.includes(day)) {
      return {
        unlocked: true,
        balance: coins,
        cost: 0,
        day,
        unlockedDays,
      };
    }

    if (coins < DAY_UNLOCK_COST) {
      throw new Error("Moedas insuficientes.");
    }

    const nextBalance = coins - DAY_UNLOCK_COST;
    const nextUnlockedDays = [...unlockedDays, day].sort((a, b) => a - b);

    tx.update(userRef, {
      coins: nextBalance,
      coinUnlockedDays: nextUnlockedDays,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.create(ledgerRef, {
      type: "day_unlock",
      amount: -DAY_UNLOCK_COST,
      balanceAfter: nextBalance,
      description: `Desbloqueio do dia ${day}`,
      day,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      unlocked: true,
      balance: nextBalance,
      cost: DAY_UNLOCK_COST,
      day,
      unlockedDays: nextUnlockedDays,
    };
  });
}
