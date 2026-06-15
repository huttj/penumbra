"use strict";(()=>{var j="penumbra:token",x=class{constructor(e){this.base=e}get token(){return localStorage.getItem(j)}set token(e){e?localStorage.setItem(j,e):localStorage.removeItem(j)}headers(e=!1){let t={};return e&&(t["Content-Type"]="application/json"),this.token&&(t.Authorization=`Bearer ${this.token}`),t}captureTokenFromHash(){let e=/[#&]pen_token=([^&]+)/.exec(location.hash);return e?(this.token=decodeURIComponent(e[1]),history.replaceState(null,"",location.pathname+location.search),!0):!1}async me(){if(!this.token)return{user:null,isAuthor:!1};let e=await fetch(`${this.base}/me`,{headers:this.headers()});if(!e.ok)return{user:null,isAuthor:!1};let t=await e.json();return{user:t.user,isAuthor:!!t.isAuthor}}async list(e,t=[]){let n=new URLSearchParams({source:e});t.length&&n.set("include",t.join(","));let o=await fetch(`${this.base}/annotations?${n}`);return o.ok?(await o.json()).items:[]}async create(e,t,n={}){let o=await fetch(`${this.base}/annotations`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({target:e,kind:n.kind??"comment",body:[{type:"TextualBody",value:t}],docVersion:n.docVersion})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`create failed (${o.status})`);return o.json()}async reply(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}/replies`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({text:t})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`reply failed (${o.status})`);return o.json()}async patch(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}`,{method:"PATCH",headers:this.headers(!0),body:JSON.stringify(t)});if(!o.ok)throw new Error(`patch failed (${o.status})`);return o.json()}async remove(e){let t=e.split("/annotations/")[1];await fetch(`${this.base}/annotations/${t}`,{method:"DELETE",headers:this.headers()})}async getResponse(e){let t=await fetch(`${this.base}/responses?source=${encodeURIComponent(e)}`,{headers:this.headers()});return t.ok?(await t.json()).response:null}async saveResponse(e,t,n,o){let r=await fetch(`${this.base}/responses`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e,body:t,quotes:n,sourceSha:o})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error??`save failed (${r.status})`);return r.json()}async getAllResponses(e){let t=await fetch(`${this.base}/responses/all?source=${encodeURIComponent(e)}`,{headers:this.headers()});return t.ok?(await t.json()).responses:[]}async submitResponse(e){let t=await fetch(`${this.base}/responses/submit`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e})}),n=await t.json().catch(()=>({}));if(!t.ok)throw new Error(n.error??`submit failed (${t.status})`);return n}async uploadImage(e){let t={"Content-Type":e.type||"application/octet-stream"};this.token&&(t.Authorization=`Bearer ${this.token}`);let n=await fetch(`${this.base}/upload`,{method:"POST",headers:t,body:e});if(!n.ok)throw new Error(`upload failed (${n.status})`);return(await n.json()).url}loginUrl(e){return`${this.base}/auth/${e}/start?return=${encodeURIComponent(location.href)}`}async emailLogin(e){return(await fetch(`${this.base}/auth/email/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,return:location.href})})).json()}async logout(){await fetch(`${this.base}/auth/logout`,{method:"POST",headers:this.headers()}).catch(()=>{}),this.token=null}};function v(s){let e=document.createTreeWalker(s,NodeFilter.SHOW_TEXT,{acceptNode(r){let a=r.parentElement;return a&&a.closest("[data-pen-ui]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[],n="",o;for(;o=e.nextNode();){let r=o,a=n.length;n+=r.data,t.push({node:r,start:a,end:n.length})}return{text:n,nodes:t}}function w(s,e){for(let n of s.nodes)if(e>=n.start&&e<=n.end)return{node:n.node,offset:e-n.start};let t=s.nodes[s.nodes.length-1];return t?{node:t.node,offset:t.node.data.length}:null}function y(s,e,t){if(e.nodeType===Node.TEXT_NODE){let r=s.nodes.find(a=>a.node===e);return r?r.start+t:null}let n=e.childNodes[t]??e.childNodes[e.childNodes.length-1];if(!n)return null;let o=s.nodes.find(r=>r.node===n||n.contains(r.node));return o?o.start:null}function H(s,e){let t=v(e),n=y(t,s.startContainer,s.startOffset),o=y(t,s.endContainer,s.endOffset);if(n==null||o==null||o<=n)return null;let r=t.text.slice(n,o),a=t.text.slice(Math.max(0,n-32),n),i=t.text.slice(o,o+32);return[{type:"TextQuoteSelector",exact:r,prefix:a,suffix:i},{type:"TextPositionSelector",start:n,end:o}]}function A(s,e){let t=s.find(p=>p.type==="TextQuoteSelector");if(!t?.exact)return null;let n=v(e),o=J(n.text,t);if(o<0)return null;let r=w(n,o),a=w(n,o+t.exact.length);if(!r||!a)return null;let i=document.createRange();return i.setStart(r.node,r.offset),i.setEnd(a.node,a.offset),i}function N(s,e){let t=[],n=s.indexOf(e);for(;n>=0;)t.push(n),n=s.indexOf(e,n+1);return t}function B(s,e){let t=v(e),n=y(t,s.startContainer,s.startOffset),o=y(t,s.endContainer,s.endOffset);if(n==null||o==null||o<=n)return 1;let r=t.text.slice(n,o),a=N(t.text,r).indexOf(n);return a>=0?a+1:1}function z(s,e,t){if(!s)return null;let n=v(t),o=N(n.text,s);if(!o.length)return null;let r=o[Math.min(Math.max(1,e||1),o.length)-1],a=w(n,r),i=w(n,r+s.length);if(!a||!i)return null;let p=document.createRange();return p.setStart(a.node,a.offset),p.setEnd(i.node,i.offset),p}function C(s,e){let t=s.trim();if(t.length<8)return null;let n=v(e),o=n.text.indexOf(t);return o<0?null:[{type:"TextQuoteSelector",exact:t,prefix:n.text.slice(Math.max(0,o-32),o),suffix:n.text.slice(o+t.length,o+t.length+32)},{type:"TextPositionSelector",start:o,end:o+t.length}]}function J(s,e){let t=[],n=s.indexOf(e.exact);for(;n>=0;)t.push(n),n=s.indexOf(e.exact,n+1);if(t.length===0)return-1;if(t.length===1)return t[0];let o=t[0],r=-1;for(let a of t){let i=0;if(e.prefix){let p=s.slice(Math.max(0,a-e.prefix.length),a);i+=K(p,e.prefix)}if(e.suffix){let p=s.slice(a+e.exact.length,a+e.exact.length+e.suffix.length);i+=W(p,e.suffix)}i>r&&(r=i,o=a)}return o}var W=(s,e)=>{let t=0;for(;t<s.length&&t<e.length&&s[t]===e[t];)t++;return t},K=(s,e)=>{let t=0;for(;t<s.length&&t<e.length&&s[s.length-1-t]===e[e.length-1-t];)t++;return t};var O=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function Q(s){let e=/^\s*>(\d+)\s(.*)$/.exec(s);return e?{nth:Number(e[1]),text:e[2]}:{nth:1,text:(s??"").replace(/^\s*>\s?/,"")}}function V(s,e){return s>1?`>${s} ${e}`:`> ${e}`}function G(s){let e=[],t=[],n=1,o=()=>{let r=t.join(" ").trim();r.length>=6&&e.push({text:r,nth:n}),t=[],n=1};for(let r of(s??"").split(`
`))if(/^\s*>/.test(r))if(t.length)t.push(r.replace(/^\s*>\s?/,""));else{let a=Q(r);n=a.nth,t.push(a.text)}else t.length&&o();return t.length&&o(),e}function R(s){return G(s).map(e=>e.text)}var L=s=>/^\s*>/.test(s??"");function I(s){let e=(s??"").replace(/\r\n/g,`
`).split(`
`),t=0,n=[];for(;t<e.length&&!L(e[t]);)n.push(e[t]),t++;let o=[];for(;t<e.length;){let r=[],a=1;for(;t<e.length&&L(e[t]);){if(r.length)r.push(e[t].replace(/^\s*>\s?/,""));else{let p=Q(e[t]);a=p.nth,r.push(p.text)}t++}let i=[];for(;t<e.length&&!L(e[t]);)i.push(e[t]),t++;for(;i.length&&i[0].trim()==="";)i.shift();for(;i.length&&i[i.length-1].replace(/​/g,"").trim()==="";)i.pop();o.push({quotes:[r.join(" ").trim()],nths:[a],note:i.join(`
`)})}return{preamble:n.join(`
`).trim(),blocks:o}}function q(s,e){let t=[];for(let a of e){let i=a.note.replace(/^\n+/,"").replace(/[\s​]+$/,"");if(!a.quotes.join("").trim()&&!i.trim())continue;let p=a.quotes.map((h,c)=>V(a.nths?.[c]??1,h.replace(/\n/g," "))).join(`
>
`);t.push(i?`${p}

${i}`:p)}let n=t.join(`


`),o=s.trim();return(o&&n?`${o}

${n}`:o||n)+`
`}function F(s){let e=s??"",t=[],n=0,o=Intl.Segmenter;if(typeof o=="function")for(let{segment:r}of new o("en",{granularity:"grapheme"}).segment(e)){if(/^\s+$/.test(r)){n+=r.length;continue}if(/\p{Extended_Pictographic}/u.test(r)){t.push(r),n+=r.length;continue}break}else{let r=/^((?:\p{Extended_Pictographic}(?:[️‍\u{1F3FB}-\u{1F3FF}]|\p{Extended_Pictographic})*|\s)+)/u.exec(e);if(r){n=r[0].length;for(let a of[...r[0]])/\p{Extended_Pictographic}/u.test(a)&&t.push(a)}}return{emojis:t,text:e.slice(n)}}function u(s){let e=(s??"").replace(/​/g,""),t=Intl.Segmenter;if(typeof t=="function"){for(let{segment:n}of new t("en",{granularity:"grapheme"}).segment(e))if(!/^\s+$/.test(n)&&!/\p{Extended_Pictographic}/u.test(n))return!0;return!1}return/\S/.test(e.replace(/\p{Extended_Pictographic}/gu,""))}function k(s){return O(s).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>")}function g(s){let e=(s??"").replace(/\r\n/g,`
`).split(`
`),t=[],n=0;for(;n<e.length;){let o=e[n];if(/^```/.test(o)){let i=[];for(n++;n<e.length&&!/^```/.test(e[n]);)i.push(e[n++]);n++,t.push(`<pre><code>${O(i.join(`
`))}</code></pre>`);continue}if(/^[\s​]*$/.test(o)){n++;continue}if(/^#{1,6}\s/.test(o)){let i=/^(#{1,6})\s+(.*)$/.exec(o);t.push(`<h${i[1].length}>${k(i[2])}</h${i[1].length}>`),n++;continue}if(/^\s*([-*_])\1{2,}\s*$/.test(o)){t.push("<hr>"),n++;continue}if(/^\s*>/.test(o)){let i=[];for(;n<e.length&&/^\s*>/.test(e[n]);)i.push(e[n++].replace(/^\s*>\s?/,""));t.push(`<blockquote>${g(i.join(`
`))}</blockquote>`);continue}if(/^\s*[-*+]\s/.test(o)){let i=[];for(;n<e.length&&/^\s*[-*+]\s/.test(e[n]);)i.push(`<li>${k(e[n++].replace(/^\s*[-*+]\s+/,""))}</li>`);t.push(`<ul>${i.join("")}</ul>`);continue}if(/^\s*\d+\.\s/.test(o)){let i=[];for(;n<e.length&&/^\s*\d+\.\s/.test(e[n]);)i.push(`<li>${k(e[n++].replace(/^\s*\d+\.\s+/,""))}</li>`);t.push(`<ol>${i.join("")}</ol>`);continue}let r=[];for(;n<e.length&&!/^[\s​]*$/.test(e[n])&&!/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(e[n]);)r.push(e[n++]);let a=k(r.join(" "));t.push(/^<img\b[^>]*>$/.test(a)?a:`<p>${a}</p>`)}return t.join(`
`)}var E=class{constructor(e){this.reviews=[];this.api=e.api,this.root=e.root,this.source=e.source,this.onClose=e.onClose}async open(){this.reviews=await this.api.getAllResponses(this.source).catch(()=>[]);let e=document.createElement("div");e.className="pen-panel",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <div class="pen-panel-head"><strong>Reviews</strong>
        <span class="pen-savestate">${this.reviews.length}</span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="close" title="Close">\u2715</button></div>
      <div class="pen-reviews" data-list></div>`;let t=e.querySelector("[data-list]");t.innerHTML=this.reviews.length?this.reviews.map((n,o)=>{let r=(n.quotes??[]).filter(a=>!a.dismissed);return`<div class="pen-review">
            <div class="pen-review-head"><span class="pen-name">${_(n.creator?.name??"reader")}</span>
              <span class="pen-savestate">${Z(n.updated)} \xB7 ${n.status}</span></div>
            <div class="pen-md">${g(n.body||"_(no writing yet)_")}</div>
            ${r.length?`<div class="pen-review-quotes">${r.map((a,i)=>`<a class="pen-qchip" data-ri="${o}" data-qi="${i}">\u201C${_(ee(a.text))}\u201D</a>`).join("")}</div>`:""}
          </div>`}).join(""):'<p style="padding:14px;color:var(--pen-muted)">No reviews yet.</p>',e.querySelector('[data-act="close"]').addEventListener("click",()=>this.close()),t.querySelectorAll(".pen-qchip").forEach(n=>n.addEventListener("click",()=>this.focusQuote(+n.dataset.ri,+n.dataset.qi))),document.body.appendChild(e),this.el=e,document.body.classList.add("pen-panel-open")}focusQuote(e,t){let n=this.reviews[e]?.quotes?.[t];if(!n)return;let o=A(n.selector,this.root);if(!o)return;let r=window.CSS?.highlights;r&&r.set("penumbra-quote-active",new globalThis.Highlight(o));let a=o.getBoundingClientRect();window.scrollTo({top:window.scrollY+a.top-120,behavior:"smooth"})}close(){let e=window.CSS?.highlights;e&&e.delete("penumbra-quote-active"),this.el?.remove(),document.body.classList.remove("pen-panel-open"),this.onClose()}};function _(s){return String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}var Z=s=>{try{return new Date(s).toLocaleDateString()}catch{return""}},ee=(s,e=60)=>s.length>e?s.slice(0,e)+"\u2026":s;var D=`
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
.pen-prose blockquote { border-left: 3px solid var(--pen-accent); margin: .6em 0; padding: .2em 0 .2em 12px;
  color: var(--pen-muted); background: rgba(185,119,10,.09); border-radius: 0 5px 5px 0;
  transition: background .12s ease, box-shadow .12s ease, border-color .12s ease; }
.pen-prose blockquote p { margin: .15em 0; }
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
`;var S=null;function U(){return window.__PenumbraResponsePanel?Promise.resolve():S||(S=new Promise((s,e)=>{let t=document.querySelector('script[src*="penumbra.js"]'),n=t?t.src.replace(/penumbra\.js(\?.*)?$/,"penumbra-editor.js"):"/static/penumbra-editor.js";(location.hostname==="localhost"||location.hostname==="127.0.0.1")&&(n+=`?t=${Date.now()}`);let o=document.createElement("script");o.src=n,o.onload=()=>s(),o.onerror=()=>e(new Error("editor failed to load")),document.head.appendChild(o)}),S)}async function te(){return await U(),window.__PenumbraResponsePanel}async function X(){return await U(),window.__PenumbraMiniEditor}var ne=typeof globalThis.Highlight<"u"&&!!window.CSS?.highlights,M=10,$=6,oe=["\u{1F44D}","\u2764\uFE0F","\u{1F525}","\u{1F604}","\u{1F914}","\u{1F3AF}"],re=[["\u{1F44D}","thumbs up like yes good approve"],["\u{1F44E}","thumbs down dislike no bad"],["\u2764\uFE0F","heart love red"],["\u{1F525}","fire lit hot flame"],["\u{1F4AF}","hundred 100 perfect score"],["\u{1F389}","party tada celebrate congrats"],["\u{1F680}","rocket launch fast ship"],["\u{1F4A1}","idea bulb light"],["\u2705","check done yes correct"],["\u274C","cross no wrong x"],["\u2B50","star favorite"],["\u{1F64F}","pray thanks please hands"],["\u{1F44F}","clap applause bravo"],["\u{1F440}","eyes look watching"],["\u{1F914}","think thinking hmm"],["\u{1F602}","laugh lol joy cry"],["\u{1F60D}","love eyes heart"],["\u{1F62E}","wow surprised"],["\u{1F622}","sad cry tear"],["\u{1F621}","angry mad rage"],["\u{1F605}","sweat nervous laugh"],["\u{1F60E}","cool sunglasses"],["\u{1F92F}","mind blown exploding head"],["\u{1F64C}","raised hands celebrate yay"],["\u{1F4AA}","muscle strong flex"],["\u{1F91D}","handshake deal agree"],["\u{1F9E0}","brain smart mind"],["\u{1F4CC}","pin important"],["\u26A1","lightning fast bolt energy"],["\u{1F31F}","glowing star"],["\u2728","sparkles shiny magic"],["\u{1F480}","skull dead lol"],["\u{1F979}","holding back tears touched"],["\u{1FAE1}","salute respect"],["\u{1F937}","shrug dunno whatever"],["\u{1FAE0}","melting embarrassed"],["\u{1F4DD}","memo note write"],["\u{1F516}","bookmark save tag"],["\u2753","question"],["\u2757","exclamation important"],["\u{1F600}","grin happy smile"],["\u{1F642}","slight smile"],["\u{1F609}","wink"],["\u{1F928}","raised eyebrow suspicious doubt"],["\u{1F644}","eye roll annoyed"],["\u{1F634}","sleep tired bored"],["\u{1F973}","party face celebrate"],["\u{1F631}","scream shock fear"],["\u{1F913}","nerd glasses geek"],["\u{1FAF6}","heart hands love"],["\u{1F44C}","ok perfect nice"],["\u{1F90C}","chefs kiss pinch"],["\u270C\uFE0F","peace victory"],["\u{1F91E}","fingers crossed luck hope"],["\u{1F44B}","wave hi hello bye"],["\u{1F3AF}","target bullseye goal"],["\u{1F410}","goat greatest"],["\u{1F4B8}","money cash spend"],["\u{1F4C8}","chart up growth"],["\u{1F4C9}","chart down decline"]],ie='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',T=class{constructor(e){this.user=null;this.isAuthor=!1;this.preamble="";this.blocks=[];this.highlightsOn=!0;this.focused=null;this.hovered=null;this.hoverRaf=!1;this.relayoutQueued=!1;this.railEntries=[];this.repoQueued=!1;this.railLeft=0;this.quietTimer=null;this.composeNew=!1;this.blockById=e=>this.blocks.find(t=>t.id===e);this.docY=e=>e.getBoundingClientRect().top+window.scrollY;this.cards=()=>this.blocks.filter(e=>u(e.text)&&e.ranges.length);this.emojiBlocks=()=>this.blocks.filter(e=>e.emojis.length&&e.ranges.length);this.cfg=e,this.api=new x(e.api),this.root=this.resolveRoot(),this.source=this.computeSource(),this.commitSha=e.commitSha??null}resolveRoot(){return(this.cfg.root?document.querySelector(this.cfg.root):null)??document.body}computeSource(){if(this.cfg.source)return this.cfg.source;if(this.cfg.sourceBase){let e=location.pathname.replace(/\/index\.html?$/i,"/").replace(/\.html?$/i,"").replace(/\/$/,"");return this.cfg.sourceBase.replace(/\/$/,"")+e}return location.href}async init(){this.styleEl=document.createElement("style"),this.styleEl.setAttribute("data-pen",""),this.styleEl.textContent=D,document.head.appendChild(this.styleEl),this.layer=document.createElement("div"),this.layer.setAttribute("data-pen-ui",""),this.layer.style.cssText="position:absolute;top:0;left:0;width:0;height:0;",document.body.appendChild(this.layer),this.api.captureTokenFromHash();let e=await this.api.me();this.user=e.user,this.isAuthor=e.isAuthor,this.renderToolbar(),this.renderLogin(),await this.loadDoc(),document.addEventListener("mouseup",t=>{t.target.closest("[data-pen-ui]")||setTimeout(()=>this.onSelection(),0)}),document.addEventListener("mousedown",t=>this.onDocMouseDown(t)),document.addEventListener("click",t=>this.onDocClick(t)),document.addEventListener("mousemove",t=>this.onMouseMove(t),{passive:!0}),document.addEventListener("keydown",t=>{t.key==="Escape"&&(this.compose?this.dismissCompose():this.focused&&(this.focused=null,this.renderAll()))}),window.addEventListener("resize",()=>this.queueRelayout(),{passive:!0})}async reload(){this.dismissCompose(),this.removeQuoteBtn(),this.focused=this.hovered=null,this.styleEl.isConnected||document.head.appendChild(this.styleEl),this.layer.isConnected||document.body.appendChild(this.layer),this.toolbar?.isConnected||this.renderToolbar(),this.loginEl?.isConnected||this.renderLogin(),this.root=this.resolveRoot(),this.source=this.computeSource(),await this.loadDoc()}async loadDoc(){let e="";this.user&&(e=(await this.api.getResponse(this.source).catch(()=>null))?.body??""),this.parse(e),this.renderAll()}parse(e){let{preamble:t,blocks:n}=I(e);this.preamble=t,this.blocks=n.map((o,r)=>{let{emojis:a,text:i}=F(o.note);return{id:`b${r}`,quotes:o.quotes,nths:o.nths,note:o.note,emojis:a,text:i,ranges:o.quotes.map((p,h)=>z(p,o.nths[h]??1,this.root)).filter(Boolean)}})}async saveDoc(){let e=q(this.preamble,this.blocks.map(n=>({quotes:n.quotes,nths:n.nths,note:n.note}))),t=R(e).map((n,o)=>({id:`q${o}`,text:n,selector:C(n,this.root)??[{type:"TextQuoteSelector",exact:n}]}));try{await this.api.saveResponse(this.source,e,t,this.commitSha)}catch(n){alert("Could not save: "+n.message);return}this.focused=null,this.parse(e),this.renderAll()}async serializeAndSave(){let e=q(this.preamble,this.blocks.map(n=>({quotes:n.quotes,nths:n.nths,note:n.note}))),t=R(e).map((n,o)=>({id:`q${o}`,text:n,selector:C(n,this.root)??[{type:"TextQuoteSelector",exact:n}]}));try{return await this.api.saveResponse(this.source,e,t,this.commitSha),!0}catch{return!1}}saveQuiet(e){let t=n=>{let o=e?.querySelector("[data-cardsave]");o&&(o.textContent=n)};t("saving\u2026"),clearTimeout(this.quietTimer),this.quietTimer=setTimeout(async()=>t(await this.serializeAndSave()?"saved":"save failed"),600)}flushQuiet(){clearTimeout(this.quietTimer),this.serializeAndSave()}composeNote(e,t){let n=e.join(""),o=t.replace(/^\s+/,"");return o.trim()?n?`${n} ${o}`:o:n}renderAll(){this.renderHighlights(),this.layoutRightRail(),this.layoutLeftRail()}queueRelayout(){this.relayoutQueued||(this.relayoutQueued=!0,requestAnimationFrame(()=>{this.relayoutQueued=!1,this.renderAll()}))}renderHighlights(){if(!ne)return;let e=window.CSS.highlights,t=globalThis.Highlight;if(this.responsePanel)return;if(!this.highlightsOn){e.delete("penumbra-quote"),e.delete("penumbra-quote-active"),e.delete("penumbra-draft");return}let n=this.blocks.flatMap(r=>r.ranges);n.length?e.set("penumbra-quote",new t(...n)):e.delete("penumbra-quote"),this.composeCtx?.range?e.set("penumbra-draft",new t(this.composeCtx.range)):e.delete("penumbra-draft");let o=this.blockById(this.hovered??this.focused)?.ranges[0];o?e.set("penumbra-quote-active",new t(o)):e.delete("penumbra-quote-active")}layoutRightRail(){if(this.railRO?.disconnect(),this.destroyCardEditor(),this.layer.querySelectorAll(".pen-card.rail, .pen-cardemoji").forEach(o=>o.remove()),this.cardEmojiRow=void 0,this.railEntries=[],!this.highlightsOn||this.responsePanel)return;let e=this.root.getBoundingClientRect();if(window.innerWidth-e.right<300)return;this.railLeft=window.scrollX+e.right+24;let t=this.cards().sort((o,r)=>this.docY(o.ranges[0])-this.docY(r.ranges[0]));if(!t.length)return;for(let o of t){let r=this.buildCard(o,this.focused===o.id);r.style.left=`${this.railLeft}px`,r.style.top="-9999px",this.layer.appendChild(r),this.railEntries.push({el:r,blk:o})}let n=this.railEntries.find(o=>o.blk.id===this.focused);if(n){let o=document.createElement("div");o.className="pen-cardemoji",o.setAttribute("data-pen-ui",""),o.appendChild(this.buildEmojiPanel(()=>n.blk.emojis,r=>this.toggleCardEmoji(n.blk,r,n.el))),this.layer.appendChild(o),this.cardEmojiRow=o}this.railRO=new ResizeObserver(()=>this.queueReposition()),this.railEntries.forEach(o=>this.railRO.observe(o.el)),this.repositionRail(),n&&this.mountCardEditor(n.el,n.blk)}async mountCardEditor(e,t){let n=e.querySelector("[data-note-editor]");if(!n)return;let o;try{o=await X()}catch{return}this.focused!==t.id||!n.isConnected||(this.destroyCardEditor(),n.textContent="",this.cardEditor=o(n,t.text,{onChange:r=>{t.text=r,t.note=this.composeNote(t.emojis,r),this.queueReposition(),this.saveQuiet(e)},uploadImage:r=>this.api.uploadImage(r)}),this.cardEditor.focus())}destroyCardEditor(){this.cardEditor&&(this.flushQuiet(),this.cardEditor.destroy(),this.cardEditor=void 0)}queueReposition(){this.repoQueued||(this.repoQueued=!0,requestAnimationFrame(()=>{this.repoQueued=!1,this.repositionRail()}))}repositionRail(){let e=this.railEntries;if(!e.length)return;let t=e.findIndex(i=>i.blk.id===this.focused),n=this.cardEmojiRow?this.cardEmojiRow.offsetHeight+8:0,o=e.map((i,p)=>i.el.offsetHeight+(p===t?n:i.blk.emojis.length&&i.blk.id!==this.focused?11:0)),r=e.map(i=>i.blk.ranges[0]?this.docY(i.blk.ranges[0]):0),a=r.slice();if(t>=0){a[t]=r[t];for(let i=t+1;i<e.length;i++)a[i]=Math.max(r[i],a[i-1]+o[i-1]+M);for(let i=t-1;i>=0;i--)a[i]=Math.min(r[i],a[i+1]-o[i]-M)}else for(let i=1;i<e.length;i++)a[i]=Math.max(r[i],a[i-1]+o[i-1]+M);e.forEach((i,p)=>i.el.style.top=`${Math.max(0,a[p])}px`),this.cardEmojiRow&&t>=0&&(this.cardEmojiRow.style.left=`${this.railLeft}px`,this.cardEmojiRow.style.top=`${Math.max(0,a[t])+e[t].el.offsetHeight+8}px`)}layoutLeftRail(){if(this.layer.querySelectorAll(".pen-emote-stack").forEach(o=>o.remove()),!this.highlightsOn||this.responsePanel)return;let e=this.root.getBoundingClientRect(),t=window.scrollX+e.left-8,n=0;for(let o of this.emojiBlocks().sort((r,a)=>this.docY(r.ranges[0])-this.docY(a.ranges[0]))){let r=document.createElement("div"),a=this.hovered===o.id||this.focused===o.id;r.className=`pen-emote-stack${a?" pen-emph":""}`,r.setAttribute("data-pen-ui",""),r.dataset.blockId=o.id,r.innerHTML=o.emojis.slice().reverse().map(p=>`<span class="pen-emote">${f(p)}</span>`).join(""),r.title=u(o.text)?"Open comment":"Edit reaction",r.addEventListener("mouseenter",()=>this.setHovered(o.id)),r.addEventListener("mouseleave",()=>this.setHovered(null)),r.addEventListener("click",()=>u(o.text)?this.focus(o.id):this.editBlock(o)),this.layer.appendChild(r);let i=Math.max(this.docY(o.ranges[0]),n+6);r.style.left=`${t}px`,r.style.top=`${i}px`,n=i+r.offsetHeight}}buildCard(e,t){let n=document.createElement("div");n.className=`pen-card rail ${t?"focused":"compact"}`,n.setAttribute("data-pen-ui",""),n.dataset.blockId=e.id;let o=e.quotes.map(r=>`<div class="pen-quote">${f(r)}</div>`).join("");if(t){n.innerHTML=`${o}
        <div class="pen-note-editor" data-note-editor><div class="pen-md">${g(e.text)}</div></div>
        <span class="pen-savestate" data-cardsave></span>
        <div class="pen-trashbox">
          <button class="pen-trash" data-act="del-init" title="Delete comment">${ie}</button>
          <div class="pen-trashconfirm" data-confirm hidden>
            <button class="pen-trash pen-yes" data-act="del-yes" title="Confirm delete">\u2713</button>
            <button class="pen-trash pen-no" data-act="del-no" title="Cancel">\u2715</button>
          </div></div>`;let r=n.querySelector("[data-confirm]"),a=n.querySelector('[data-act="del-init"]');a.addEventListener("click",()=>{a.style.display="none",r.hidden=!1}),n.querySelector('[data-act="del-no"]').addEventListener("click",()=>{r.hidden=!0,a.style.display=""}),n.querySelector('[data-act="del-yes"]').addEventListener("click",()=>{e.emojis.length?(e.text="",e.note=this.composeNote(e.emojis,"")):this.blocks=this.blocks.filter(i=>i.id!==e.id),this.saveDoc()})}else{let r=u(e.text)?`<div class="pen-md">${g(e.text)}</div>`:'<div class="pen-md pen-muted">Add a comment\u2026</div>',a=e.emojis.length?`<div class="pen-card-emoji">${e.emojis.map(i=>`<span>${f(i)}</span>`).join("")}</div>`:"";n.innerHTML=`${o}<div class="pen-thread">${r}</div>${a}`,n.addEventListener("click",()=>this.focus(e.id))}return n.addEventListener("mouseenter",()=>this.setHovered(e.id)),n.addEventListener("mouseleave",()=>this.setHovered(null)),n}focus(e){this.focused=e,this.renderAll()}toggleCardEmoji(e,t,n){this.cardEditor&&(e.text=this.cardEditor.getMarkdown());let o=e.emojis.indexOf(t);o>=0?e.emojis.splice(o,1):e.emojis.length<$&&e.emojis.push(t),e.note=this.composeNote(e.emojis,e.text),this.layoutLeftRail(),this.queueReposition(),this.saveQuiet(n);let r=this.cardEditor;requestAnimationFrame(()=>r?.refocus())}setHovered(e){this.hovered!==e&&(this.hovered=e,this.layer.querySelectorAll("[data-block-id]").forEach(t=>t.classList.toggle("pen-emph",t.dataset.blockId===e)),this.renderHighlights())}onMouseMove(e){this.hoverRaf||this.responsePanel||(this.hoverRaf=!0,requestAnimationFrame(()=>{if(this.hoverRaf=!1,e.target?.closest?.("[data-pen-ui]"))return;let t=null;for(let n of this.blocks)if(n.ranges.some(o=>this.hitsRange(e,o))){t=n.id;break}this.setHovered(t)}))}onSelection(){let e=window.getSelection();if(!e||e.isCollapsed||e.rangeCount===0||!e.toString().trim()){this.removeQuoteBtn();return}let t=e.getRangeAt(0);if(this.root.contains(t.commonAncestorContainer)){if(this.responsePanel){this.showQuoteButton(t.cloneRange());return}this.openCompose(t.cloneRange())}}showQuoteButton(e){this.removeQuoteBtn();let t=e.getBoundingClientRect(),n=document.createElement("button");n.className="pen-addbtn",n.setAttribute("data-pen-ui",""),n.textContent="Quote",n.style.left=`${window.scrollX+t.left+t.width/2}px`,n.style.top=`${window.scrollY+t.top}px`,n.onmousedown=o=>{o.preventDefault(),o.stopPropagation()},n.onclick=()=>{this.responsePanel?.appendQuote(e),window.getSelection()?.removeAllRanges(),this.removeQuoteBtn()},this.layer.appendChild(n),this.quoteBtn=n}removeQuoteBtn(){this.quoteBtn?.remove(),this.quoteBtn=void 0}async openCompose(e,t){if(!this.user){e&&this.promptSignIn(e);return}let n="";if(t?n=t.quotes[0]??"":e&&(n=H(e,this.root)?.find(c=>c.type==="TextQuoteSelector")?.exact??""),!n)return;let o=e??t?.ranges[0]??null;if(!o)return;this.dismissCompose();let r=t??{id:`b${this.blocks.length}`,quotes:[n],nths:[B(e,this.root)],note:"",emojis:[],text:"",ranges:[e.cloneRange()]},a=o.getBoundingClientRect(),i=document.createElement("div");i.className="pen-compose",i.setAttribute("data-pen-ui",""),i.style.left=`${Math.min(window.scrollX+a.left,window.scrollX+window.innerWidth-372)}px`,i.style.top=`${window.scrollY+a.bottom+8}px`,i.innerHTML='<div class="pen-note-editor" data-note-editor></div><div data-emojislot></div>',i.querySelector("[data-emojislot]").appendChild(this.buildEmojiPanel(()=>r.emojis,c=>this.toggleComposeEmoji(c))),this.layer.appendChild(i),this.compose=i,this.composeBlock=r,this.composeNew=!t,e&&(this.composeCtx={range:e,quote:n},this.renderHighlights());let p;try{p=await X()}catch{return}if(this.compose!==i)return;let h=i.querySelector("[data-note-editor]");this.composeEditor=p(h,r.text,{onChange:c=>{r.text=c,r.note=this.composeNote(r.emojis,c),this.graftCompose(),this.saveQuiet()},uploadImage:c=>this.api.uploadImage(c),onSubmit:()=>this.dismissCompose()}),this.composeEditor.focus()}editBlock(e){this.openCompose(null,e)}composeWorthKeeping(e){return e.emojis.length>0||u(e.text)}graftCompose(){let e=this.composeBlock;if(!e||!this.composeNew)return;let t=this.blocks.includes(e),n=this.composeWorthKeeping(e);n&&!t?this.blocks.push(e):!n&&t&&(this.blocks=this.blocks.filter(o=>o!==e))}toggleComposeEmoji(e){let t=this.composeBlock;if(!t)return;this.composeEditor&&(t.text=this.composeEditor.getMarkdown());let n=t.emojis.indexOf(e);if(n>=0)t.emojis.splice(n,1),t.note=this.composeNote(t.emojis,t.text),this.graftCompose(),this.layoutLeftRail(),this.saveQuiet();else if(t.emojis.length<$){let o=t.emojis.length===0;t.emojis.push(e),t.note=this.composeNote(t.emojis,t.text),o?this.finalizeCompose():(this.graftCompose(),this.layoutLeftRail(),this.saveQuiet())}}promptSignIn(e){this.dismissCompose();let t=e.getBoundingClientRect(),n=document.createElement("div");n.className="pen-compose",n.setAttribute("data-pen-ui",""),n.style.left=`${Math.min(window.scrollX+t.left,window.scrollX+window.innerWidth-372)}px`,n.style.top=`${window.scrollY+t.bottom+8}px`,n.innerHTML=`<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`,n.querySelector('[data-act="signin"]').addEventListener("click",()=>{this.dismissCompose(),this.flashLogin()}),this.layer.appendChild(n),this.compose=n}buildEmojiPanel(e,t){let n=document.createElement("div");n.className="pen-emojipanel",n.innerHTML=`
      <div class="pen-emojibar" data-bar></div>
      <div class="pen-emojimore" data-more hidden>
        <input class="pen-emoji-search" placeholder="Search emoji\u2026">
        <div class="pen-emojigrid" data-grid></div>
      </div>`;let o=n.querySelector("[data-bar]"),r=n.querySelector("[data-grid]"),a=n.querySelector("[data-more]"),i=n.querySelector(".pen-emoji-search");o.addEventListener("mousedown",l=>l.preventDefault()),r.addEventListener("mousedown",l=>l.preventDefault()),n.addEventListener("click",l=>l.stopPropagation());let p=(l,m)=>`<button class="${m.includes(l)?"selected":""}" data-e="${f(l)}">${f(l)}</button>`,h=()=>{let l=e(),m=i.value.trim().toLowerCase();r.innerHTML=re.filter(([d,b])=>!m||b.includes(m)||d===i.value).map(([d])=>p(d,l)).join(""),r.querySelectorAll("[data-e]").forEach(d=>d.addEventListener("click",b=>{b.stopPropagation(),P(d.dataset.e)}))},c=()=>{let l=e(),m=oe.filter(d=>!l.includes(d)).slice(0,Math.max(0,$-l.length));o.innerHTML=l.map(d=>p(d,l)).join("")+m.map(d=>p(d,l)).join("")+'<button class="pen-emoji-more" data-act="more" title="More emoji">\uFF0B</button>',o.querySelectorAll("[data-e]").forEach(d=>d.addEventListener("click",b=>{b.stopPropagation(),P(d.dataset.e)})),o.querySelector('[data-act="more"]').addEventListener("click",d=>{d.stopPropagation(),a.hidden=!a.hidden,a.hidden||(h(),i.focus())})},P=l=>{t(l),c(),a.hidden||h()};return i.addEventListener("input",h),c(),n}teardownCompose(){clearTimeout(this.quietTimer),this.composeEditor?.destroy(),this.composeEditor=void 0,this.composeBlock=void 0,this.composeNew=!1,this.compose?.remove(),this.compose=void 0,this.composeCtx=void 0}finalizeCompose(){if(!this.compose)return;let e=this.composeBlock;if(e&&this.composeEditor&&(e.text=this.composeEditor.getMarkdown(),e.note=this.composeNote(e.emojis,e.text)),e){let t=this.composeWorthKeeping(e);t&&!this.blocks.includes(e)?this.blocks.push(e):t||(this.blocks=this.blocks.filter(n=>n!==e))}this.teardownCompose(),window.getSelection()?.removeAllRanges(),this.saveDoc()}dismissCompose(){if(!this.compose){this.renderHighlights();return}this.finalizeCompose()}onDocMouseDown(e){e.target.closest("[data-pen-ui]")||(this.dismissCompose(),this.removeQuoteBtn())}onDocClick(e){if(!this.responsePanel&&!e.target.closest("[data-pen-ui]")&&!window.getSelection()?.toString().trim()){for(let t of this.blocks)if(t.ranges.some(n=>this.hitsRange(e,n)))return u(t.text)?this.focus(t.id):this.editBlock(t);this.focused&&(this.focused=null,this.renderAll())}}hitsRange(e,t){for(let n of t.getClientRects())if(e.clientX>=n.left&&e.clientX<=n.right&&e.clientY>=n.top&&e.clientY<=n.bottom)return!0;return!1}renderToolbar(){this.toolbar?.remove();let e=document.createElement("div");e.className="pen-toolbar",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <button class="pen-tbtn active" data-act="toggle" title="Show/hide highlights">\u2726 Highlights</button>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="response" title="Write a full response">\u270D Response</button>
      ${this.isAuthor?`<button class="pen-tbtn" data-act="reviews" title="See everyone's responses">\u{1F441} Reviews</button>`:""}`,e.querySelector('[data-act="toggle"]').addEventListener("click",()=>{this.highlightsOn=!this.highlightsOn,e.querySelector('[data-act="toggle"]').classList.toggle("active",this.highlightsOn),this.renderAll()}),e.querySelector('[data-act="response"]').addEventListener("click",()=>this.toggleResponse()),e.querySelector('[data-act="reviews"]')?.addEventListener("click",()=>this.toggleReviews()),document.body.appendChild(e),this.toolbar=e}toggleReviews(){if(this.reviewsPanel){this.reviewsPanel.close();return}this.reviewsPanel=new E({api:this.api,root:this.root,source:this.source,onClose:()=>{this.reviewsPanel=void 0}}),this.reviewsPanel.open()}async toggleResponse(){if(this.responsePanel){this.responsePanel.close();return}if(!this.user)return this.flashLogin();let e;this.toolbar?.querySelector('[data-act="response"]')?.classList.add("active");try{e=await te()}catch{this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),alert("Could not load the editor.");return}this.responsePanel||(this.destroyCardEditor(),this.layer.querySelectorAll(".pen-card.rail, .pen-emote-stack").forEach(t=>t.remove()),this.responsePanel=new e({api:this.api,root:this.root,source:this.source,commitSha:this.commitSha,userName:this.user.name??"you",onClose:()=>{this.responsePanel=void 0,this.removeQuoteBtn(),this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),this.loadDoc()}}),this.responsePanel.open())}showTooltip(e,t){this.hideTooltip();let n=document.createElement("div");n.className="pen-tooltip",n.setAttribute("data-pen-ui",""),n.textContent=t,this.layer.appendChild(n);let o=e.getBoundingClientRect();n.style.left=`${window.scrollX+o.right+8}px`,n.style.top=`${window.scrollY+o.top}px`,this.tooltip=n}hideTooltip(){this.tooltip?.remove(),this.tooltip=void 0}renderLogin(){this.loginEl?.remove();let e=document.createElement("div");if(e.className="pen-login",e.setAttribute("data-pen-ui",""),this.user)e.innerHTML=`<span class="pen-title">Signed in as <span class="pen-name">${f(this.user.name??"you")}</span>${this.isAuthor?' <span class="pen-badge">author</span>':""}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`,e.querySelector('[data-act="logout"]').addEventListener("click",async()=>{await this.api.logout(),this.user=null,this.isAuthor=!1,this.renderLogin(),this.loadDoc()});else{e.innerHTML=`<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn" data-act="email">Email me a link</button></div>`;let t=async()=>{let n=e.querySelector("input"),o=n.value.trim();if(!o)return;let r=await this.api.emailLogin(o);r.link?location.href=r.link:(n.value="",n.placeholder="Check your email \u2709\uFE0F")};e.querySelector('[data-act="email"]').addEventListener("click",t),e.querySelector("input").addEventListener("keydown",n=>{n.key==="Enter"&&t()})}document.body.appendChild(e),this.loginEl=e}flashLogin(){this.loginEl?.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:380,iterations:2})}},f=s=>String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);function Y(){let s=window.PENUMBRA;if(!s?.api){console.warn("[penumbra] window.PENUMBRA.api is not set; annotator disabled.");return}let e=new T(s);window.penumbra=e,e.init().catch(t=>console.error("[penumbra] init failed",t)),document.addEventListener("nav",()=>e.reload().catch(t=>console.error("[penumbra] reload failed",t)))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Y):Y();})();
//# sourceMappingURL=penumbra.js.map
