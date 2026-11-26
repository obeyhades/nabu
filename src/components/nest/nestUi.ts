import type { ItemId, NestItem, NestKind, NestSlot, OwnedItem, WearSlot } from "../../types";
import { firstFreeSlot, isOwnedItem } from "../../lib/rewards";
import { DRAWER_TABS, ITEM_BY_ID, NEST_SLOTS, giftCondition, slotsFor, type SceneSlot } from "../../data/nestItems";

/**
 * Små hjälpare som delas av Nabus bo-sidans delar (scen, låda, Stjärnboden,
 * köpkort). Komponentfiler får bara exportera komponenter, så de bor här.
 */

/** Lägena under scenen: Titta (leka), Pynta (flytta saker) och Stjärnboden (köpa). */
export type NestMode = "titta" | "pynta" | "bod";

/** Flikarna i Pynta och Stjärnboden. */
export type DrawerTab = (typeof DRAWER_TABS)[number]["id"];

/**
 * Det sidan kan be scenen om: en studs när något just ställts på en plats, och
 * tystnad (Tittas pågående sekvenser och bubblor avbryts) när barnet byter läge
 * eller väljer något i lådan.
 */
export type NestSceneHandle = { bump: (slot: NestSlot) => void; quiet: () => void };

type Slots = Partial<Record<NestSlot, ItemId>>;

/** Hatt och hals sitter på Nabu själv. */
export function isWear(item: NestItem): item is NestItem & { kind: WearSlot } {
  return item.kind === "hat" || item.kind === "neck";
}

/** Platsen i scenen (inte hatt/hals). */
export function isSceneSlot(slot: NestSlot): slot is SceneSlot {
  return slot !== "hat" && slot !== "neck";
}

/** Fliken en sort hör till. */
export function tabOf(kind: NestKind): DrawerTab {
  return DRAWER_TABS.find((t) => t.kinds.includes(kind))?.id ?? "saker";
}

/** Var en sak hamnar när den köps eller förhandsvisas: första lediga giltiga plats, annars den första. */
export function targetSlot(item: NestItem, slots: Slots): NestSlot {
  return firstFreeSlot(item, slots) ?? slotsFor(item)[0];
}

/** Saken som står på platsen – bara om den är känd, ägd och får stå just där. */
export function itemAt(s: { owned: Record<ItemId, OwnedItem>; slots: Slots }, slot: NestSlot): NestItem | null {
  const id = s.slots[slot];
  const item = id ? ITEM_BY_ID.get(id) : undefined;
  if (!item || !isOwnedItem(s, item.id) || !slotsFor(item).includes(slot)) return null;
  return item;
}

/** Var saken står just nu (eller null = i förrådet). */
export function slotOf(slots: Slots, id: ItemId): NestSlot | null {
  for (const [slot, at] of Object.entries(slots) as [NestSlot, ItemId | undefined][]) if (at === id) return slot;
  return null;
}

/** Svenskt namn på en plats: "Hyllan", "På Nabu". */
export function slotName(slot: NestSlot): string {
  return isSceneSlot(slot) ? NEST_SLOTS[slot].aria : "På Nabu";
}

/** Vad skärmläsaren säger när något ställts fram: "Bokhögen står nu på hyllan." */
export function placedLine(item: NestItem, slot: NestSlot): string {
  switch (slot) {
    case "hat":
    case "neck":
      return `Nabu har på sig ${item.name}.`;
    case "window":
      return `Fönstret visar nu ${item.name}.`;
    case "rug":
      return `${item.name} ligger nu på golvet.`;
    case "garland":
      return `${item.name} hänger nu i taket.`;
    case "lamp":
      return `${item.name} hänger nu i lampkroken.`;
    default: {
      const name = NEST_SLOTS[slot].aria;
      return `${item.name} ${item.kind === "friend" ? "sitter" : "står"} nu på ${name.charAt(0).toLowerCase()}${name.slice(1)}.`;
    }
  }
}

/** "1 stjärna", "8 stjärnor". */
export function starsWord(n: number): string {
  return `${n} ${n === 1 ? "stjärna" : "stjärnor"}`;
}

/** Vänner bjuds in i stället för att köpas. */
export function buyVerb(item: NestItem): string {
  return item.kind === "friend" ? "Bjud in" : "Köp";
}

/**
 * Det Nabu läser upp när barnet trycker på en sak i Stjärnboden (svenska).
 * Priset sägs alltid högt för de som inte läser än.
 */
export function shopSpeech(item: NestItem, owned: boolean, balance: number): string {
  if (owned) return `${item.name}. Den är din!`;
  if (item.via === "gift") return `${item.name}. ${giftCondition(item)}.`;
  return `${item.name}. Den kostar ${starsWord(item.price)}. Du har ${balance} i påsen.`;
}

/** Skärmläsarens etikett på ett kort i Stjärnboden: "Kepsen, 8 stjärnor, du har 12 i påsen". */
export function shopLabel(item: NestItem, owned: boolean, balance: number, wished: boolean): string {
  if (owned) return `${item.name}, din`;
  if (item.via === "gift") {
    const c = giftCondition(item);
    return `${item.name}, ${c.charAt(0).toLowerCase()}${c.slice(1)}`;
  }
  return `${item.name}, ${starsWord(item.price)}, du har ${balance} i påsen${wished ? ", önskad" : ""}`;
}
