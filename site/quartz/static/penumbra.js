"use strict";(()=>{var j="penumbra:token",v=class{constructor(e){this.base=e}get token(){return localStorage.getItem(j)}set token(e){e?localStorage.setItem(j,e):localStorage.removeItem(j)}headers(e=!1){let t={};return e&&(t["Content-Type"]="application/json"),this.token&&(t.Authorization=`Bearer ${this.token}`),t}captureTokenFromHash(){let e=/[#&]pen_token=([^&]+)/.exec(location.hash);return e?(this.token=decodeURIComponent(e[1]),history.replaceState(null,"",location.pathname+location.search),!0):!1}async me(){if(!this.token)return{user:null,isAuthor:!1};let e=await fetch(`${this.base}/me`,{headers:this.headers()});if(!e.ok)return{user:null,isAuthor:!1};let t=await e.json();return{user:t.user,isAuthor:!!t.isAuthor}}async list(e,t=[]){let n=new URLSearchParams({source:e});t.length&&n.set("include",t.join(","));let o=await fetch(`${this.base}/annotations?${n}`);return o.ok?(await o.json()).items:[]}async create(e,t,n={}){let o=await fetch(`${this.base}/annotations`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({target:e,kind:n.kind??"comment",body:[{type:"TextualBody",value:t}],docVersion:n.docVersion})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`create failed (${o.status})`);return o.json()}async reply(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}/replies`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({text:t})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`reply failed (${o.status})`);return o.json()}async patch(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}`,{method:"PATCH",headers:this.headers(!0),body:JSON.stringify(t)});if(!o.ok)throw new Error(`patch failed (${o.status})`);return o.json()}async remove(e){let t=e.split("/annotations/")[1];await fetch(`${this.base}/annotations/${t}`,{method:"DELETE",headers:this.headers()})}async getResponse(e){let t=await fetch(`${this.base}/responses?source=${encodeURIComponent(e)}`,{headers:this.headers()});return t.ok?(await t.json()).response:null}async saveResponse(e,t,n,o){let i=await fetch(`${this.base}/responses`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e,body:t,quotes:n,sourceSha:o})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??`save failed (${i.status})`);return i.json()}async getResponseById(e){let t=await fetch(`${this.base}/responses/by-id/${encodeURIComponent(e)}`,{headers:this.headers()});return t.ok?(await t.json()).response:null}async getAllResponses(e){let t=await fetch(`${this.base}/responses/all?source=${encodeURIComponent(e)}`,{headers:this.headers()});return t.ok?(await t.json()).responses:[]}async submitResponse(e){let t=await fetch(`${this.base}/responses/submit`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e})}),n=await t.json().catch(()=>({}));if(!t.ok)throw new Error(n.error??`submit failed (${t.status})`);return n}async uploadImage(e){let t={"Content-Type":e.type||"application/octet-stream"};this.token&&(t.Authorization=`Bearer ${this.token}`);let n=await fetch(`${this.base}/upload`,{method:"POST",headers:t,body:e});if(!n.ok)throw new Error(`upload failed (${n.status})`);return(await n.json()).url}loginUrl(e){return`${this.base}/auth/${e}/start?return=${encodeURIComponent(location.href)}`}async emailLogin(e){return(await fetch(`${this.base}/auth/email/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,return:location.href})})).json()}async logout(){await fetch(`${this.base}/auth/logout`,{method:"POST",headers:this.headers()}).catch(()=>{}),this.token=null}};function k(s){let e=document.createTreeWalker(s,NodeFilter.SHOW_TEXT,{acceptNode(i){let r=i.parentElement;return r&&r.closest("[data-pen-ui]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[],n="",o;for(;o=e.nextNode();){let i=o,r=n.length;n+=i.data,t.push({node:i,start:r,end:n.length})}return{text:n,nodes:t}}function w(s,e){for(let n of s.nodes)if(e>=n.start&&e<=n.end)return{node:n.node,offset:e-n.start};let t=s.nodes[s.nodes.length-1];return t?{node:t.node,offset:t.node.data.length}:null}function z(s,e,t){if(e.nodeType===Node.TEXT_NODE){let r=s.nodes.find(a=>a.node===e);return r?r.start+t:null}let n=e.ownerDocument??document,o=n.createRange();try{o.setStart(e,t),o.collapse(!0)}catch{return null}let i=null;for(let r of s.nodes){let a=n.createRange();if(a.setStart(r.node,r.node.data.length),a.collapse(!0),o.compareBoundaryPoints(Range.START_TO_START,a)>=0){i=r.end;continue}let p=n.createRange();return p.setStart(r.node,0),p.collapse(!0),o.compareBoundaryPoints(Range.START_TO_START,p)<=0?i??r.start:r.start}return i}function Q(s,e){let t=s.find(p=>p.type==="TextQuoteSelector");if(!t?.exact)return null;let n=k(e),o=ne(n.text,t);if(o<0)return null;let i=w(n,o),r=w(n,o+t.exact.length);if(!i||!r)return null;let a=document.createRange();return a.setStart(i.node,i.offset),a.setEnd(r.node,r.offset),a}function F(s,e){let t=[],n=s.indexOf(e);for(;n>=0;)t.push(n),n=s.indexOf(e,n+1);return t}function _(s,e,t){if(!s)return null;let n=k(t),o=F(n.text,s);if(!o.length)return null;let i=o[Math.min(Math.max(1,e||1),o.length)-1],r=w(n,i),a=w(n,i+s.length);if(!r||!a)return null;let p=document.createRange();return p.setStart(r.node,r.offset),p.setEnd(a.node,a.offset),p}function q(s,e){let t=s.trim();if(t.length<8)return null;let n=k(e),o=n.text.indexOf(t);return o<0?null:[{type:"TextQuoteSelector",exact:t,prefix:n.text.slice(Math.max(0,o-32),o),suffix:n.text.slice(o+t.length,o+t.length+32)},{type:"TextPositionSelector",start:o,end:o+t.length}]}function E(s){let e=/^\s*!\[[^\]]*\]\(([^)\s]+)\)\s*$/.exec(s??"");return e?e[1]:null}function y(s){let e=(s??"").split("#")[0].split("?")[0];e=e.slice(e.lastIndexOf("/")+1);try{e=decodeURIComponent(e)}catch{}return e.toLowerCase()}function $(s){return Array.from(s.querySelectorAll?.("img")??[]).filter(t=>!t.closest("[data-pen-ui]"))}function D(s,e,t){let n=E(s);if(!n)return null;let o=y(n),i=$(t).filter(r=>y(r.getAttribute("src")??"")===o);return i.length?i[Math.min(Math.max(1,e||1),i.length)-1]:null}function H(s,e){let t=y(s.getAttribute("src")??""),o=$(e).filter(i=>y(i.getAttribute("src")??"")===t).indexOf(s);return o>=0?o+1:1}function P(s){return`![](${s.getAttribute("src")??""})`}function T(s,e){return $(e).filter(t=>s.intersectsNode(t))}function te(s,e){let t=0;for(let n of s.nodes)if(e.compareDocumentPosition(n.node)&Node.DOCUMENT_POSITION_PRECEDING)t=n.end;else break;return t}function U(s,e){let t=k(e),n=z(t,s.startContainer,s.startOffset),o=z(t,s.endContainer,s.endOffset);if(n==null||o==null||o<n)return null;let i=T(s,e).map(d=>({img:d,flat:te(t,d)})).filter(d=>d.flat>=n&&d.flat<=o).sort((d,u)=>d.flat-u.flat),r=[],a=[],p=(d,u)=>{let h=t.text.slice(d,u),m=h.trim();if(!m)return;let l=d+(h.length-h.trimStart().length),g=F(t.text,m).indexOf(l);r.push(m),a.push(g>=0?g+1:1)},c=n;for(let d of i)p(c,d.flat),r.push(P(d.img)),a.push(H(d.img,e)),c=d.flat;return p(c,o),r.length?{quotes:r,nths:a}:null}function ne(s,e){let t=[],n=s.indexOf(e.exact);for(;n>=0;)t.push(n),n=s.indexOf(e.exact,n+1);if(t.length===0)return-1;if(t.length===1)return t[0];let o=t[0],i=-1;for(let r of t){let a=0;if(e.prefix){let p=s.slice(Math.max(0,r-e.prefix.length),r);a+=ie(p,e.prefix)}if(e.suffix){let p=s.slice(r+e.exact.length,r+e.exact.length+e.suffix.length);a+=oe(p,e.suffix)}a>i&&(i=a,o=r)}return o}var oe=(s,e)=>{let t=0;for(;t<s.length&&t<e.length&&s[t]===e[t];)t++;return t},ie=(s,e)=>{let t=0;for(;t<s.length&&t<e.length&&s[s.length-1-t]===e[e.length-1-t];)t++;return t};var X=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function Y(s){let e=/^\s*>(\d+)\s(.*)$/.exec(s);return e?{nth:Number(e[1]),text:e[2]}:{nth:1,text:(s??"").replace(/^\s*>\s?/,"")}}function re(s,e){return s>1?`>${s} ${e}`:`> ${e}`}function se(s){let e=[],t=[],n=1,o=()=>{let i=t.join(" ").trim();i.length>=6&&e.push({text:i,nth:n}),t=[],n=1};for(let i of(s??"").split(`
`))if(/^\s*>/.test(i))if(t.length)t.push(i.replace(/^\s*>\s?/,""));else{let r=Y(i);n=r.nth,t.push(r.text)}else t.length&&o();return t.length&&o(),e}function I(s){return se(s).map(e=>e.text)}var A=s=>/^\s*>/.test(s??"");function ae(s){let e=[],t=/!\[[^\]]*\]\([^)\s]+\)/g,n=0,o;for(;o=t.exec(s);){let r=s.slice(n,o.index).trim();r&&e.push(r),e.push(o[0]),n=o.index+o[0].length}let i=s.slice(n).trim();return i&&e.push(i),e}function J(s){let e=(s??"").replace(/\r\n/g,`
`).split(`
`),t=0,n=[];for(;t<e.length&&!A(e[t]);)n.push(e[t]),t++;let o=[];for(;t<e.length;){let i=[];for(;t<e.length&&A(e[t]);){let c=Y(e[t]),d=c.text.replace(/\\\s*$/,"").replace(/​/g,"").trim();d&&i.push({text:d,nth:c.nth}),t++}let r=[];for(;t<e.length&&!A(e[t]);)r.push(e[t]),t++;for(;r.length&&r[0].trim()==="";)r.shift();for(;r.length&&r[r.length-1].replace(/​/g,"").trim()==="";)r.pop();let a=[],p=[];i.length&&(a=ae(i.map(c=>c.text).join(" ")),p=a.map((c,d)=>d===0?i[0].nth:1)),o.push({quotes:a,nths:p,note:r.join(`
`)})}return{preamble:n.join(`
`).trim(),blocks:o}}function N(s,e){let t=[];for(let r of e){let a=r.note.replace(/^\n+/,"").replace(/[\s​]+$/,""),p=r.quotes.map(d=>(d??"").replace(/\n/g," ").trim()).filter(Boolean);if(!p.length&&!a.trim())continue;let c=p.length?re(r.nths?.[0]??1,p.join(" ")):"";t.push(c&&a?`${c}

${a}`:c||a)}let n=t.join(`


`),o=s.trim();return(o&&n?`${o}

${n}`:o||n)+`
`}function V(s){let e=s??"",t=[],n=0,o=Intl.Segmenter;if(typeof o=="function")for(let{segment:i}of new o("en",{granularity:"grapheme"}).segment(e)){if(/^\s+$/.test(i)){n+=i.length;continue}if(/\p{Extended_Pictographic}/u.test(i)){t.push(i),n+=i.length;continue}break}else{let i=/^((?:\p{Extended_Pictographic}(?:[️‍\u{1F3FB}-\u{1F3FF}]|\p{Extended_Pictographic})*|\s)+)/u.exec(e);if(i){n=i[0].length;for(let r of[...i[0]])/\p{Extended_Pictographic}/u.test(r)&&t.push(r)}}return{emojis:t,text:e.slice(n)}}function b(s){let e=(s??"").replace(/​/g,""),t=Intl.Segmenter;if(typeof t=="function"){for(let{segment:n}of new t("en",{granularity:"grapheme"}).segment(e))if(!/^\s+$/.test(n)&&!/\p{Extended_Pictographic}/u.test(n))return!0;return!1}return/\S/.test(e.replace(/\p{Extended_Pictographic}/gu,""))}function S(s){return X(s).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>")}function x(s){let e=(s??"").replace(/\r\n/g,`
`).split(`
`),t=[],n=0;for(;n<e.length;){let o=e[n];if(/^```/.test(o)){let a=[];for(n++;n<e.length&&!/^```/.test(e[n]);)a.push(e[n++]);n++,t.push(`<pre><code>${X(a.join(`
`))}</code></pre>`);continue}if(/^[\s​]*$/.test(o)){n++;continue}if(/^#{1,6}\s/.test(o)){let a=/^(#{1,6})\s+(.*)$/.exec(o);t.push(`<h${a[1].length}>${S(a[2])}</h${a[1].length}>`),n++;continue}if(/^\s*([-*_])\1{2,}\s*$/.test(o)){t.push("<hr>"),n++;continue}if(/^\s*>/.test(o)){let a=[];for(;n<e.length&&/^\s*>/.test(e[n]);)a.push(e[n++].replace(/^\s*>\s?/,""));t.push(`<blockquote>${x(a.join(`
`))}</blockquote>`);continue}if(/^\s*[-*+]\s/.test(o)){let a=[];for(;n<e.length&&/^\s*[-*+]\s/.test(e[n]);)a.push(`<li>${S(e[n++].replace(/^\s*[-*+]\s+/,""))}</li>`);t.push(`<ul>${a.join("")}</ul>`);continue}if(/^\s*\d+\.\s/.test(o)){let a=[];for(;n<e.length&&/^\s*\d+\.\s/.test(e[n]);)a.push(`<li>${S(e[n++].replace(/^\s*\d+\.\s+/,""))}</li>`);t.push(`<ol>${a.join("")}</ol>`);continue}let i=[];for(;n<e.length&&!/^[\s​]*$/.test(e[n])&&!/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(e[n]);)i.push(e[n++]);let r=S(i.join(" "));t.push(/^<img\b[^>]*>$/.test(r)?r:`<p>${r}</p>`)}return t.join(`
`)}function L(s,e){s.querySelectorAll(".pen-imghl").forEach(t=>t.remove());for(let{img:t,variant:n}of e){let o=t.getBoundingClientRect();if(!o.width||!o.height)continue;let i=document.createElement("div");i.className="pen-imghl"+(n?" "+n:""),i.setAttribute("data-pen-ui",""),i.style.left=`${window.scrollX+o.left}px`,i.style.top=`${window.scrollY+o.top}px`,i.style.width=`${o.width}px`,i.style.height=`${o.height}px`,s.appendChild(i)}}var R=class{constructor(e){this.reviews=[];this.api=e.api,this.root=e.root,this.source=e.source,this.onClose=e.onClose}async open(){this.reviews=await this.api.getAllResponses(this.source).catch(()=>[]);let e=document.createElement("div");e.className="pen-panel",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <div class="pen-panel-head"><strong>Reviews</strong>
        <span class="pen-savestate">${this.reviews.length}</span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="close" title="Close">\u2715</button></div>
      <div class="pen-reviews" data-list></div>`;let t=e.querySelector("[data-list]");t.innerHTML=this.reviews.length?this.reviews.map((n,o)=>{let i=(n.quotes??[]).filter(r=>!r.dismissed);return`<div class="pen-review">
            <div class="pen-review-head"><span class="pen-name">${W(n.creator?.name??"reader")}</span>
              <span class="pen-savestate">${pe(n.updated)} \xB7 ${n.status}</span></div>
            <div class="pen-md">${x(n.body||"_(no writing yet)_")}</div>
            ${i.length?`<div class="pen-review-quotes">${i.map((r,a)=>`<a class="pen-qchip" data-ri="${o}" data-qi="${a}">\u201C${W(le(r.text))}\u201D</a>`).join("")}</div>`:""}
          </div>`}).join(""):'<p style="padding:14px;color:var(--pen-muted)">No reviews yet.</p>',e.querySelector('[data-act="close"]').addEventListener("click",()=>this.close()),t.querySelectorAll(".pen-qchip").forEach(n=>n.addEventListener("click",()=>this.focusQuote(+n.dataset.ri,+n.dataset.qi))),document.body.appendChild(e),this.el=e,document.body.classList.add("pen-panel-open")}focusQuote(e,t){let n=this.reviews[e]?.quotes?.[t];if(!n)return;let o=Q(n.selector,this.root);if(!o)return;let i=window.CSS?.highlights;i&&i.set("penumbra-quote-active",new globalThis.Highlight(o));let r=o.getBoundingClientRect();window.scrollTo({top:window.scrollY+r.top-120,behavior:"smooth"})}close(){let e=window.CSS?.highlights;e&&e.delete("penumbra-quote-active"),this.el?.remove(),document.body.classList.remove("pen-panel-open"),this.onClose()}};function W(s){return String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}var pe=s=>{try{return new Date(s).toLocaleDateString()}catch{return""}},le=(s,e=60)=>s.length>e?s.slice(0,e)+"\u2026":s;var K=`
/* ---- theme tokens: light defaults, flipped for dark (OS pref + Quartz toggle) ---- */
:root {
  --pen-bg: #ffffff;
  --pen-fg: #1a1a1a;
  --pen-muted: #6b7280;
  --pen-border: #e4e4e7;
  --pen-shadow: 0 4px 22px rgba(0,0,0,.13);
  --pen-accent: #b9770a;
  --pen-accent-fg: #ffffff;
  --pen-chip: #f3f3f5;
  --pen-chip-hover: #e9e9ec;
  --pen-author: rgba(40,75,99,.12);
  --pen-unread: #e0533b;
}
@media (prefers-color-scheme: dark) {
  :root:not([saved-theme="light"]) {
    --pen-bg: #232328; --pen-fg: #e9e9ec; --pen-muted: #9b9ba4; --pen-border: #3a3a42;
    --pen-shadow: 0 4px 22px rgba(0,0,0,.5); --pen-accent: #e0a52e; --pen-accent-fg: #1a1a1a;
    --pen-chip: #2e2e35; --pen-chip-hover: #3a3a42; --pen-author: rgba(123,151,170,.20); --pen-unread: #ff6f56;
  }
}
:root[saved-theme="dark"] {
  --pen-bg: #232328; --pen-fg: #e9e9ec; --pen-muted: #9b9ba4; --pen-border: #3a3a42;
  --pen-shadow: 0 4px 22px rgba(0,0,0,.5); --pen-accent: #e0a52e; --pen-accent-fg: #1a1a1a;
  --pen-chip: #2e2e35; --pen-chip-hover: #3a3a42; --pen-author: rgba(123,151,170,.20); --pen-unread: #ff6f56;
}

/* translucent highlight reads on both light and dark backgrounds */
::highlight(penumbra) { background-color: rgba(255, 196, 64, 0.32); }
::highlight(penumbra-active) { background-color: rgba(255, 178, 43, 0.58); }
/* pending compose + saved drafts: same yellow, dotted underline until committed */
::highlight(penumbra-draft) { background-color: rgba(255, 196, 64, 0.32); text-decoration: underline dotted; text-decoration-thickness: 2px; }

[data-pen-ui], [data-pen-ui] * { box-sizing: border-box; }
[data-pen-ui] {
  font: 13.5px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  color: var(--pen-fg);
}

/* ---- toolbar ---- */
.pen-toolbar {
  position: fixed; top: 12px; right: 12px; z-index: 2147483646;
  display: flex; gap: 4px; align-items: center;
  background: var(--pen-bg); border: 1px solid var(--pen-border);
  border-radius: 10px; padding: 4px; box-shadow: var(--pen-shadow);
}
.pen-tbtn {
  background: none; border: none; color: var(--pen-fg); cursor: pointer;
  border-radius: 7px; padding: 5px 8px; font-size: 13px; display: flex; align-items: center; gap: 5px;
}
.pen-tbtn:hover { background: var(--pen-chip-hover); }
.pen-tbtn.active { background: var(--pen-accent); color: var(--pen-accent-fg); }
.pen-toolbar select {
  background: var(--pen-chip); color: var(--pen-fg); border: 1px solid var(--pen-border);
  border-radius: 7px; padding: 5px 6px; font: inherit; cursor: pointer;
}
.pen-count { color: var(--pen-muted); font-variant-numeric: tabular-nums; min-width: 38px; text-align: center; }
.pen-sep { width: 1px; align-self: stretch; background: var(--pen-border); margin: 2px 2px; }

/* ---- cards (rail + floating) ---- */
.pen-card {
  position: absolute; width: 290px; z-index: 2147483645;
  background: var(--pen-bg); border: 1px solid var(--pen-border);
  border-radius: 11px; box-shadow: var(--pen-shadow);
  transition: box-shadow .18s ease; overflow: visible; /* let reactions hang off the edge */
}
.pen-card.compact { cursor: pointer; }
.pen-card.compact:hover { border-color: var(--pen-accent); }
.pen-card.focused { box-shadow: 0 0 0 2px var(--pen-accent), var(--pen-shadow); }
.pen-card.pen-emph { border-color: var(--pen-accent); }
.pen-card.floating { position: absolute; }

.pen-quote {
  font-size: 12px; color: var(--pen-muted); border-left: 3px solid var(--pen-accent);
  padding: 5px 9px; margin: 8px 10px 8px; background: var(--pen-chip);
  border-radius: 0 6px 6px 0; white-space: pre-wrap; word-wrap: break-word;
}
/* clamp only in the compact card; expanded shows everything */
.pen-card.compact .pen-quote { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
/* an image quote piece shows the image itself (small preview), not its markdown */
.pen-quote-img { padding: 4px 8px; }
/* fit within a height AND width cap with auto on both axes \u2192 never distorts */
.pen-quote-img img { display: block; max-height: 80px; max-width: 100%; width: auto; height: auto; border-radius: 5px; margin: 0; }
.pen-muted { color: var(--pen-muted); font-style: italic; }
/* images in a margin card are small fixed-height previews (full size lives in the
   editor); the fixed height also keeps card measurement stable so they don't overlap */
.pen-card .pen-md img { display: block; height: 56px; width: auto; max-width: 100%; border-radius: 6px; margin: 0; }
.pen-thread { padding: 2px 12px 10px; }
.pen-comment { padding: 2px 0; }
/* tighten paragraph spacing inside card notes (default <p> margins were huge) */
.pen-card .pen-md p { margin: 0.15em 0; }
.pen-card .pen-md p:first-child { margin-top: 0; }
.pen-card .pen-md p:last-child { margin-bottom: 0; }
.pen-card .pen-md > :first-child { margin-top: 0; }
.pen-card .pen-md > :last-child { margin-bottom: 0; }
.pen-comment + .pen-comment { border-top: 1px solid var(--pen-border); }
.pen-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pen-muted); margin-bottom: 2px; }
.pen-meta img { width: 18px; height: 18px; border-radius: 50%; }
.pen-name { font-weight: 600; color: var(--pen-fg); }
.pen-badge {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  background: var(--pen-author); color: var(--pen-fg); padding: 1px 5px; border-radius: 4px;
}
.pen-body { white-space: pre-wrap; word-wrap: break-word; color: var(--pen-fg); }
.pen-card.compact .pen-md { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pen-unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pen-unread); flex-shrink: 0; }
.pen-more { font-size: 12px; color: var(--pen-muted); padding-top: 4px; }

.pen-actions { display: flex; gap: 12px; flex-wrap: wrap; padding: 6px 12px 10px; }
.pen-actions a { font-size: 12px; color: var(--pen-accent); cursor: pointer; text-decoration: none; }
.pen-actions a:hover { text-decoration: underline; }
/* bottom-left action group, across from the Reply button */
.pen-foot { display: flex; gap: 14px; align-items: center; }
.pen-foot a { font-size: 12px; color: var(--pen-muted); cursor: pointer; text-decoration: none; }
.pen-foot a:hover { text-decoration: underline; color: var(--pen-accent); }
.pen-foot a[data-act="delete"]:hover { color: var(--pen-unread); }

.pen-reply { padding: 6px 12px 12px; }
.pen-reply textarea, .pen-compose textarea {
  width: 100%; resize: none; overflow-y: hidden; font: inherit; line-height: 1.5;
  background: var(--pen-bg); color: var(--pen-fg);
  border: 1px solid var(--pen-border); border-radius: 7px; padding: 7px;
}
.pen-row { display: flex; gap: 8px; align-items: center; justify-content: space-between; margin-top: 7px; }
.pen-btn {
  background: var(--pen-accent); color: var(--pen-accent-fg); border: none;
  border-radius: 7px; padding: 6px 12px; cursor: pointer; font: inherit; font-weight: 600;
}
.pen-btn:hover { filter: brightness(1.06); }
.pen-btn.ghost { background: var(--pen-chip); color: var(--pen-fg); font-weight: 500; }
.pen-btn.ghost:hover { background: var(--pen-chip-hover); }

/* ---- compose popover (on text selection) ---- */
.pen-compose { position: absolute; width: 360px; max-width: calc(100vw - 24px); z-index: 2147483646;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 11px;
  box-shadow: var(--pen-shadow); padding: 10px; }
.pen-compose .pen-note-editor { border: 1px solid var(--pen-border); border-radius: 8px;
  max-height: 40vh; overflow-y: auto; margin-bottom: 8px; }
.pen-compose .pen-prose.pen-mini { min-height: 2.2em; }
.pen-compose .pen-prose.pen-mini > :last-child { margin-bottom: 0; }
.pen-composebar { margin-top: 8px; display: flex; gap: 8px; align-items: center; justify-content: space-between; }
.pen-emojibar { display: flex; flex-wrap: nowrap; gap: 3px; align-items: center; overflow: hidden; }
.pen-emojibar button { font-size: 16px; background: var(--pen-chip); border: 1px solid var(--pen-border);
  border-radius: 8px; padding: 2px 6px; cursor: pointer; line-height: 1.25; }
.pen-emojibar button:hover { background: var(--pen-chip-hover); transform: scale(1.08); }
/* selected = filled (amber tint: darker on light, lighter on dark) + thin border */
.pen-emojibar button.selected, .pen-emojigrid button.selected {
  background: rgba(185,119,10,.22); border-color: var(--pen-accent); box-shadow: none; }
.pen-composebar .pen-btn { flex-shrink: 0; }

.pen-addbtn {
  position: absolute; z-index: 2147483646; transform: translate(-50%, -118%);
  background: var(--pen-fg); color: var(--pen-bg); border: none; border-radius: 7px;
  padding: 6px 11px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: var(--pen-shadow);
  white-space: nowrap;
}

/* ---- emoji reactions (left margin): a horizontal cluster that spreads LEFT ---- */
/* translateX(-100%) pins the right edge at the JS-set left coord, so the cluster
   grows leftward and the rightmost (= first) emoji stays put. */
.pen-emote-stack {
  position: absolute; z-index: 2147483644; cursor: pointer;
  display: flex; flex-direction: row; align-items: center; transform: translateX(-100%);
}
.pen-emote {
  font-size: 16px; line-height: 1; white-space: nowrap; margin-left: -9px;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,.18));
  transition: margin-left .12s ease;
}
.pen-emote:first-child { margin-left: 0; }
/* hover (or emphasised): the overlapping glyphs fan out side-by-side. The right
   edge is pinned, so they spread leftward; a single emoji has nothing to spread. */
.pen-emote-stack:hover .pen-emote, .pen-emote-stack.pen-emph .pen-emote { margin-left: 3px; }
.pen-tooltip {
  position: absolute; z-index: 2147483647; background: var(--pen-fg); color: var(--pen-bg);
  font-size: 12px; padding: 4px 8px; border-radius: 6px; box-shadow: var(--pen-shadow);
  pointer-events: none; max-width: 220px;
}

/* ---- login widget ---- */
.pen-login {
  position: fixed; right: 12px; bottom: 12px; z-index: 2147483645;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 11px;
  box-shadow: var(--pen-shadow); padding: 10px 12px;
}
.pen-login .pen-title { font-size: 12px; color: var(--pen-muted); }
.pen-login .pen-providers { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
.pen-login input { background: var(--pen-bg); color: var(--pen-fg); border: 1px solid var(--pen-border);
  border-radius: 7px; padding: 6px 8px; font: inherit; width: 150px; }

/* quote highlights driven by the response editor */
/* amber/yellow to match a "found" quote's colour in the editor */
::highlight(penumbra-quote) { background-color: rgba(255, 196, 64, 0.34); }
::highlight(penumbra-quote-active) { background-color: rgba(255, 178, 43, 0.62); }

/* image highlights: the Custom Highlight API can't paint a replaced element, so a
   quoted image gets an overlay box instead (pointer-events:none \u2192 clicks fall
   through to the image and hit the normal block/compose handlers). */
.pen-imghl { position: absolute; pointer-events: none; z-index: 2147483643; border-radius: 5px;
  background-color: rgba(255, 196, 64, 0.30); box-shadow: inset 0 0 0 2px rgba(255, 196, 64, 0.55); }
.pen-imghl.active { background-color: rgba(255, 178, 43, 0.42); box-shadow: inset 0 0 0 2px rgba(255, 178, 43, 0.9); }
.pen-imghl.draft { background-color: transparent; box-shadow: inset 0 0 0 2px rgba(255, 196, 64, 0.75); }

/* when a panel is docked: collapse Quartz's sidebars, constrain the doc to the
   left half with comfortable margins, and let the panel own the right half */
body.pen-panel-open .page { max-width: none !important; margin: 0 !important; }
body.pen-panel-open #quartz-body {
  grid-template: "grid-header" "grid-center" "grid-footer" / auto !important;
  width: 50vw !important; max-width: 50vw !important; margin: 0 !important;
  padding: 2rem 3rem !important; box-sizing: border-box !important;
}
body.pen-panel-open #quartz-body, body.pen-panel-open #quartz-body * { box-sizing: border-box; }
body.pen-panel-open #quartz-body .sidebar { display: none !important; }
body.pen-panel-open .center { max-width: none !important; min-width: 0 !important; overflow-wrap: break-word; }

/* ---- response panel: side-by-side essay editor ---- */
.pen-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: 50vw; z-index: 2147483646;
  background: var(--pen-bg); border-left: 1px solid var(--pen-border);
  box-shadow: -8px 0 30px rgba(0,0,0,.18); display: flex; flex-direction: column;
}
.pen-panel-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--pen-border); }
.pen-savestate { font-size: 12px; color: var(--pen-muted); }
.pen-panel-tools { padding: 8px 12px; border-bottom: 1px solid var(--pen-border); }
.pen-refs { max-height: 32%; overflow: auto; padding: 6px 12px; border-bottom: 1px solid var(--pen-border); }
.pen-refs:empty { display: none; }
.pen-refs-title { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--pen-muted); margin: 2px 0 6px; }
.pen-ref { display: flex; align-items: center; gap: 7px; padding: 4px 0; font-size: 12.5px; cursor: pointer; }
.pen-ref.stale { opacity: .5; }
.pen-ref.stale .pen-ref-text { text-decoration: line-through; }
.pen-ref-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pen-ref-dot.ok { background: var(--pen-tertiary, #84a59d); }
.pen-ref-dot.gone { background: var(--pen-unread); }
.pen-ref-dot.dim { background: var(--pen-muted); }
.pen-ref-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pen-ref-acts { display: flex; gap: 8px; align-items: center; }
.pen-ref-acts em { color: var(--pen-unread); font-style: normal; font-size: 11px; }
.pen-ref-acts a { color: var(--pen-accent); cursor: pointer; }
.pen-editor { flex: 1; overflow: auto; }
.pen-prose { padding: 16px 18px; outline: none; min-height: 100%;
  font: 15px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: var(--pen-fg); }
.pen-prose:focus { outline: none; }
.pen-prose p { margin: .5em 0; }
.pen-prose h1, .pen-prose h2, .pen-prose h3 { line-height: 1.25; margin: .7em 0 .3em; }
.pen-prose ul, .pen-prose ol { padding-left: 1.4em; margin: .5em 0; }
.pen-prose a { color: var(--pen-accent); }
/* editor images: natural size, capped to the editor width and 25vh tall */
.pen-prose img { display: block; width: auto; height: auto; max-width: 100%; max-height: 25vh; border-radius: 8px; margin: 8px 0; }
.pen-prose code { background: var(--pen-chip); padding: 1px 5px; border-radius: 4px; font-size: .9em; }
.pen-prose pre { background: var(--pen-chip); padding: 10px 12px; border-radius: 8px; overflow: auto; }
.pen-prose pre code { background: none; padding: 0; }
/* a quote FOUND in the source = burnt amber; NOT found = cool teal (won't anchor) */
.pen-prose blockquote { border-left: 3px solid var(--pen-accent); margin: .6em 0; padding: .2em 12px;
  color: var(--pen-muted); background: rgba(185,119,10,.09); border-radius: 0 5px 5px 0;
  transition: background .12s ease, box-shadow .12s ease, border-color .12s ease; }
.pen-prose blockquote p { margin: .15em 0; }
/* an in-quote image is inline (cursor can sit on either side); cap its size so it
   sits in the text flow rather than blowing the quote open */
.pen-prose img { max-width: 100%; max-height: 260px; width: auto; border-radius: 5px; vertical-align: middle; }
/* live-preview images (Obsidian-style): the image markdown source text is hidden
   and replaced by the rendered picture, except where the cursor sits (then the raw
   source shows so it can be edited) */
.pen-prose .pen-md-img-raw { display: none; }
.pen-prose img.pen-md-img-live { cursor: text; }
.pen-prose blockquote.pen-bq-active { background: rgba(185,119,10,.20);
  box-shadow: inset 4px 0 0 var(--pen-accent), 0 0 0 2px rgba(185,119,10,.42); }
/* quote that won't anchor (text not in source, OR too short) \u2192 cool teal, no picker */
.pen-prose blockquote.pen-bq-orphan { border-left-color: #4f8f80; background: rgba(79,143,128,.13); }
.pen-prose blockquote.pen-bq-orphan.pen-bq-active { background: rgba(79,143,128,.28);
  box-shadow: inset 4px 0 0 #4f8f80, 0 0 0 2px rgba(79,143,128,.42); }
/* gapcursor: a visible blinking caret in the gap before/after a block image */
.ProseMirror-gapcursor { display: none; pointer-events: none; position: absolute; margin: 0; }
.ProseMirror-gapcursor::after { content: ""; display: block; position: absolute; top: -2px; width: 18px;
  border-top: 2px solid var(--pen-fg); animation: pen-gapcursor 1.1s steps(2, start) infinite; }
@keyframes pen-gapcursor { to { visibility: hidden; } }
.ProseMirror-focused .ProseMirror-gapcursor { display: block; }
/* occurrence picker: tiny "N of M \u2039 \u203A" badge above a quote whose text repeats */
.pen-occ { display: inline-flex; align-items: center; vertical-align: middle; gap: 1px;
  font-size: 10px; line-height: 1; color: var(--pen-muted); user-select: none; margin: 1px 0 4px;
  background: var(--pen-chip); border: 1px solid var(--pen-border); border-radius: 7px; padding: 1px 3px; }
.pen-occ-a { border: none; background: none; cursor: pointer; color: var(--pen-muted);
  font: inherit; font-size: 13px; line-height: 1; padding: 0 3px; }
.pen-occ-a:hover { color: var(--pen-accent); }
.pen-occ-n { font-variant-numeric: tabular-nums; padding: 0 2px; white-space: nowrap; }

/* rich editor inside a margin card: borderless, compact, aligned with the quote.
   font-size matches .pen-md so rendered vs editing text are the same size. */
/* match the compact .pen-thread/.pen-md geometry (12px inset) so text doesn't shift on focus */
.pen-prose.pen-mini { padding: 2px 12px; font-size: 14px; line-height: 1.55; min-height: 1.4em; }
.pen-prose.pen-mini p { margin: 0.15em 0; }
.pen-prose.pen-mini img { margin: 4px 0; }
/* the save state floats in the card's bottom-right corner (out of flow, dimmed) so
   "saving\u2026"/"saved" never changes the card's height. */
.pen-card.focused { padding-bottom: 6px; }
.pen-card .pen-savestate { position: absolute; right: 11px; bottom: 1px; pointer-events: none;
  font-size: 11px; color: var(--pen-fg); opacity: .35; }
.pen-card.focused .pen-note-editor .pen-prose.pen-mini > :first-child { margin-top: 0; }
.pen-card.focused .pen-note-editor .pen-prose.pen-mini > :last-child { margin-bottom: 0; }
/* tiny reactions hanging off the bottom edge of a (compact) comment card */
.pen-card-emoji { position: absolute; left: 12px; bottom: -8px; display: flex; gap: 3px;
  font-size: 13px; line-height: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,.2)); }
/* the reaction picker floats just below the focused card (outside it) */
.pen-cardemoji { position: absolute; z-index: 2147483645; }
.pen-cardemoji .pen-emojibar { gap: 5px; overflow: visible; } /* don't clip button shadows */
.pen-cardemoji .pen-emojimore { background: var(--pen-bg); border: 1px solid var(--pen-border);
  border-radius: 11px; box-shadow: var(--pen-shadow); padding: 8px; margin-top: 6px; max-width: 290px; }
.pen-cardemoji .pen-emojibar button { font-size: 17px; padding: 5px 7px; line-height: 1;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 9px; box-shadow: var(--pen-shadow); }
.pen-cardemoji .pen-emojibar button:hover { background: var(--pen-chip-hover); transform: none; }
.pen-cardemoji .pen-emojibar button.selected { background: rgba(185,119,10,.22);
  border-color: var(--pen-accent); box-shadow: var(--pen-shadow); }

/* trash sits OUTSIDE the focused card (left gutter); click reveals stacked \u2713/\u2717 */
.pen-card.focused { overflow: visible; }
.pen-card .pen-trashbox { display: none; position: absolute; left: -34px; top: 2px; flex-direction: column; gap: 4px; }
.pen-card.focused .pen-trashbox { display: flex; }
.pen-trash { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 13px;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 50%; color: var(--pen-muted);
  cursor: pointer; box-shadow: var(--pen-shadow); }
.pen-trash:hover, .pen-trash.pen-no:hover { color: var(--pen-unread); border-color: var(--pen-unread); }
.pen-trash.pen-yes:hover { color: var(--pen-tertiary, #84a59d); border-color: var(--pen-tertiary, #84a59d); }
.pen-trashconfirm { display: flex; flex-direction: column; gap: 4px; }
.pen-trashconfirm[hidden] { display: none; }

/* emoji picker (in the compose box) */
.pen-emoji-more { font-weight: 700; }
.pen-emojimore { margin-top: 6px; }
.pen-emoji-search { width: 100%; box-sizing: border-box; background: var(--pen-bg); color: var(--pen-fg);
  border: 1px solid var(--pen-border); border-radius: 7px; padding: 5px 8px; font: inherit; margin-bottom: 6px; }
.pen-emojigrid { display: flex; flex-wrap: wrap; gap: 2px; max-height: 160px; overflow-y: auto; }
.pen-emojigrid button { font-size: 18px; background: none; border: none; cursor: pointer; border-radius: 6px; padding: 2px 4px; }
.pen-emojigrid button:hover { background: var(--pen-chip-hover); }
.pen-preview { flex: 1; overflow: auto; padding: 14px 16px; }
.pen-preview h1, .pen-preview h2, .pen-preview h3 { line-height: 1.25; }
.pen-preview blockquote { border-left: 3px solid var(--pen-accent); margin: .6em 0; padding: .2em 0 .2em 12px; color: var(--pen-muted); }
.pen-preview img { max-width: 100%; }
.pen-preview pre { background: var(--pen-chip); padding: 10px; border-radius: 8px; overflow: auto; }

/* ---- author reviews panel ---- */
.pen-reviews { flex: 1; overflow: auto; }
.pen-review { padding: 12px 14px; border-bottom: 1px solid var(--pen-border); }
.pen-review-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.pen-md { font-size: 14px; line-height: 1.55; }
.pen-md h1, .pen-md h2, .pen-md h3 { line-height: 1.25; }
.pen-md blockquote { border-left: 3px solid var(--pen-accent); margin: .5em 0; padding: .1em 0 .1em 10px; color: var(--pen-muted); }
.pen-md img { max-width: 100%; }
.pen-md pre { background: var(--pen-chip); padding: 8px; border-radius: 6px; overflow: auto; }
.pen-review-quotes { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.pen-qchip { font-size: 12px; color: var(--pen-muted); background: var(--pen-chip); border: 1px solid var(--pen-border);
  border-radius: 12px; padding: 2px 8px; cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pen-qchip:hover { border-color: var(--pen-accent); color: var(--pen-fg); }

/* ---- mobile: dock comments + compose as a bottom sheet ---- */
/* The sheet is fixed to the bottom (JS lifts it above the keyboard via
   visualViewport). A scrollable body holds the comment/compose; the reaction
   picker sits in a pinned footer. */
.pen-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483646;
  display: flex; flex-direction: column; max-height: 50vh;
  background: var(--pen-bg); border-top: 1px solid var(--pen-border);
  border-radius: 16px 16px 0 0; box-shadow: 0 -6px 30px rgba(0,0,0,.32);
}
.pen-sheet-head { position: relative; flex: 0 0 auto; height: 26px; }
.pen-sheet-grab { width: 40px; height: 4px; border-radius: 3px; background: var(--pen-border); margin: 9px auto 0; }
.pen-sheet-close {
  position: absolute; top: 2px; right: 8px; width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 15px; line-height: 1;
  background: var(--pen-chip); border: 1px solid var(--pen-border); color: var(--pen-fg); cursor: pointer;
}
.pen-sheet-body { flex: 1 1 auto; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 6px 6px; }
.pen-sheet-foot {
  flex: 0 0 auto; border-top: 1px solid var(--pen-border);
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
}
/* the card/compose flow inside the sheet body (drop the floating geometry) */
.pen-sheet .pen-card, .pen-sheet .pen-compose {
  position: static; width: 100%; max-width: 100%; border: none; box-shadow: none;
  border-radius: 0; padding: 0;
}
.pen-sheet .pen-card.focused { box-shadow: none; padding-bottom: 0; }
.pen-sheet .pen-compose .pen-note-editor { max-height: none; margin-bottom: 0; }
/* bigger comment images on mobile (the desktop 56px preview is too small to read) */
.pen-sheet .pen-card .pen-md img { height: auto; max-height: 38vh; }
/* save state back in flow (not floating over the text) */
.pen-sheet .pen-card .pen-savestate { position: static; display: block; text-align: right; padding: 2px 12px 0; opacity: .5; }
/* trash row in flow at the comment's bottom-right (the desktop -34px gutter is off-screen) */
.pen-sheet .pen-card .pen-trashbox {
  position: static; left: auto; top: auto; display: flex; flex-direction: row;
  justify-content: flex-end; gap: 6px; padding: 4px 12px 2px;
}
/* roomier tap targets for the reaction picker in the footer */
.pen-sheet-foot .pen-emojipanel .pen-emojibar { flex-wrap: wrap; gap: 6px; overflow: visible; }
.pen-sheet-foot .pen-emojibar button { font-size: 21px; padding: 6px 10px; }
.pen-sheet-foot .pen-emojigrid button { font-size: 23px; padding: 5px 6px; }
.pen-sheet-foot .pen-emojigrid { max-height: 26vh; }

/* the response / reviews panel goes full-screen on a phone (no room for the
   side-by-side source view); JS keeps its height pinned to the visual viewport
   so the editor stays above the on-screen keyboard. */
@media (max-width: 720px) {
  .pen-panel { width: 100vw; max-width: 100vw; border-left: none; }
  body.pen-panel-open #quartz-body {
    width: 100% !important; max-width: 100% !important; padding: 1rem !important;
  }
  .pen-panel .pen-prose { padding: 14px 14px calc(14px + env(safe-area-inset-bottom, 0px)); }
}
/* the "\u275D Quote" harvest button only makes sense on mobile (desktop selects in the
   left half directly); peek = collapse the editor to a bottom bar to free the page */
.pen-quotebtn { display: none; }
@media (max-width: 720px) { .pen-quotebtn { display: flex; } }
.pen-peekbar {
  display: flex; align-items: center; gap: 10px; justify-content: space-between;
  padding: 9px 14px calc(9px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--pen-border); font-size: 13px; color: var(--pen-muted);
}
.pen-peekbar[hidden] { display: none; }
.pen-peekbar .pen-btn { flex-shrink: 0; padding: 5px 14px; }
.pen-panel.pen-peek {
  top: auto; bottom: 0; height: auto; max-height: none;
  border-radius: 14px 14px 0 0; border-top: 1px solid var(--pen-border);
  box-shadow: 0 -6px 30px rgba(0,0,0,.32);
}
.pen-panel.pen-peek .pen-editor { display: none; }

/* ---- feedback pages (a reader's response rendered as its own page) ---- */
.pen-fb-head {
  font-size: 14px; color: var(--pen-muted); margin: 0 0 1.2em;
  padding-bottom: .7em; border-bottom: 1px solid var(--pen-border);
}
.pen-fb-head a { color: var(--pen-accent); }
.pen-fb-note { color: var(--pen-muted); }
/* the /feedback shell page is a runtime host, not real content \u2014 hide its
   stray entry from the Quartz explorer + any link lists */
.explorer a[href$="/feedback"], .explorer a[data-for="feedback"] { display: none !important; }
`;var M=null;function Z(){return window.__PenumbraResponsePanel?Promise.resolve():M||(M=new Promise((s,e)=>{let t=document.querySelector('script[src*="penumbra.js"]'),n=t?t.src.replace(/penumbra\.js(\?.*)?$/,"penumbra-editor.js"):"/static/penumbra-editor.js";(location.hostname==="localhost"||location.hostname==="127.0.0.1")&&(n+=`?t=${Date.now()}`);let o=document.createElement("script");o.src=n,o.onload=()=>s(),o.onerror=()=>e(new Error("editor failed to load")),document.head.appendChild(o)}),M)}async function de(){return await Z(),window.__PenumbraResponsePanel}async function G(){return await Z(),window.__PenumbraMiniEditor}var ce=typeof globalThis.Highlight<"u"&&!!window.CSS?.highlights,O=10,B=6,he=["\u{1F44D}","\u2764\uFE0F","\u{1F525}","\u{1F604}","\u{1F914}","\u{1F3AF}"],ue=[["\u{1F44D}","thumbs up like yes good approve"],["\u{1F44E}","thumbs down dislike no bad"],["\u2764\uFE0F","heart love red"],["\u{1F525}","fire lit hot flame"],["\u{1F4AF}","hundred 100 perfect score"],["\u{1F389}","party tada celebrate congrats"],["\u{1F680}","rocket launch fast ship"],["\u{1F4A1}","idea bulb light"],["\u2705","check done yes correct"],["\u274C","cross no wrong x"],["\u2B50","star favorite"],["\u{1F64F}","pray thanks please hands"],["\u{1F44F}","clap applause bravo"],["\u{1F440}","eyes look watching"],["\u{1F914}","think thinking hmm"],["\u{1F602}","laugh lol joy cry"],["\u{1F60D}","love eyes heart"],["\u{1F62E}","wow surprised"],["\u{1F622}","sad cry tear"],["\u{1F621}","angry mad rage"],["\u{1F605}","sweat nervous laugh"],["\u{1F60E}","cool sunglasses"],["\u{1F92F}","mind blown exploding head"],["\u{1F64C}","raised hands celebrate yay"],["\u{1F4AA}","muscle strong flex"],["\u{1F91D}","handshake deal agree"],["\u{1F9E0}","brain smart mind"],["\u{1F4CC}","pin important"],["\u26A1","lightning fast bolt energy"],["\u{1F31F}","glowing star"],["\u2728","sparkles shiny magic"],["\u{1F480}","skull dead lol"],["\u{1F979}","holding back tears touched"],["\u{1FAE1}","salute respect"],["\u{1F937}","shrug dunno whatever"],["\u{1FAE0}","melting embarrassed"],["\u{1F4DD}","memo note write"],["\u{1F516}","bookmark save tag"],["\u2753","question"],["\u2757","exclamation important"],["\u{1F600}","grin happy smile"],["\u{1F642}","slight smile"],["\u{1F609}","wink"],["\u{1F928}","raised eyebrow suspicious doubt"],["\u{1F644}","eye roll annoyed"],["\u{1F634}","sleep tired bored"],["\u{1F973}","party face celebrate"],["\u{1F631}","scream shock fear"],["\u{1F913}","nerd glasses geek"],["\u{1FAF6}","heart hands love"],["\u{1F44C}","ok perfect nice"],["\u{1F90C}","chefs kiss pinch"],["\u270C\uFE0F","peace victory"],["\u{1F91E}","fingers crossed luck hope"],["\u{1F44B}","wave hi hello bye"],["\u{1F3AF}","target bullseye goal"],["\u{1F410}","goat greatest"],["\u{1F4B8}","money cash spend"],["\u{1F4C8}","chart up growth"],["\u{1F4C9}","chart down decline"]],me='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',C=class{constructor(e){this.user=null;this.isAuthor=!1;this.preamble="";this.blocks=[];this.highlightsOn=!0;this.focused=null;this.hovered=null;this.hoverRaf=!1;this.relayoutQueued=!1;this.railEntries=[];this.repoQueued=!1;this.railLeft=0;this.quietTimer=null;this.composeNew=!1;this.selTimer=null;this.feedbackId=null;this.isMobile=()=>window.innerWidth<=720;this.blockById=e=>this.blocks.find(t=>t.id===e);this.docY=e=>e.getBoundingClientRect().top+window.scrollY;this.cards=()=>this.blocks.filter(e=>b(e.text)&&e.ranges.length);this.emojiBlocks=()=>this.blocks.filter(e=>e.emojis.length&&e.ranges.length);this.cfg=e,this.api=new v(e.api),this.feedbackId=this.computeFeedbackId(),this.root=this.resolveRoot(),this.source=this.computeSource(),this.commitSha=e.commitSha??null}resolveRoot(){return(this.cfg.root?document.querySelector(this.cfg.root):null)??document.body}computeFeedbackId(){return/\/feedback\/?$/.test(location.pathname)?new URLSearchParams(location.search).get("id"):null}computeSource(){if(this.feedbackId&&this.cfg.sourceBase)return`${this.cfg.sourceBase.replace(/\/$/,"")}/feedback?id=${this.feedbackId}`;if(this.cfg.source)return this.cfg.source;if(this.cfg.sourceBase){let e=location.pathname.replace(/\/index\.html?$/i,"/").replace(/\.html?$/i,"").replace(/\/$/,"");return this.cfg.sourceBase.replace(/\/$/,"")+e}return location.href}async init(){this.styleEl=document.createElement("style"),this.styleEl.setAttribute("data-pen",""),this.styleEl.textContent=K,document.head.appendChild(this.styleEl),this.layer=document.createElement("div"),this.layer.setAttribute("data-pen-ui",""),this.layer.style.cssText="position:absolute;top:0;left:0;width:0;height:0;",document.body.appendChild(this.layer),this.api.captureTokenFromHash();let e=await this.api.me();this.user=e.user,this.isAuthor=e.isAuthor,this.renderToolbar(),this.renderLogin(),await this.loadDoc(),document.addEventListener("mouseup",n=>{n.target.closest("[data-pen-ui]")||this.scheduleSelection()}),document.addEventListener("touchend",n=>{n.target.closest("[data-pen-ui]")||this.scheduleSelection()},{passive:!0}),document.addEventListener("mousedown",n=>this.onDocMouseDown(n)),document.addEventListener("click",n=>this.onDocClick(n)),document.addEventListener("mousemove",n=>this.onMouseMove(n),{passive:!0}),document.addEventListener("keydown",n=>{n.key==="Escape"&&(this.compose?this.dismissCompose():this.focused&&(this.focused=null,this.renderAll()))}),window.addEventListener("resize",()=>this.queueRelayout(),{passive:!0});let t=window.visualViewport;if(t){let n=()=>this.repositionSheets();t.addEventListener("resize",n),t.addEventListener("scroll",n)}}async reload(){this.dismissCompose(),this.removeQuoteBtn(),this.focused=this.hovered=null,this.styleEl.isConnected||document.head.appendChild(this.styleEl),this.layer.isConnected||document.body.appendChild(this.layer),this.toolbar?.isConnected||this.renderToolbar(),this.loginEl?.isConnected||this.renderLogin(),this.feedbackId=this.computeFeedbackId(),this.root=this.resolveRoot(),this.source=this.computeSource(),await this.loadDoc()}async loadDoc(){this.feedbackId&&await this.renderFeedbackPage();let e="";this.user&&(e=(await this.api.getResponse(this.source).catch(()=>null))?.body??""),this.parse(e),this.renderAll()}async renderFeedbackPage(){let e=this.root;if(!this.user){e.innerHTML='<p class="pen-fb-note">Sign in to view this feedback.</p>';return}let t=await this.api.getResponseById(this.feedbackId).catch(()=>null);if(!t){e.innerHTML='<p class="pen-fb-note">This feedback is private, or it doesn\u2019t exist.</p>';return}let n=f(t.creator?.name??"a reader"),o=f(ge(t.source)),i=f(t.source);document.title=`Feedback from ${t.creator?.name??"a reader"}`,e.innerHTML=`<header class="pen-fb-head">Feedback from <b>${n}</b> on <a href="${i}">${o}</a></header>`+x(t.body||"_(empty)_")}parse(e){let{preamble:t,blocks:n}=J(e);this.preamble=t,this.blocks=n.map((o,i)=>{let{emojis:r,text:a}=V(o.note),p=[],c=[],d=u=>{c.includes(u)||c.push(u)};return o.quotes.forEach((u,h)=>{let m=o.nths[h]??1;if(E(u)){let l=D(u,m,this.root);if(l){d(l);let g=document.createRange();g.selectNode(l),p.push(g)}}else{let l=_(u,m,this.root);l&&(p.push(l),T(l,this.root).forEach(d))}}),{id:`b${i}`,quotes:o.quotes,nths:o.nths,note:o.note,emojis:r,text:a,ranges:p,imgs:c}})}async saveDoc(){let e=N(this.preamble,this.blocks.map(n=>({quotes:n.quotes,nths:n.nths,note:n.note}))),t=I(e).map((n,o)=>({id:`q${o}`,text:n,selector:q(n,this.root)??[{type:"TextQuoteSelector",exact:n}]}));try{await this.api.saveResponse(this.source,e,t,this.commitSha)}catch(n){alert("Could not save: "+n.message);return}this.focused=null,this.parse(e),this.renderAll()}async serializeAndSave(){let e=N(this.preamble,this.blocks.map(n=>({quotes:n.quotes,nths:n.nths,note:n.note}))),t=I(e).map((n,o)=>({id:`q${o}`,text:n,selector:q(n,this.root)??[{type:"TextQuoteSelector",exact:n}]}));try{return await this.api.saveResponse(this.source,e,t,this.commitSha),!0}catch{return!1}}saveQuiet(e){let t=n=>{let o=e?.querySelector("[data-cardsave]");o&&(o.textContent=n)};t("saving\u2026"),clearTimeout(this.quietTimer),this.quietTimer=setTimeout(async()=>t(await this.serializeAndSave()?"saved":"save failed"),600)}flushQuiet(){clearTimeout(this.quietTimer),this.serializeAndSave()}composeNote(e,t){let n=e.join(""),o=t.replace(/^\s+/,"");return o.trim()?n?`${n} ${o}`:o:n}renderAll(){if(this.renderHighlights(),this.isMobile()){this.layoutMobileSheet();return}this.layoutRightRail(),this.layoutLeftRail()}scheduleSelection(){clearTimeout(this.selTimer),this.selTimer=setTimeout(()=>this.onSelection(),30)}layoutMobileSheet(){if(this.railRO?.disconnect(),this.destroyCardEditor(),this.layer.querySelectorAll(".pen-card.rail, .pen-cardemoji, .pen-emote-stack, .pen-sheet").forEach(i=>i.remove()),this.cardEmojiRow=void 0,this.railEntries=[],!this.highlightsOn||this.responsePanel)return;let e=this.blockById(this.focused);if(!e||!e.ranges.length||!b(e.text))return;let t=this.buildCard(e,!0),n=document.createElement("div");n.className="pen-sheet-foot",n.setAttribute("data-pen-ui",""),n.appendChild(this.buildEmojiPanel(()=>e.emojis,i=>this.toggleCardEmoji(e,i,t)));let o=this.wrapSheet(t,{onClose:()=>{this.focused=null,this.renderAll()},footer:n});this.layer.appendChild(o),this.railEntries=[{el:t,blk:e}],this.positionSheet(o),this.mountCardEditor(t,e)}wrapSheet(e,t){let n=document.createElement("div");n.className="pen-sheet",n.setAttribute("data-pen-ui","");let o=document.createElement("div");o.className="pen-sheet-head",o.innerHTML='<div class="pen-sheet-grab"></div>';let i=document.createElement("button");i.className="pen-sheet-close",i.setAttribute("aria-label","Close"),i.textContent="\u2715",i.addEventListener("click",a=>{a.stopPropagation(),t.onClose()}),o.appendChild(i);let r=document.createElement("div");return r.className="pen-sheet-body",r.appendChild(e),n.appendChild(o),n.appendChild(r),t.footer&&n.appendChild(t.footer),n}positionSheet(e){let t=window.visualViewport;if(!t){e.style.maxHeight="50vh";return}let n=Math.max(0,window.innerHeight-t.height-t.offsetTop);e.style.bottom=`${n}px`,e.style.maxHeight=`${Math.round(Math.min(window.innerHeight*.5,t.height-12))}px`}repositionSheets(){this.layer.querySelectorAll(".pen-sheet").forEach(e=>this.positionSheet(e))}dockBox(e,t,n){if(this.isMobile()){let o=this.wrapSheet(e,{onClose:n});this.layer.appendChild(o),this.composeRoot=o,this.positionSheet(o)}else e.style.left=`${Math.min(window.scrollX+t.left,window.scrollX+window.innerWidth-372)}px`,e.style.top=`${window.scrollY+t.bottom+8}px`,this.layer.appendChild(e),this.composeRoot=e}queueRelayout(){this.relayoutQueued||(this.relayoutQueued=!0,requestAnimationFrame(()=>{this.relayoutQueued=!1,this.renderAll()}))}renderHighlights(){if(this.renderImageOverlays(),!ce)return;let e=window.CSS.highlights,t=globalThis.Highlight;if(this.responsePanel)return;if(!this.highlightsOn){e.delete("penumbra-quote"),e.delete("penumbra-quote-active"),e.delete("penumbra-draft");return}let n=this.blocks.flatMap(i=>i.ranges);n.length?e.set("penumbra-quote",new t(...n)):e.delete("penumbra-quote"),this.composeCtx?.range?e.set("penumbra-draft",new t(this.composeCtx.range)):e.delete("penumbra-draft");let o=this.blockById(this.hovered??this.focused)?.ranges[0];o?e.set("penumbra-quote-active",new t(o)):e.delete("penumbra-quote-active")}renderImageOverlays(){if(!this.highlightsOn||this.responsePanel){L(this.layer,[]);return}let e=this.hovered??this.focused,t=[];for(let n of this.blocks)for(let o of n.imgs)t.push({img:o,variant:n.id===e?"active":void 0});for(let n of this.composeCtx?.imgs??[])t.push({img:n,variant:"draft"});L(this.layer,t)}layoutRightRail(){if(this.railRO?.disconnect(),this.destroyCardEditor(),this.layer.querySelectorAll(".pen-card.rail, .pen-cardemoji, .pen-sheet").forEach(o=>o.remove()),this.cardEmojiRow=void 0,this.railEntries=[],!this.highlightsOn||this.responsePanel)return;let e=this.root.getBoundingClientRect();if(window.innerWidth-e.right<300)return;this.railLeft=window.scrollX+e.right+24;let t=this.cards().sort((o,i)=>this.docY(o.ranges[0])-this.docY(i.ranges[0]));if(!t.length)return;for(let o of t){let i=this.buildCard(o,this.focused===o.id);i.style.left=`${this.railLeft}px`,i.style.top="-9999px",this.layer.appendChild(i),this.railEntries.push({el:i,blk:o})}let n=this.railEntries.find(o=>o.blk.id===this.focused);if(n){let o=document.createElement("div");o.className="pen-cardemoji",o.setAttribute("data-pen-ui",""),o.appendChild(this.buildEmojiPanel(()=>n.blk.emojis,i=>this.toggleCardEmoji(n.blk,i,n.el))),this.layer.appendChild(o),this.cardEmojiRow=o}this.railRO=new ResizeObserver(()=>this.queueReposition()),this.railEntries.forEach(o=>this.railRO.observe(o.el)),this.repositionRail(),n&&this.mountCardEditor(n.el,n.blk)}async mountCardEditor(e,t){let n=e.querySelector("[data-note-editor]");if(!n)return;let o;try{o=await G()}catch{return}this.focused!==t.id||!n.isConnected||(this.destroyCardEditor(),n.textContent="",this.cardEditor=o(n,t.text,{onChange:i=>{t.text=i,t.note=this.composeNote(t.emojis,i),this.queueReposition(),this.saveQuiet(e)},uploadImage:i=>this.api.uploadImage(i)}),this.isMobile()||this.cardEditor.focus())}destroyCardEditor(){this.cardEditor&&(this.flushQuiet(),this.cardEditor.destroy(),this.cardEditor=void 0)}queueReposition(){this.repoQueued||(this.repoQueued=!0,requestAnimationFrame(()=>{this.repoQueued=!1,this.repositionRail()}))}repositionRail(){if(this.isMobile())return;let e=this.railEntries;if(!e.length)return;let t=e.findIndex(a=>a.blk.id===this.focused),n=this.cardEmojiRow?this.cardEmojiRow.offsetHeight+8:0,o=e.map((a,p)=>a.el.offsetHeight+(p===t?n:a.blk.emojis.length&&a.blk.id!==this.focused?11:0)),i=e.map(a=>a.blk.ranges[0]?this.docY(a.blk.ranges[0]):0),r=i.slice();if(t>=0){r[t]=i[t];for(let a=t+1;a<e.length;a++)r[a]=Math.max(i[a],r[a-1]+o[a-1]+O);for(let a=t-1;a>=0;a--)r[a]=Math.min(i[a],r[a+1]-o[a]-O)}else for(let a=1;a<e.length;a++)r[a]=Math.max(i[a],r[a-1]+o[a-1]+O);e.forEach((a,p)=>a.el.style.top=`${Math.max(0,r[p])}px`),this.cardEmojiRow&&t>=0&&(this.cardEmojiRow.style.left=`${this.railLeft}px`,this.cardEmojiRow.style.top=`${Math.max(0,r[t])+e[t].el.offsetHeight+8}px`)}layoutLeftRail(){if(this.layer.querySelectorAll(".pen-emote-stack").forEach(o=>o.remove()),!this.highlightsOn||this.responsePanel||this.isMobile())return;let e=this.root.getBoundingClientRect(),t=window.scrollX+e.left-8,n=0;for(let o of this.emojiBlocks().sort((i,r)=>this.docY(i.ranges[0])-this.docY(r.ranges[0]))){let i=document.createElement("div"),r=this.hovered===o.id||this.focused===o.id;i.className=`pen-emote-stack${r?" pen-emph":""}`,i.setAttribute("data-pen-ui",""),i.dataset.blockId=o.id,i.innerHTML=o.emojis.slice().reverse().map(p=>`<span class="pen-emote">${f(p)}</span>`).join(""),i.title=b(o.text)?"Open comment":"Edit reaction",i.addEventListener("mouseenter",()=>this.setHovered(o.id)),i.addEventListener("mouseleave",()=>this.setHovered(null)),i.addEventListener("click",()=>b(o.text)?this.focus(o.id):this.editBlock(o)),this.layer.appendChild(i);let a=Math.max(this.docY(o.ranges[0]),n+6);i.style.left=`${t}px`,i.style.top=`${a}px`,n=a+i.offsetHeight}}buildCard(e,t){let n=document.createElement("div");n.className=`pen-card rail ${t?"focused":"compact"}`,n.setAttribute("data-pen-ui",""),n.dataset.blockId=e.id;let o=e.quotes.map(i=>{let r=E(i);return r?`<div class="pen-quote pen-quote-img"><img src="${f(r)}" alt=""></div>`:`<div class="pen-quote">${f(i)}</div>`}).join("");if(t){n.innerHTML=`${o}
        <div class="pen-note-editor" data-note-editor><div class="pen-md">${x(e.text)}</div></div>
        <span class="pen-savestate" data-cardsave></span>
        <div class="pen-trashbox">
          <button class="pen-trash" data-act="del-init" title="Delete comment">${me}</button>
          <div class="pen-trashconfirm" data-confirm hidden>
            <button class="pen-trash pen-yes" data-act="del-yes" title="Confirm delete">\u2713</button>
            <button class="pen-trash pen-no" data-act="del-no" title="Cancel">\u2715</button>
          </div></div>`;let i=n.querySelector("[data-confirm]"),r=n.querySelector('[data-act="del-init"]');r.addEventListener("click",()=>{r.style.display="none",i.hidden=!1}),n.querySelector('[data-act="del-no"]').addEventListener("click",()=>{i.hidden=!0,r.style.display=""}),n.querySelector('[data-act="del-yes"]').addEventListener("click",()=>{e.emojis.length?(e.text="",e.note=this.composeNote(e.emojis,"")):this.blocks=this.blocks.filter(a=>a.id!==e.id),this.saveDoc()})}else{let i=b(e.text)?`<div class="pen-md">${x(e.text)}</div>`:'<div class="pen-md pen-muted">Add a comment\u2026</div>',r=e.emojis.length?`<div class="pen-card-emoji">${e.emojis.map(a=>`<span>${f(a)}</span>`).join("")}</div>`:"";n.innerHTML=`${o}<div class="pen-thread">${i}</div>${r}`,n.addEventListener("click",()=>this.focus(e.id))}return n.addEventListener("mouseenter",()=>this.setHovered(e.id)),n.addEventListener("mouseleave",()=>this.setHovered(null)),n}focus(e){this.focused=e,this.renderAll()}toggleCardEmoji(e,t,n){this.cardEditor&&(e.text=this.cardEditor.getMarkdown());let o=e.emojis.indexOf(t);o>=0?e.emojis.splice(o,1):e.emojis.length<B&&e.emojis.push(t),e.note=this.composeNote(e.emojis,e.text),this.layoutLeftRail(),this.queueReposition(),this.saveQuiet(n);let i=this.cardEditor;requestAnimationFrame(()=>i?.refocus())}setHovered(e){this.hovered!==e&&(this.hovered=e,this.layer.querySelectorAll("[data-block-id]").forEach(t=>t.classList.toggle("pen-emph",t.dataset.blockId===e)),this.renderHighlights())}onMouseMove(e){this.hoverRaf||this.responsePanel||(this.hoverRaf=!0,requestAnimationFrame(()=>{if(this.hoverRaf=!1,e.target?.closest?.("[data-pen-ui]"))return;let t=null;for(let n of this.blocks)if(n.ranges.some(o=>this.hitsRange(e,o))){t=n.id;break}this.setHovered(t)}))}onSelection(){let e=window.getSelection();if(!e||e.isCollapsed||e.rangeCount===0||!e.toString().trim()){this.removeQuoteBtn();return}let t=e.getRangeAt(0);if(this.root.contains(t.commonAncestorContainer)){if(this.responsePanel){this.showQuoteButton(t.cloneRange());return}this.highlightsOn&&this.openCompose(t.cloneRange())}}showQuoteButton(e){this.removeQuoteBtn();let t=e.getBoundingClientRect(),n=document.createElement("button");n.className="pen-addbtn",n.setAttribute("data-pen-ui",""),n.textContent="Quote",n.style.left=`${window.scrollX+t.left+t.width/2}px`,n.style.top=`${window.scrollY+t.top}px`,n.onmousedown=o=>{o.preventDefault(),o.stopPropagation()},n.onclick=()=>{this.responsePanel?.appendQuote(e),window.getSelection()?.removeAllRanges(),this.removeQuoteBtn()},this.layer.appendChild(n),this.quoteBtn=n}removeQuoteBtn(){this.quoteBtn?.remove(),this.quoteBtn=void 0}async openCompose(e,t,n){if(!this.user){e&&this.promptSignIn(e);return}let o=[],i=[],r=[];if(t)o=t.quotes,i=t.nths,r=t.imgs;else if(n)o=[P(n)],i=[H(n,this.root)],r=[n];else if(e){let l=U(e,this.root);l&&(o=l.quotes,i=l.nths),r=T(e,this.root)}let a=o[0]??"";if(!a)return;let p=e??t?.ranges[0]??null;if(!p)return;this.dismissCompose();let c=t??{id:`b${this.blocks.length}`,quotes:o,nths:i,note:"",emojis:[],text:"",ranges:[e.cloneRange()],imgs:r},d=p.getBoundingClientRect(),u=document.createElement("div");u.className="pen-compose",u.setAttribute("data-pen-ui",""),u.innerHTML='<div class="pen-note-editor" data-note-editor></div><div data-emojislot></div>',u.querySelector("[data-emojislot]").appendChild(this.buildEmojiPanel(()=>c.emojis,l=>this.toggleComposeEmoji(l))),this.dockBox(u,d,()=>this.dismissCompose()),this.compose=u,this.composeBlock=c,this.composeNew=!t,e&&(this.composeCtx={range:e,quote:a,imgs:r},this.renderHighlights());let h;try{h=await G()}catch{return}if(this.compose!==u)return;let m=u.querySelector("[data-note-editor]");this.composeEditor=h(m,c.text,{onChange:l=>{c.text=l,c.note=this.composeNote(c.emojis,l),this.graftCompose(),this.saveQuiet()},uploadImage:l=>this.api.uploadImage(l),onSubmit:()=>this.dismissCompose()}),this.composeEditor.focus()}editBlock(e){this.openCompose(null,e)}imageRange(e){let t=document.createRange();return t.selectNode(e),t}composeWorthKeeping(e){return e.emojis.length>0||b(e.text)}graftCompose(){let e=this.composeBlock;if(!e||!this.composeNew)return;let t=this.blocks.includes(e),n=this.composeWorthKeeping(e);n&&!t?this.blocks.push(e):!n&&t&&(this.blocks=this.blocks.filter(o=>o!==e))}toggleComposeEmoji(e){let t=this.composeBlock;if(!t)return;this.composeEditor&&(t.text=this.composeEditor.getMarkdown());let n=t.emojis.indexOf(e);if(n>=0)t.emojis.splice(n,1),t.note=this.composeNote(t.emojis,t.text),this.graftCompose(),this.layoutLeftRail(),this.saveQuiet();else if(t.emojis.length<B){let o=t.emojis.length===0;t.emojis.push(e),t.note=this.composeNote(t.emojis,t.text),o?this.finalizeCompose():(this.graftCompose(),this.layoutLeftRail(),this.saveQuiet())}}promptSignIn(e){this.dismissCompose();let t=e.getBoundingClientRect(),n=document.createElement("div");n.className="pen-compose",n.setAttribute("data-pen-ui",""),n.innerHTML=`<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`,n.querySelector('[data-act="signin"]').addEventListener("click",()=>{this.dismissCompose(),this.flashLogin()}),this.dockBox(n,t,()=>this.dismissCompose()),this.compose=n}buildEmojiPanel(e,t){let n=document.createElement("div");n.className="pen-emojipanel",n.innerHTML=`
      <div class="pen-emojibar" data-bar></div>
      <div class="pen-emojimore" data-more hidden>
        <input class="pen-emoji-search" placeholder="Search emoji\u2026">
        <div class="pen-emojigrid" data-grid></div>
      </div>`;let o=n.querySelector("[data-bar]"),i=n.querySelector("[data-grid]"),r=n.querySelector("[data-more]"),a=n.querySelector(".pen-emoji-search");o.addEventListener("mousedown",h=>h.preventDefault()),i.addEventListener("mousedown",h=>h.preventDefault()),n.addEventListener("click",h=>h.stopPropagation());let p=(h,m)=>`<button class="${m.includes(h)?"selected":""}" data-e="${f(h)}">${f(h)}</button>`,c=()=>{let h=e(),m=a.value.trim().toLowerCase();i.innerHTML=ue.filter(([l,g])=>!m||g.includes(m)||l===a.value).map(([l])=>p(l,h)).join(""),i.querySelectorAll("[data-e]").forEach(l=>l.addEventListener("click",g=>{g.stopPropagation(),u(l.dataset.e)}))},d=()=>{let h=e(),m=he.filter(l=>!h.includes(l)).slice(0,Math.max(0,B-h.length));o.innerHTML=h.map(l=>p(l,h)).join("")+m.map(l=>p(l,h)).join("")+'<button class="pen-emoji-more" data-act="more" title="More emoji">\uFF0B</button>',o.querySelectorAll("[data-e]").forEach(l=>l.addEventListener("click",g=>{g.stopPropagation(),u(l.dataset.e)})),o.querySelector('[data-act="more"]').addEventListener("click",l=>{l.stopPropagation(),r.hidden=!r.hidden,r.hidden||(c(),a.focus())})},u=h=>{t(h),d(),r.hidden||c()};return a.addEventListener("input",c),d(),n}teardownCompose(){clearTimeout(this.quietTimer),this.composeEditor?.destroy(),this.composeEditor=void 0,this.composeBlock=void 0,this.composeNew=!1,(this.composeRoot??this.compose)?.remove(),this.compose=void 0,this.composeRoot=void 0,this.composeCtx=void 0}finalizeCompose(){if(!this.compose)return;let e=this.composeBlock;if(e&&this.composeEditor&&(e.text=this.composeEditor.getMarkdown(),e.note=this.composeNote(e.emojis,e.text)),e){let t=this.composeWorthKeeping(e);t&&!this.blocks.includes(e)?this.blocks.push(e):t||(this.blocks=this.blocks.filter(n=>n!==e))}this.teardownCompose(),window.getSelection()?.removeAllRanges(),this.saveDoc()}dismissCompose(){if(!this.compose){this.renderHighlights();return}this.finalizeCompose()}onDocMouseDown(e){e.target.closest("[data-pen-ui]")||(this.dismissCompose(),this.removeQuoteBtn())}onDocClick(e){if(this.responsePanel||e.target.closest("[data-pen-ui]")||window.getSelection()?.toString().trim())return;let t=e.target.closest("img");for(let n of this.blocks)if(n.ranges.some(o=>this.hitsRange(e,o))||t&&n.imgs.includes(t))return b(n.text)?this.focus(n.id):this.editBlock(n);if(t&&this.highlightsOn&&this.root.contains(t)&&!t.closest("[data-pen-ui]")){this.openCompose(this.imageRange(t),void 0,t);return}this.focused&&(this.focused=null,this.renderAll())}hitsRange(e,t){for(let n of t.getClientRects())if(e.clientX>=n.left&&e.clientX<=n.right&&e.clientY>=n.top&&e.clientY<=n.bottom)return!0;return!1}renderToolbar(){this.toolbar?.remove();let e=document.createElement("div");e.className="pen-toolbar",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <button class="pen-tbtn active" data-act="toggle" title="Show/hide highlights">\u2726 Highlights</button>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="response" title="Write a full response">\u270D Response</button>
      ${this.isAuthor?`<button class="pen-tbtn" data-act="reviews" title="See everyone's responses">\u{1F441} Reviews</button>`:""}`,e.querySelector('[data-act="toggle"]').addEventListener("click",()=>{this.highlightsOn=!this.highlightsOn,e.querySelector('[data-act="toggle"]').classList.toggle("active",this.highlightsOn),this.renderAll()}),e.querySelector('[data-act="response"]').addEventListener("click",()=>this.toggleResponse()),e.querySelector('[data-act="reviews"]')?.addEventListener("click",()=>this.toggleReviews()),document.body.appendChild(e),this.toolbar=e}toggleReviews(){if(this.reviewsPanel){this.reviewsPanel.close();return}this.reviewsPanel=new R({api:this.api,root:this.root,source:this.source,onClose:()=>{this.reviewsPanel=void 0}}),this.reviewsPanel.open()}async toggleResponse(){if(this.responsePanel){this.responsePanel.close();return}if(!this.user)return this.flashLogin();let e;this.toolbar?.querySelector('[data-act="response"]')?.classList.add("active");try{e=await de()}catch{this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),alert("Could not load the editor.");return}this.responsePanel||(this.destroyCardEditor(),this.layer.querySelectorAll(".pen-card.rail, .pen-emote-stack").forEach(t=>t.remove()),L(this.layer,[]),this.responsePanel=new e({api:this.api,root:this.root,source:this.source,commitSha:this.commitSha,userName:this.user.name??"you",onClose:()=>{this.responsePanel=void 0,this.removeQuoteBtn(),this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),this.loadDoc()}}),this.responsePanel.open())}showTooltip(e,t){this.hideTooltip();let n=document.createElement("div");n.className="pen-tooltip",n.setAttribute("data-pen-ui",""),n.textContent=t,this.layer.appendChild(n);let o=e.getBoundingClientRect();n.style.left=`${window.scrollX+o.right+8}px`,n.style.top=`${window.scrollY+o.top}px`,this.tooltip=n}hideTooltip(){this.tooltip?.remove(),this.tooltip=void 0}renderLogin(){this.loginEl?.remove();let e=document.createElement("div");if(e.className="pen-login",e.setAttribute("data-pen-ui",""),this.user)e.innerHTML=`<span class="pen-title">Signed in as <span class="pen-name">${f(this.user.name??"you")}</span>${this.isAuthor?' <span class="pen-badge">author</span>':""}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`,e.querySelector('[data-act="logout"]').addEventListener("click",async()=>{await this.api.logout(),this.user=null,this.isAuthor=!1,this.renderLogin(),this.loadDoc()});else{e.innerHTML=`<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn" data-act="email">Email me a link</button></div>`;let t=async()=>{let n=e.querySelector("input"),o=n.value.trim();if(!o)return;let i=await this.api.emailLogin(o);i.link?location.href=i.link:(n.value="",n.placeholder="Check your email \u2709\uFE0F")};e.querySelector('[data-act="email"]').addEventListener("click",t),e.querySelector("input").addEventListener("keydown",n=>{n.key==="Enter"&&t()})}document.body.appendChild(e),this.loginEl=e}flashLogin(){this.loginEl?.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:380,iterations:2})}},f=s=>String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),ge=s=>{try{let e=new URL(s).pathname.replace(/\/$/,"").split("/").pop()??"";return decodeURIComponent(e).replace(/[-_]/g," ").trim()||"the page"}catch{return"the page"}};function ee(){let s=window.PENUMBRA;if(!s?.api){console.warn("[penumbra] window.PENUMBRA.api is not set; annotator disabled.");return}let e=new C(s);window.penumbra=e,e.init().catch(t=>console.error("[penumbra] init failed",t)),document.addEventListener("nav",()=>e.reload().catch(t=>console.error("[penumbra] reload failed",t)))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ee):ee();})();
//# sourceMappingURL=penumbra.js.map
