export const ENV_DEFAULT={preset:'Blank test stage',ground:'blank',variation:.35,path:false,pathX:0,pathZ:0,pathAngle:0,pathWidth:2,pathEdge:.4,weather:'none',intensity:.5,windAngle:35,windSpeed:1,fog:0,density:0,props:'mixed',seed:7301};
export const PRESETS={
 'Blank test stage':{ground:'blank',density:0,weather:'none',path:false},
 Forest:{ground:'grass',props:'forest',density:.55,weather:'none',fog:.15},
 Snowfield:{ground:'snow',props:'snow',weather:'snow',density:.3,fog:.15},
 Desert:{ground:'sand',props:'rocks',weather:'dust',density:.25,windSpeed:2},
 'Stone Road / Path':{ground:'grass',props:'rocks',path:true,pathWidth:2.5,density:.25},
 Ruins:{ground:'stone',props:'ruins',density:.5,fog:.2},
 'Autumn Field':{ground:'leaves',props:'forest',weather:'leaves',density:.35,path:true}
};
export function normalizeEnvironment(value){
 const e={...ENV_DEFAULT,...(value&&typeof value==='object'?value:{})};
 for(const [key,min,max] of [['variation',0,1],['pathX',-7,7],['pathZ',-4,4],['pathAngle',-180,180],['pathWidth',.5,6],['pathEdge',0,1],['intensity',0,1],['windAngle',0,360],['windSpeed',0,5],['fog',0,1],['density',0,1],['seed',1,2147483647]])e[key]=Number.isFinite(Number(e[key]))?Math.max(min,Math.min(max,Number(e[key]))):ENV_DEFAULT[key];
 for(const [key,allowed]of Object.entries({ground:['blank','grass','stone','dirt','sand','snow','leaves'],weather:['none','rain','snow','leaves','dust'],props:['mixed','forest','rocks','ruins','snow','grass','bushes','logs','graves']}))if(!allowed.includes(e[key]))e[key]=ENV_DEFAULT[key];
 e.path=!!e.path;return e;
}
