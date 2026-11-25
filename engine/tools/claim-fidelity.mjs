// Conservative lexical QA, not semantic entailment. Case/name aliases are explicit.
const NUMBERS={первый:1,первого:1,второй:2,второго:2,третий:3,третьего:3,четвёртый:4,четвертый:4,четвёртого:4,четвертого:4,пятый:5,пятого:5};
const CARDINALS=new Set('ноль один одна одно два две три четыре пять шесть семь восемь девять десять одиннадцать двенадцать тринадцать четырнадцать пятнадцать шестнадцать семнадцать восемнадцать девятнадцать двадцать тридцать сорок пятьдесят шестьдесят семьдесят восемьдесят девяносто сто двести триста четыреста пятьсот шестьсот семьсот восемьсот девятьсот тысяча тысячи тысяч миллион миллиона миллионов'.split(' '));
const ROMAN={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11,XII:12,XIII:13,XIV:14,XV:15,XVI:16,XVII:17,XX:20};
const STARTERS=new Set('В На К Из От С Для И Но Призвание Захват Летопись Повторный После Дата Поход По Крещение Детали Христианство Принятие Рост Первое Монгольское Политика При Стояние Опричнина Пресеклась Он Она Это Спорно Не По Источники Разделы Нашествие Угра'.split(' '));
const aliases={русь:'рус',руси:'рус',русью:'рус',москва:'москв',москве:'москв',москвы:'москв',киев:'киев',киева:'киев',киеве:'киев',юрия:'юри',юрий:'юри',ольга:'ольг',ольги:'ольг',ольгу:'ольг',ольгой:'ольг',олег:'олег',олегом:'олег',олега:'олег',фёдор:'федор',фёдора:'федор',фёдору:'федор'};
const stem=t=>aliases[t.toLowerCase()]||t.toLowerCase().replaceAll('ё','е').replace(/(ович[ауе]?|ого|его|ий|ского|ский|ской|ому|ыми|ами|ом|ем|ым|им|а|я|у|ю|ы|и|е|ь|й)$/u,'');
function facts(text) {
  const tokens=String(text).match(/[\p{L}]+|\d+(?:[.,]\d+)?/gu)||[],numbers=[],names=[];
  tokens.forEach((t,i)=>{
    if(/^\d/.test(t))numbers.push(t.replace(',','.'));
    else if(ROMAN[t])numbers.push(String(ROMAN[t]));
    else if(NUMBERS[t.toLowerCase()])numbers.push(String(NUMBERS[t.toLowerCase()]));
    else if(CARDINALS.has(t.toLowerCase()))numbers.push(t.toLowerCase());
    else if(/^\p{Lu}/u.test(t) && !(i===0&&STARTERS.has(t)))names.push(stem(t));
  });return {numbers,names};
}
export function claimFidelity(narration,claim) {
  const full=facts(claim.text),short=facts(narration),errors=[];
  for(const n of new Set(short.numbers))if(!full.numbers.includes(n))errors.push(`number/date absent from full claim: ${n}`);
  for(const n of new Set(short.names))if(!full.names.includes(n))errors.push(`name absent from full claim: ${n}`);
  return errors;
}
