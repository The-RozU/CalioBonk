export declare const SOLO_ATTACK_RANGE:number;
export declare const SUMMON_DELAY:number;
export declare const SUMMON_DURATION:number;
export declare const SOFT_SLIME_DISTANCE:number;
export declare const SUMMON_MIN_DISTANCE:number;
export declare const SUMMON_MAX_DISTANCE:number;
export declare function soloThreatTier(seconds:number):number;
export declare function soloBatchSize(seconds:number):number;
export declare function soloActiveCap(seconds:number):number;
export declare function soloBatchInterval(seconds:number):number;
export declare function slimeSeparation(
  positions:ReadonlyArray<Readonly<{x:number;z:number}>>,
  dt:number,
):Array<{x:number;z:number}>;
