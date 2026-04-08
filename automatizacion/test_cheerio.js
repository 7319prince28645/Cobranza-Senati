const cheerio = require('cheerio');
const html = `<font class="descripcion">Algo<br>Curso XYZ<br>08:00 - 10:00 &gt; Aula 1</font>`;
const $ = cheerio.load(html);
const htmlContent = $('font.descripcion').html();
console.log('HTML:', htmlContent);

const [horario, aula] = htmlContent.split("<br>")[2]?.split("&gt;")?.map((s) => s.trim()) || [];
console.log('horario split by &gt; :', horario);
const [horario2, aula2] = htmlContent.split("<br>")[2]?.split(/>|&gt;/i)?.map((s) => s.trim()) || [];
console.log('horario split by > or &gt; :', horario2);
