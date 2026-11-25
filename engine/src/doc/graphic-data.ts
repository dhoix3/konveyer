// Stylized geographical anchors, not surveyed borders or event inference.
export const MAP_CITIES=[{name:'Новгород',x:340,y:160},{name:'Киев',x:410,y:330},{name:'Константинополь',x:340,y:550},{name:'Москва',x:660,y:230},{name:'Владимир',x:770,y:180}];
export const WATER={baltic:'M70 65 L260 70 300 130 230 190 140 145Z',ladoga:{x:390,y:90},blackSea:'M390 460 Q590 410 790 470 L810 550 Q580 580 400 530Z',dnieper:'M390 190 Q470 280 410 330 Q370 400 500 470'};
export const MOSCOW_TREE=[{id:'ivan3',name:'Иван III',years:'',parent:null},{id:'vasily3',name:'Василий III',years:'',parent:'ivan3'},{id:'ivan4',name:'Иван IV',years:'',parent:'vasily3'},{id:'fyodor',name:'Фёдор Иванович',years:'',parent:'ivan4'}];
// Years are supplied from materials claim dates, never inferred life/reign dates.
export const TIMELINE_TICKS=[862,911,988,1147,1237,1380,1480,1547,1598];
export const publicName=(s:string)=>/(Участник\s*\d+|Ensemble\s*\d+|\/)/i.test(s.trim())?'':s;
