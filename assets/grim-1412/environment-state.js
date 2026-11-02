export const ENV_DEFAULT={preset:'Blank test stage',ground:'blank',hills:'mid',timeOfDay:12,cycleEnabled:false,cycleSpeed:24,timeEpoch:0,cloudCover:.18,accumulation:0,atmospherePreset:'Custom',ambience:'none',ambienceVolume:.55,cinematicPan:false,cinematicSpeed:1,variation:.35,path:false,pathX:0,pathZ:0,pathAngle:0,pathWidth:2,pathEdge:.4,weather:'none',intensity:.5,windAngle:35,windSpeed:1,fog:0,density:0,props:'mixed',terrainWidth:32,terrainDepth:20,seed:7301};
export const PRESETS={
 'Blank test stage':{ground:'blank',hills:'flat',density:0,weather:'none',path:false},
 Forest:{ground:'grass',hills:'small',props:'forest',density:.55,weather:'none',fog:.15},
 Snowfield:{ground:'snow',hills:'mid',props:'snow',weather:'snow',density:.3,fog:.15},
 Desert:{ground:'sand',hills:'small',props:'rocks',weather:'dust',density:.25,windSpeed:2},
 'Stone Road / Path':{ground:'grass',hills:'small',props:'rocks',path:true,pathWidth:2.5,density:.25},
 Ruins:{ground:'stone',hills:'flat',props:'ruins',density:.5,fog:.2},
 'Autumn Field':{ground:'leaves',hills:'small',props:'forest',weather:'leaves',density:.35,path:true}
};
export function normalizeEnvironment(value){
 const e={...ENV_DEFAULT,...(value&&typeof value==='object'?value:{})};
 for(const [key,min,max] of [['variation',0,1],['pathX',-7,7],['pathZ',-4,4],['pathAngle',-180,180],['pathWidth',.5,6],['pathEdge',0,1],['intensity',0,1],['windAngle',0,360],['windSpeed',0,5],['fog',0,1],['density',0,1],['terrainWidth',18,48],['terrainDepth',12,36],['timeOfDay',0,24],['cycleSpeed',1,96],['timeEpoch',0,9999999999999],['cloudCover',0,1],['accumulation',0,1],['ambienceVolume',0,1],['cinematicSpeed',.35,2.5],['seed',1,2147483647]])e[key]=Number.isFinite(Number(e[key]))?Math.max(min,Math.min(max,Number(e[key]))):ENV_DEFAULT[key];
 for(const [key,allowed]of Object.entries({ground:['blank','grass','stone','dirt','sand','snow','leaves'],hills:['flat','small','mid','mountains'],weather:['none','rain','snow','leaves','dust','blizzard','sandstorm','thunderstorm'],props:['mixed','forest','rocks','ruins','snow','grass','bushes','logs','graves'],ambience:['none','wind','storm','desert','blizzard','rain']}))if(!allowed.includes(e[key]))e[key]=ENV_DEFAULT[key];
 e.path=!!e.path;e.cycleEnabled=!!e.cycleEnabled;e.cinematicPan=!!e.cinematicPan;if(typeof e.atmospherePreset!=='string')e.atmospherePreset='Custom';return e;
}
