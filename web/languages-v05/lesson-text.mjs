// Presentation only: canonical source, choice values and grading stay exact.
export function lessonParagraphText(value){
 return String(value??'').split('\n').map(line=>line.replace(/\.+([\t ]*)$/u,'$1')).join('\n');
}
