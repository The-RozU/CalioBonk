export declare const SOLO_WAVE_INTERVAL: number;
export declare const SOLO_CLEAR_DELAY: number;
export declare const SOFT_SLIME_DISTANCE: number;
export declare function soloWaveSize(wave:number):number;
export declare function soloWaveCap(wave:number):number;
export declare function slimeSeparation(
  positions:ReadonlyArray<Readonly<{x:number;z:number}>>,
  dt:number,
):Array<{x:number;z:number}>;
