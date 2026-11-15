export type CardRarity='common'|'rare'|'epic'|'legendary';
export interface Rarity {readonly id:CardRarity;readonly name:string;readonly ranks:number}
export interface DraftCard {id:string;maxRank?:number}
export interface DraftOffer {id:string;rarity:CardRarity;rarityName:string;gains:number;from:number;to:number}
export declare const CARD_RARITIES:ReadonlyArray<Readonly<Rarity>>;
export declare function rollRarity(level:number,rng?:()=>number):Readonly<Rarity>;
export declare function drawUpgradeCards(cards:ReadonlyArray<DraftCard>,ranks:Readonly<Record<string,number>>,level:number,previousIds?:ReadonlyArray<string>,rng?:()=>number):DraftOffer[];
