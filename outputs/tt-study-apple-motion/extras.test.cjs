const assert=require('node:assert/strict'),E=require('./extras.js');
const known=new Map([['apple',{def:'苹果',ex:['An apple.']}]]);
let words=E.parseWordData('w,def,ph,pos,ex\r\n"break the ice","打破僵局, 开场",,phr.,"They broke the ice."\r\nApple,苹果,,,\r\napple,重复,,,',known);
assert.equal(words.length,2);assert.equal(words[0].w,'break the ice');assert.equal(words[0].def,'打破僵局, 开场');assert.deepEqual(words[0].ex,['They broke the ice.']);assert.deepEqual(words[1].ex,['An apple.']);
assert.equal(E.parseWordData('break the ice\napple',known)[0].w,'break the ice');assert.equal(E.parseWordData('{"words":[{"word":"resilience","meaning":"韧性","examples":["Show resilience."]}]}')[0].def,'韧性');
assert.throws(()=>E.parseWordData('word,def\n"apple,苹果'),/双引号/);assert.throws(()=>E.parseWordData('[{"w":"apple","ex":42}]'),/例句/);assert.throws(()=>E.parseWordData('[{"def":"苹果"}]'),/英文/);
const review=E.parseDiaryReview('===总评===\n很好\n===逐句批改===\n保留原意\n===更地道的表达===\nMake progress.\n===亮点===\n自然\n===生词===\nbreak the ice - phr. 打破僵局\nBreak the Ice - 重复');assert.equal(review.words.length,1);assert.equal(review.words[0].w,'break the ice');assert.equal(review.overall,'很好');
console.log('Extra feature checks passed: quoted CSV, phrases, deduplication, JSON aliases, validation, review sections and vocabulary.');
