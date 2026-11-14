export type SlimeKind='green'|'blue'|'red'|'toxic';
export type SlimeTraits={readonly name:string;readonly hp:number;readonly speed:number;readonly scale:number;readonly exp:number;readonly contact:number;readonly jumpPower:number;readonly jumpDelay:number;readonly color:string};
export const SLIME_TRAITS:Readonly<Record<SlimeKind,Readonly<SlimeTraits>>>;
export const TOXIC_POOL:Readonly<{damage:number;radius:number;duration:number;cooldown:number;maxActive:number}>;
export function slimeVariantForWave(wave:number,roll:number):SlimeKind;
