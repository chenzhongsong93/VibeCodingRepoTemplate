// Conservative lexical adapter: comments and quoted examples are never declarations.
// This checks supported declaration syntax; it does not prove tests were executed.
export function tokens(source,python=false){
 const out=[];out.comments=[];let i=0;
 while(i<source.length){
  const start=i,c=source[i],next=source[i+1];
  if(/\s/.test(c)){i++;continue;}
  if((c==='/'&&next==='/')||(python&&c==='#')){const end=source.indexOf('\n',i);out.comments.push({start,end:end<0?source.length:end,value:source.slice(start,end<0?source.length:end)});if(end<0)break;i=end;continue;}
  if(c==='/'&&next==='*'){const end=source.indexOf('*/',i+2);if(end<0)throw new Error('未闭合注释，不能验证声明');out.comments.push({start,end:end+2,value:source.slice(start,end+2)});i=end+2;continue;}
  if(!python&&c==='/'&&(!out.length||['=','(',',',':','!','[','{',';','?','return','case','=>'].includes(out.at(-1).value))){
   i++;let escaped=false,inClass=false,closed=false;
   while(i<source.length){const x=source[i++];if(escaped){escaped=false;continue;}if(x==='\\'){escaped=true;continue;}if(x==='[')inClass=true;else if(x===']')inClass=false;else if(x==='/'&&!inClass){closed=true;break;}if(x==='\n')break;}
   if(!closed)throw new Error('未闭合正则或不支持词法，不能验证声明');
   while(/[a-z]/i.test(source[i]||'')&&i<source.length)i++;out.push({type:'regex',value:'<pattern>',start,end:i});continue;
  }
  if(c==='"'||c==="'"||c==='`'){
   const quote=source.startsWith(c.repeat(3),i)&&python?c.repeat(3):c;let value='';i+=quote.length;let closed=false;
   while(i<source.length){if(source.startsWith(quote,i)){i+=quote.length;closed=true;break;}if(source[i]==='\\'){value+=source[i+1]||'';i+=2;}else value+=source[i++];}
   if(!closed)throw new Error('未闭合字符串或不支持的词法，不能验证声明');out.push({type:'string',value,start,end:i});continue;
  }
  const id=source.slice(i).match(/^[A-Za-z_$][\w$]*/);if(id){out.push({type:'id',value:id[0],start,end:i+id[0].length});i+=id[0].length;continue;}
  out.push({type:'symbol',value:c,start,end:i+1});i++;
 }
 return out;
}
function declarations(source,file,selector){
 const ts=tokens(source,file.endsWith('.py')),matches=[];
 for(let i=0;i<ts.length;i++){
  const a=ts[i],b=ts[i+1],c=ts[i+2];
  if(['function','fn','func','def'].includes(a.value)&&a.type==='id'&&b?.type==='id'&&b.value===selector&&c?.value==='(')matches.push(a);
  if(file.endsWith('.java')&&['void','boolean','int','String','long','double','float'].includes(a.value)&&b?.type==='id'&&b.value===selector&&c?.value==='(')matches.push(a);
  if(/\.[cm]?[jt]sx?$/.test(file)&&['test','it'].includes(a.value)&&a.type==='id'){
   let j=i+1;
   if(ts[j]?.value==='.'&&['only','skip'].includes(ts[j+1]?.value))j+=2;
   if(ts[j]?.value==='.'&&ts[j+1]?.value==='each'&&ts[j+2]?.value==='('){
    j+=3;let depth=1;while(j<ts.length&&depth){if(ts[j].type==='symbol'&&ts[j].value==='(')depth++;if(ts[j].type==='symbol'&&ts[j].value===')')depth--;j++;}
   }
   if(ts[j]?.value==='('&&ts[j+1]?.type==='string'&&ts[j+1].value===selector&&ts[j+2]?.value===',')matches.push(a);
  }
 }
 return matches;
}
export function hasDeclaration(source,file,selector){return declarations(source,file,selector).length===1;}
function declarationPrefix(ts){
 let i=0;
 const balanced=()=>{
  const close={'(':')','[':']','{':'}'},stack=[close[ts[i++].value]];
  while(i<ts.length&&stack.length){const token=ts[i++];if(token.type!=='symbol')continue;const v=token.value;if(close[v])stack.push(close[v]);else if([')',']','}'].includes(v)&&stack.pop()!==v)return false;}
  return stack.length===0;
 };
 while(i<ts.length){
  if(ts[i].type==='id'&&['export','default','async','public','private','protected','static','final','pub','unsafe','synchronized'].includes(ts[i].value)){i++;continue;}
  if(ts[i].type==='symbol'&&ts[i].value==='@'){
   i++;if(ts[i++]?.type!=='id')return false;
   while(ts[i]?.type==='symbol'&&ts[i].value==='.'){i++;if(ts[i++]?.type!=='id')return false;}
   if(ts[i]?.type==='symbol'&&ts[i].value==='('&&!balanced())return false;
   continue;
  }
  if(ts[i].type==='symbol'&&ts[i].value==='#'&&ts[i+1]?.type==='symbol'&&ts[i+1].value==='['){i++;if(!balanced())return false;continue;}
  return false;
 }
 return true;
}
export function hasCaseDeclaration(source,file,selector,id){
 const matches=declarations(source,file,selector);if(matches.length!==1)return false;
 const python=file.endsWith('.py'),ts=tokens(source,python),start=matches[0].start;
 const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return ts.comments.some(comment=>comment.end<=start&&comment.value.includes('覆盖:')&&new RegExp(`(?<![A-Za-z0-9_.-])${escaped}(?![A-Za-z0-9_.-])`).test(comment.value)&&declarationPrefix(tokens(source.slice(comment.end,start),python)));
}
