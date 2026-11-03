// Shared school-style written answer surface. This reuses the existing
// school input mechanic in both school practice and timed Hebrew; it never
// opens a second course runner or writes a separate learning journal.
export function mountSchoolWrittenInput(host,{onSubmit,math=false,initialValue='',onChange=()=>{}}={}){
 if(!host||typeof onSubmit!=='function')throw Error('School written input needs a submit handler');
 const form=document.createElement('form');form.id='school-form';
 form.innerHTML='<label for="school-input">הַתְּשׁוּבָה שֶׁלָּךְ</label><input id="school-input" class="school-input" type="text" maxlength="80" autocomplete="off" autocorrect="off" spellcheck="false" dir="'+(math?'ltr':'rtl')+'"'+(math?' inputmode="numeric"':' lang="he"')+'><button class="primary" type="submit" id="school-submit">בּוֹדְקִים</button><p id="school-input-note" role="status"></p>';
 const field=form.querySelector('input');field.value=String(initialValue||'');
 let destroyed=false;
 field.oninput=()=>{if(!destroyed)onChange(field.value)};
 form.onsubmit=event=>{event.preventDefault();if(destroyed)return;
  const value=field.value.trim();
  if(!value){form.querySelector('#school-input-note').textContent='כִּתְבִי תְּשׁוּבָה לִפְנֵי שֶׁמַּמְשִׁיכִים.';return}
  onSubmit(value);
 };
 host.append(form);
 return {destroy(){destroyed=true;form.onsubmit=null;field.oninput=null},get value(){return field.value}};
}

