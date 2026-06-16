import type { DemoPresetId, CreditSnapshot } from "./types";

const HOUR = 60 * 60 * 1000;

export function buildDemoSnapshot(preset: DemoPresetId, now = Date.now()): CreditSnapshot {
  switch (preset) {
    case "free-healthy":
      return {
        plan: "free",
        monthlyUsed: 50,
        monthlyLimit: 250,
        dailyUsed: 20,
        dailyLimit: 50,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: false,
        stats: { signals: 12, docs: 2, messages: 18 },
      };
    case "free-running-low":
      return {
        plan: "free",
        monthlyUsed: 214,
        monthlyLimit: 250,
        dailyUsed: 38,
        dailyLimit: 50,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: true,
        stats: { signals: 19, docs: 3, messages: 26 },
      };
    case "free-monthly-empty":
      return {
        plan: "free",
        monthlyUsed: 250,
        monthlyLimit: 250,
        dailyUsed: 50,
        dailyLimit: 50,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: true,
        stats: { signals: 23, docs: 4, messages: 31 },
      };
    case "free-daily-blocked":
      return {
        plan: "free",
        monthlyUsed: 180,
        monthlyLimit: 250,
        dailyUsed: 50,
        dailyLimit: 50,
        topUpBalance: 0,
        blockUntil: now + 18 * HOUR,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: false,
        stats: { signals: 20, docs: 3, messages: 28 },
      };
    case "free-just-unblocked":
      return {
        plan: "free",
        monthlyUsed: 180,
        monthlyLimit: 250,
        dailyUsed: 0,
        dailyLimit: 50,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: true,
        monthlyLowToastShown: false,
        stats: { signals: 20, docs: 3, messages: 28 },
      };
    case "pro-healthy":
      return {
        plan: "pro",
        monthlyUsed: 800,
        monthlyLimit: 4000,
        dailyUsed: 90,
        dailyLimit: 400,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: false,
        stats: { signals: 45, docs: 8, messages: 112 },
      };
    case "pro-running-low":
      return {
        plan: "pro",
        monthlyUsed: 3400,
        monthlyLimit: 4000,
        dailyUsed: 310,
        dailyLimit: 400,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: true,
        stats: { signals: 72, docs: 11, messages: 180 },
      };
    case "pro-monthly-empty":
      return {
        plan: "pro",
        monthlyUsed: 4000,
        monthlyLimit: 4000,
        dailyUsed: 400,
        dailyLimit: 400,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: true,
        stats: { signals: 87, docs: 14, messages: 203 },
      };
    case "pro-daily-blocked":
      return {
        plan: "pro",
        monthlyUsed: 2200,
        monthlyLimit: 4000,
        dailyUsed: 400,
        dailyLimit: 400,
        topUpBalance: 0,
        blockUntil: now + 4 * HOUR,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: false,
        stats: { signals: 55, docs: 9, messages: 140 },
      };
    case "pro-just-unblocked":
      return {
        plan: "pro",
        monthlyUsed: 2200,
        monthlyLimit: 4000,
        dailyUsed: 0,
        dailyLimit: 400,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: true,
        monthlyLowToastShown: false,
        stats: { signals: 55, docs: 9, messages: 140 },
      };
    case "pro-after-top-up":
      return {
        plan: "pro",
        monthlyUsed: 4000,
        monthlyLimit: 4000,
        dailyUsed: 120,
        dailyLimit: 400,
        topUpBalance: 800,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: false,
        stats: { signals: 87, docs: 14, messages: 203 },
      };
    default:
      return buildDemoSnapshot("free-healthy", now);
  }
}

export const DEMO_PRESETS: { id: DemoPresetId; label: string }[] = [
  { id: "free-healthy", label: "Free · Healthy" },
  { id: "free-running-low", label: "Free · Running Low" },
  { id: "free-monthly-empty", label: "Free · Monthly Empty" },
  { id: "free-daily-blocked", label: "Free · Daily Blocked" },
  { id: "free-just-unblocked", label: "Free · Just Unblocked" },
  { id: "pro-healthy", label: "Pro · Healthy" },
  { id: "pro-running-low", label: "Pro · Running Low" },
  { id: "pro-monthly-empty", label: "Pro · Monthly Empty" },
  { id: "pro-daily-blocked", label: "Pro · Daily Blocked" },
  { id: "pro-just-unblocked", label: "Pro · Just Unblocked" },
  { id: "pro-after-top-up", label: "Pro · After Top Up" },
];
